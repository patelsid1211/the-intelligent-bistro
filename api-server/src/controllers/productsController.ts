/**
 * api-server/src/controllers/productsController.ts
 * Products + categories from local SQLite.
 */

import type { Request, Response } from "express";
import { parseJson, query, queryOne } from "../db/localDb.js";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

interface DbProduct {
  id: string; name: string; description: string; base_price: number;
  image_url: string; category_id: string; dietary_tags: string;
  calories: number | null; is_available: number; rating: number;
  review_count: number; customization_groups: string;
}

function formatProduct(row: DbProduct) {
  return {
    ...row,
    basePrice: row.base_price,
    imageUrl: row.image_url,
    categoryId: row.category_id,
    dietaryTags: parseJson<string[]>(row.dietary_tags, []),
    isAvailable: row.is_available === 1,
    reviewCount: row.review_count,
    customizationGroups: parseJson<object[]>(row.customization_groups, []),
  };
}

function pageParams(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  return { page, limit, offset: (page - 1) * limit };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

export function getAllProducts(req: Request, res: Response): void {
  const { page, limit, offset } = pageParams(req);
  const rows = query<DbProduct>(
    "SELECT * FROM products WHERE is_available=1 ORDER BY rating DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  const [{ total }] = query<{ total: number }>("SELECT COUNT(*) as total FROM products WHERE is_available=1");
  res.json({ success: true, data: { products: rows.map(formatProduct), total, page, limit, totalPages: Math.ceil(total / limit) } });
}

export function getProductById(req: Request, res: Response): void {
  const row = queryOne<DbProduct>("SELECT * FROM products WHERE id=?", [req.params.id]);
  if (!row) { res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Product not found." } }); return; }
  res.json({ success: true, data: formatProduct(row) });
}

export function getProductsByCategory(req: Request, res: Response): void {
  const { page, limit, offset } = pageParams(req);
  const rows = query<DbProduct>(
    "SELECT * FROM products WHERE category_id=? AND is_available=1 ORDER BY rating DESC LIMIT ? OFFSET ?",
    [req.params.categoryId, limit, offset]
  );
  const [{ total }] = query<{ total: number }>(
    "SELECT COUNT(*) as total FROM products WHERE category_id=? AND is_available=1",
    [req.params.categoryId]
  );
  res.json({ success: true, data: { products: rows.map(formatProduct), total, page, limit } });
}

export function getFeaturedProducts(_req: Request, res: Response): void {
  const rows = query<DbProduct>(
    "SELECT * FROM products WHERE dietary_tags LIKE '%featured%' AND is_available=1 ORDER BY review_count DESC LIMIT 10"
  );
  res.json({ success: true, data: rows.map(formatProduct) });
}

export function getPopularProducts(_req: Request, res: Response): void {
  const rows = query<DbProduct>(
    "SELECT * FROM products WHERE dietary_tags LIKE '%popular%' AND is_available=1 ORDER BY rating DESC LIMIT 10"
  );
  res.json({ success: true, data: rows.map(formatProduct) });
}

export function searchProducts(req: Request, res: Response): void {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    res.status(400).json({ success: false, error: { code: "INVALID_QUERY", message: "Query must be at least 2 characters." } });
    return;
  }
  const like = `%${q}%`;
  const rows = query<DbProduct>(
    `SELECT * FROM products WHERE is_available=1
     AND (name LIKE ? OR description LIKE ? OR dietary_tags LIKE ? OR category_id LIKE ?)
     ORDER BY rating DESC LIMIT 20`,
    [like, like, like, like]
  );
  res.json({ success: true, data: { results: rows.map(formatProduct), query: q, total: rows.length } });
}

export function getAllCategories(_req: Request, res: Response): void {
  const rows = query("SELECT * FROM categories ORDER BY sort_order");
  res.json({ success: true, data: rows });
}
