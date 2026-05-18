/**
 * api-server/src/controllers/promoController.ts
 * POST /api/promo/validate — validates a promo code from the database.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { queryOne } from "../db/localDb.js";

export const PromoValidateSchema = z.object({
  code: z.string().min(1).max(32).toUpperCase(),
  subtotalCents: z.number().int().nonnegative(),
});

interface DbPromo {
  code: string;
  type: "percentage" | "flat" | "free_delivery" | "bogo";
  value: number;
  description: string;
  minimum_order_amount: number;
  expires_at: string;
  is_active: number;
}

export function validatePromo(req: Request, res: Response): void {
  const { code, subtotalCents } = (req as Request & {
    parsed: z.infer<typeof PromoValidateSchema>;
  }).parsed;

  const promo = queryOne<DbPromo>(
    "SELECT * FROM promo_codes WHERE code = ? AND is_active = 1",
    [code]
  );

  if (!promo) {
    res.status(404).json({
      success: false,
      error: { code: "INVALID_PROMO", message: "Promo code is invalid or expired." },
    });
    return;
  }

  // Check expiry
  if (new Date(promo.expires_at) < new Date()) {
    res.status(422).json({
      success: false,
      error: { code: "PROMO_EXPIRED", message: "This promo code has expired." },
    });
    return;
  }

  // Check minimum order
  if (subtotalCents > 0 && subtotalCents < promo.minimum_order_amount) {
    res.status(422).json({
      success: false,
      error: {
        code: "MINIMUM_NOT_MET",
        message: `Minimum order of $${(promo.minimum_order_amount / 100).toFixed(2)} required for this promo.`,
      },
    });
    return;
  }

  // Compute discount
  let discountCents = 0;
  if (promo.type === "percentage") {
    discountCents = Math.round(subtotalCents * (promo.value / 100));
  } else if (promo.type === "flat") {
    discountCents = Math.min(promo.value, subtotalCents);
  } else if (promo.type === "free_delivery") {
    discountCents = 0; // handled on frontend by waiving delivery fee
  }

  res.json({
    success: true,
    data: {
      code: promo.code,
      type: promo.type,
      value: promo.value,
      description: promo.description,
      expiresAt: promo.expires_at,
      discountCents,
    },
  });
}
