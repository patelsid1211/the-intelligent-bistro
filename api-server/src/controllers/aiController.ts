/**
 * api-server/src/controllers/aiController.ts
 * POST /api/ai/order — processes a natural language ordering utterance.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import type { AIOrderRequest } from "../../../shared/types.js";
import { processAIOrder } from "../services/aiService.js";

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST SCHEMA (Zod)
// ─────────────────────────────────────────────────────────────────────────────

const SelectedCustomizationSchema = z.object({
  groupId: z.string(),
  groupLabel: z.string(),
  optionId: z.string(),
  optionLabel: z.string(),
  priceDelta: z.number().int().nonnegative(),
});

const CartItemSchema = z.object({
  lineItemId: z.string(),
  menuItemId: z.string(),
  name: z.string(),
  basePrice: z.number().int().positive(),
  quantity: z.number().int().positive(),
  selectedCustomizations: z.array(SelectedCustomizationSchema),
  unitPrice: z.number().int().positive(),
  lineTotal: z.number().int().nonnegative(),
  specialInstructions: z.string().optional(),
});

const CartSchema = z.object({
  restaurantId: z.string(),
  items: z.array(CartItemSchema),
  tipAmount: z.number().int().nonnegative(),
  promoCode: z.string().optional(),
  promoDiscount: z.number().int().nonnegative(),
});

const ConversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
  timestamp: z.number(),
});

export const AIOrderRequestSchema = z.object({
  utterance: z
    .string()
    .min(1, "Utterance cannot be empty.")
    .max(500, "Utterance too long."),
  currentCart: CartSchema,
  restaurantId: z.string(),
  conversationHistory: z
    .array(ConversationTurnSchema)
    .max(50, "Conversation history too long."),
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export async function handleAIOrder(req: Request, res: Response): Promise<void> {
  const parsed = req as Request & { parsed: AIOrderRequest };
  const response = await processAIOrder(parsed.parsed);
  res.json({ success: true, data: response });
}
