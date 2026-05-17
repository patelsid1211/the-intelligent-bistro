/**
 * api-server/src/controllers/authController.ts
 * Local auth using SQLite + bcrypt + JWT.
 * Swap for Supabase later by replacing this file only.
 */

import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { queryOne, run, uuid } from "../db/localDb.js";

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
