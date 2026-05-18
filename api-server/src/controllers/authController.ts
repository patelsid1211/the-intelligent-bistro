/**
 * api-server/src/controllers/authController.ts
 * Local auth using SQLite + bcrypt + JWT.
 * Swap for Supabase later by replacing this file only.
 */

import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query, queryOne, run, uuid } from "../db/localDb.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "bistro-local-dev-secret-change-in-prod";
const JWT_EXPIRES = "7d";
const REFRESH_EXPIRES = "30d";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const SignupSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().min(2).max(50),
  phone: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  phone: string | null;
}

function makeTokens(userId: string, email: string) {
  const accessToken = jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refreshToken = jwt.sign({ sub: userId, type: "refresh" }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): { sub: string; email?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; email?: string };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

export async function signup(req: Request, res: Response): Promise<void> {
  const { email, password, displayName, phone } = (req as Request & {
    parsed: z.infer<typeof SignupSchema>;
  }).parsed;

  const existing = queryOne<DbUser>("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    res.status(409).json({ success: false, error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." } });
    return;
  }

  // Also check phone uniqueness if provided
  if (phone) {
    const existingPhone = queryOne<{ id: string }>("SELECT id FROM users WHERE phone = ?", [phone]);
    if (existingPhone) {
      res.status(409).json({ success: false, error: { code: "PHONE_TAKEN", message: "An account with this phone number already exists." } });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuid();

  run(
    "INSERT INTO users (id, email, password_hash, display_name, phone) VALUES (?,?,?,?,?)",
    [id, email, passwordHash, displayName, phone ?? null]
  );

  const { accessToken, refreshToken } = makeTokens(id, email);

  res.status(201).json({
    success: true,
    data: {
      user: { id, email, displayName, phone },
      accessToken,
      refreshToken,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = (req as Request & {
    parsed: z.infer<typeof LoginSchema>;
  }).parsed;

  // Accept either email or phone number as the identifier
  const isPhone = !email.includes("@");
  const user = isPhone
    ? queryOne<DbUser>(
        "SELECT id, email, password_hash, display_name, phone FROM users WHERE phone = ?",
        [email] // "email" field holds the phone number when logging in by phone
      )
    : queryOne<DbUser>(
        "SELECT id, email, password_hash, display_name, phone FROM users WHERE email = ?",
        [email]
      );

  if (!user) {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } });
    return;
  }

  const { accessToken, refreshToken } = makeTokens(user.id, user.email);

  res.json({
    success: true,
    data: {
      user: { id: user.id, email: user.email, displayName: user.display_name, phone: user.phone },
      accessToken,
      refreshToken,
    },
  });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // JWT is stateless — client just discards the token
  res.json({ success: true, data: { message: "Signed out successfully." } });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token provided." } });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Token is invalid or expired." } });
    return;
  }

  const user = queryOne<DbUser>(
    "SELECT id, email, display_name, phone FROM users WHERE id = ?",
    [payload.sub]
  );

  if (!user) {
    res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found." } });
    return;
  }

  res.json({
    success: true,
    data: { id: user.id, email: user.email, displayName: user.display_name, phone: user.phone },
  });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken: token } = (req as Request & {
    parsed: z.infer<typeof RefreshSchema>;
  }).parsed;

  const payload = verifyToken(token);
  if (!payload || (payload as { type?: string }).type !== "refresh") {
    res.status(401).json({ success: false, error: { code: "REFRESH_FAILED", message: "Invalid refresh token." } });
    return;
  }

  const user = queryOne<DbUser>("SELECT id, email FROM users WHERE id = ?", [payload.sub]);
  if (!user) {
    res.status(401).json({ success: false, error: { code: "REFRESH_FAILED", message: "User not found." } });
    return;
  }

  const tokens = makeTokens(user.id, user.email);
  res.json({ success: true, data: tokens });
}

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = (req as Request & { parsed: z.infer<typeof ForgotPasswordSchema> }).parsed;

  const isPhone = !email.includes("@");
  const user = isPhone
    ? queryOne<{ id: string }>("SELECT id FROM users WHERE phone = ?", [email])
    : queryOne<{ id: string }>("SELECT id FROM users WHERE email = ?", [email]);

  // Always return success — don't reveal whether email exists (security best practice)
  if (user) {
    // In production: send a real reset email via SendGrid / Resend / etc.
    // For local dev: log the reset token to the console.
    const resetToken = Math.random().toString(36).slice(2, 10).toUpperCase();
    console.log(`\n[PASSWORD RESET] Email: ${email}`);
    console.log(`[PASSWORD RESET] Token: ${resetToken}`);
    console.log(`[PASSWORD RESET] Use POST /api/auth/reset-password with this token\n`);

    // Store token with 1-hour expiry (in-memory for local dev)
    resetTokens.set(resetToken, { userId: user.id, expiresAt: Date.now() + 3_600_000 });
  }

  res.json({
    success: true,
    data: { message: "If an account exists for this email, a reset link has been sent." },
  });
}

