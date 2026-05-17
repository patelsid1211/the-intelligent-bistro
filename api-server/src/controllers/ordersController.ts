/**
 * api-server/src/controllers/ordersController.ts
 * Orders backed by local SQLite with real-time status simulation.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { parseJson, query, queryOne, run, uuid } from "../db/localDb.js";
import { verifyToken } from "./authController.js";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const CartItemSchema = z.object({
  lineItemId: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  basePrice: z.number().int().positive(),
  quantity: z.number().int().positive(),
  selectedCustomizations: z.array(z.object({
    groupId: z.string(), groupLabel: z.string(),
    optionId: z.string(), optionLabel: z.string(),
    priceDelta: z.number().int(),
  })),
  unitPrice: z.number().int().positive(),
  lineTotal: z.number().int().nonnegative(),
  specialInstructions: z.string().optional(),
});

const PricingSchema = z.object({
  subtotal: z.number().int().nonnegative(),
  serviceFee: z.number().int().nonnegative(),
  deliveryFee: z.number().int().nonnegative(),
  tax: z.number().int().nonnegative(),
  tipAmount: z.number().int().nonnegative(),
  promoDiscount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const PlaceOrderSchema = z.object({
  items: z.array(CartItemSchema).min(1),
  pricing: PricingSchema,
  deliveryAddress: z.object({
    street: z.string().min(1), apt: z.string().optional(),
    city: z.string().min(1), state: z.string().min(1),
    zip: z.string().min(1), instructions: z.string().optional(),
  }).optional(),
  promoCode: z.string().optional(),
  tipAmount: z.number().int().nonnegative().default(0),
  specialInstructions: z.string().optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.enum(["pending","confirmed","preparing","ready_for_pickup","out_for_delivery","delivered","cancelled"]),
  message: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<string, string> = {
  pending:          "Your order has been received.",
  confirmed:        "The restaurant confirmed your order.",
  preparing:        "The kitchen is preparing your food.",
  ready_for_pickup: "Your order is packed and waiting for a driver.",
  out_for_delivery: "Your driver is on the way!",
  delivered:        "Your order has been delivered. Enjoy!",
  cancelled:        "Your order has been cancelled.",
};

interface DbOrder {
  id: string; user_id: string; status: string;
  items: string; pricing: string; delivery_address: string | null;
  estimated_delivery: string | null; promo_code: string | null;
  tip_amount: number; special_instructions: string | null;
  created_at: string; updated_at: string;
}

function formatOrder(row: DbOrder) {
  return {
    ...row,
    items: parseJson(row.items, []),
    pricing: parseJson(row.pricing, {}),
    deliveryAddress: row.delivery_address ? parseJson(row.delivery_address, null) : null,
  };
}

function getUserId(req: Request): string | null {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.sub ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

export async function placeOrder(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } }); return; }

  const body = (req as Request & { parsed: z.infer<typeof PlaceOrderSchema> }).parsed;
  const id = uuid();
  const estimatedDelivery = new Date(Date.now() + (15 + Math.floor(Math.random() * 10)) * 60_000).toISOString();

  run(
    `INSERT INTO orders (id,user_id,status,items,pricing,delivery_address,estimated_delivery,promo_code,tip_amount,special_instructions)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      id, userId, "pending",
      JSON.stringify(body.items),
      JSON.stringify(body.pricing),
      body.deliveryAddress ? JSON.stringify(body.deliveryAddress) : null,
      estimatedDelivery,
      body.promoCode ?? null,
      body.tipAmount,
      body.specialInstructions ?? null,
    ]
  );

  // Initial status history
  run(
    "INSERT INTO order_status_history (id,order_id,status,message) VALUES (?,?,?,?)",
    [uuid(), id, "pending", STATUS_MESSAGES.pending]
  );

  // Simulate progression in dev
  if (process.env.NODE_ENV !== "production") {
    simulateProgression(id);
  }

  const order = queryOne<DbOrder>("SELECT * FROM orders WHERE id=?", [id]);
  res.status(201).json({ success: true, data: formatOrder(order!) });
}

export function getOrders(req: Request, res: Response): void {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } }); return; }

  const rows = query<DbOrder>(
    "SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
    [userId]
  );
  res.json({ success: true, data: rows.map(formatOrder) });
}

export function getOrderById(req: Request, res: Response): void {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } }); return; }

  const order = queryOne<DbOrder>("SELECT * FROM orders WHERE id=? AND user_id=?", [req.params.id, userId]);
  if (!order) { res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Order not found." } }); return; }

  const history = query("SELECT * FROM order_status_history WHERE order_id=? ORDER BY created_at ASC", [req.params.id]);
  res.json({ success: true, data: { ...formatOrder(order), statusHistory: history } });
}

export function updateOrderStatus(req: Request, res: Response): void {
  const { status, message } = (req as Request & { parsed: z.infer<typeof UpdateStatusSchema> }).parsed;
  const { id } = req.params;

  run("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?", [status, id]);
  run(
    "INSERT INTO order_status_history (id,order_id,status,message) VALUES (?,?,?,?)",
    [uuid(), id, status, message ?? STATUS_MESSAGES[status] ?? status]
  );

  const order = queryOne<DbOrder>("SELECT * FROM orders WHERE id=?", [id]);
  if (!order) { res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Order not found." } }); return; }
  res.json({ success: true, data: formatOrder(order) });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────

const SEQUENCE = ["confirmed","preparing","ready_for_pickup","out_for_delivery","delivered"] as const;

function simulateProgression(orderId: string): void {
  let step = 0;
  const advance = () => {
    if (step >= SEQUENCE.length) return;
    const status = SEQUENCE[step++];
    run("UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?", [status, orderId]);
    run("INSERT INTO order_status_history (id,order_id,status,message) VALUES (?,?,?,?)",
      [uuid(), orderId, status, STATUS_MESSAGES[status]]);
    console.log(`[Order ${orderId.slice(0,8)}] → ${status}`);
    if (step < SEQUENCE.length) setTimeout(advance, (20 + Math.floor(Math.random() * 20)) * 1000);
  };
  setTimeout(advance, 5000);
}
