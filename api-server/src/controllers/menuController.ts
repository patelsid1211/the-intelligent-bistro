/**
 * api-server/src/controllers/menuController.ts
 * GET /api/menu — returns the full restaurant + menu data.
 * GET /api/menu/item/:id — returns a single menu item.
 */

import type { Request, Response } from "express";
import type { ApiResponse } from "../../../shared/types.js";
import {
    MENU_ITEM_MAP,
    THE_BISTRO,
    getFeaturedItems,
    getItemsByCategory,
    getPopularItems,
} from "../data/menuData.js";

export function getMenu(req: Request, res: Response): void {
  res.json({
    success: true,
    data: THE_BISTRO,
  } satisfies ApiResponse<typeof THE_BISTRO>);
}

export function getMenuItem(req: Request, res: Response): void {
  const { id } = req.params;
  const item = MENU_ITEM_MAP.get(id);

  if (!item) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: `Menu item '${id}' not found.` },
    });
    return;
  }

  res.json({ success: true, data: item });
}

export function getMenuByCategory(req: Request, res: Response): void {
  const { categoryId } = req.params;
  const items = getItemsByCategory(categoryId);
  res.json({ success: true, data: items });
}

export function getFeatured(req: Request, res: Response): void {
  res.json({ success: true, data: getFeaturedItems() });
}

export function getPopular(req: Request, res: Response): void {
  res.json({ success: true, data: getPopularItems() });
}
