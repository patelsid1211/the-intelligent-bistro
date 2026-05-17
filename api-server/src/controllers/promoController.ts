/**
 * api-server/src/controllers/promoController.ts
 * POST /api/promo/validate — validates a promo code against the current subtotal.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { computePromoDiscount, validatePromoCode } from "../data/menuData.js";

export const PromoValidateSchema = z.object({
  code: z.string().min(1).max(32).toUpperCase(),
  subtotalCents: z.number().int().nonnegative(),
});

export function validatePromo(req: Request, res: Response): void {
  const { code, subtotalCents } = (req as Request & {
    parsed: z.infer<typeof PromoValidateSchema>;
  }).parsed;

  const promo = validatePromoCode(code);

  if (!promo) {
    res.status(404).json({
      success: false,
      error: { code: "INVALID_PROMO", message: "Promo code is invalid or expired." },
    });
    return;
  }

  if (subtotalCents < promo.minimumOrderAmount) {
    res.status(422).json({
      success: false,
      error: {
        code: "MINIMUM_NOT_MET",
        message: `Minimum order of $${(promo.minimumOrderAmount / 100).toFixed(2)} required for this promo.`,
      },
    });
    return;
  }

  const discountCents = computePromoDiscount(promo, subtotalCents);

  res.json({
    success: true,
    data: {
      promo,
      discountCents,
    },
  });
}