// In-memory reset token store (replace with DB column in production)
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, newPassword } = (req as Request & { parsed: z.infer<typeof ResetPasswordSchema> }).parsed;

  const entry = resetTokens.get(token.toUpperCase());
  if (!entry || entry.expiresAt < Date.now()) {
    res.status(400).json({ success: false, error: { code: "INVALID_TOKEN", message: "Reset token is invalid or expired." } });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, entry.userId]);
  resetTokens.delete(token.toUpperCase());

  res.json({ success: true, data: { message: "Password reset successfully. You can now sign in." } });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE UPDATE
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Token invalid." } }); return; }

  const { displayName, phone, avatarUrl } = (req as Request & { parsed: z.infer<typeof UpdateProfileSchema> }).parsed;

  if (displayName) run("UPDATE users SET display_name = ? WHERE id = ?", [displayName, payload.sub]);
  if (phone !== undefined) run("UPDATE users SET phone = ? WHERE id = ?", [phone ?? null, payload.sub]);
  if (avatarUrl !== undefined) run("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl ?? null, payload.sub]);

  const user = queryOne<DbUser>("SELECT id, email, display_name, phone, avatar_url FROM users WHERE id = ?", [payload.sub]);
  res.json({ success: true, data: { id: user!.id, email: user!.email, displayName: user!.display_name, phone: user!.phone, avatarUrl: (user as any).avatar_url } });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDRESSES
// ─────────────────────────────────────────────────────────────────────────────

export const AddressSchema = z.object({
  label: z.string().default("Home"),
  street: z.string().min(1),
  apt: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  instructions: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export function getAddresses(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }

  const rows = query("SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC", [payload.sub]);
  res.json({ success: true, data: rows });
}

export function addAddress(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }

  const body = (req as Request & { parsed: z.infer<typeof AddressSchema> }).parsed;
  const id = uuid();

  if (body.isDefault) {
    run("UPDATE user_addresses SET is_default = 0 WHERE user_id = ?", [payload.sub]);
  }

  run(
    "INSERT INTO user_addresses (id,user_id,label,street,apt,city,state,zip,instructions,is_default) VALUES (?,?,?,?,?,?,?,?,?,?)",
    [id, payload.sub, body.label, body.street, body.apt ?? null, body.city, body.state, body.zip, body.instructions ?? null, body.isDefault ? 1 : 0]
  );

  const address = queryOne("SELECT * FROM user_addresses WHERE id = ?", [id]);
  res.status(201).json({ success: true, data: address });
}

export function deleteAddress(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }

  run("DELETE FROM user_addresses WHERE id = ? AND user_id = ?", [String(req.params.id), payload.sub]);
  res.json({ success: true, data: { message: "Address deleted." } });
}

// ─────────────────────────────────────────────────────────────────────────────
// FAVOURITES
// ─────────────────────────────────────────────────────────────────────────────

export function getFavourites(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }

  const rows = query("SELECT menu_item_id FROM user_favourites WHERE user_id = ? ORDER BY created_at DESC", [payload.sub]);
  res.json({ success: true, data: rows.map((r: any) => r.menu_item_id) });
}

export function addFavourite(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }

  const { menuItemId } = req.body as { menuItemId: string };
  if (!menuItemId) { res.status(400).json({ success: false, error: { code: "MISSING_FIELD", message: "menuItemId required." } }); return; }

  run("INSERT OR IGNORE INTO user_favourites (id,user_id,menu_item_id) VALUES (?,?,?)", [uuid(), payload.sub, menuItemId]);
  res.json({ success: true, data: { menuItemId } });
}

export function removeFavourite(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }

  run("DELETE FROM user_favourites WHERE user_id = ? AND menu_item_id = ?", [payload.sub, String(req.params.menuItemId)]);
  res.json({ success: true, data: { message: "Removed from favourites." } });
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationPrefsSchema = z.object({
  orderUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
  newItems: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

export function getNotificationPrefs(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }

  let prefs = queryOne<any>("SELECT * FROM user_notifications WHERE user_id = ?", [payload.sub]);
  if (!prefs) {
    run("INSERT OR IGNORE INTO user_notifications (user_id) VALUES (?)", [payload.sub]);
    prefs = queryOne<any>("SELECT * FROM user_notifications WHERE user_id = ?", [payload.sub]);
  }
  res.json({ success: true, data: {
    orderUpdates: prefs.order_updates === 1,
    promotions: prefs.promotions === 1,
    newItems: prefs.new_items === 1,
    emailNotifications: prefs.email_notifications === 1,
    pushNotifications: prefs.push_notifications === 1,
  }});
}

export function updateNotificationPrefs(req: Request, res: Response): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const payload = token ? verifyToken(token) : null;
  if (!payload) { res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "No token." } }); return; }

  const body = (req as Request & { parsed: z.infer<typeof NotificationPrefsSchema> }).parsed;

  run("INSERT OR IGNORE INTO user_notifications (user_id) VALUES (?)", [payload.sub]);

  if (body.orderUpdates !== undefined) run("UPDATE user_notifications SET order_updates = ? WHERE user_id = ?", [body.orderUpdates ? 1 : 0, payload.sub]);
  if (body.promotions !== undefined) run("UPDATE user_notifications SET promotions = ? WHERE user_id = ?", [body.promotions ? 1 : 0, payload.sub]);
  if (body.newItems !== undefined) run("UPDATE user_notifications SET new_items = ? WHERE user_id = ?", [body.newItems ? 1 : 0, payload.sub]);
  if (body.emailNotifications !== undefined) run("UPDATE user_notifications SET email_notifications = ? WHERE user_id = ?", [body.emailNotifications ? 1 : 0, payload.sub]);
  if (body.pushNotifications !== undefined) run("UPDATE user_notifications SET push_notifications = ? WHERE user_id = ?", [body.pushNotifications ? 1 : 0, payload.sub]);

  run("UPDATE user_notifications SET updated_at = datetime('now') WHERE user_id = ?", [payload.sub]);

  getNotificationPrefs(req, res);
}
