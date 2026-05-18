/**
 * api-server/src/server.ts
 * The Intelligent Bistro — Express API server.
 *
 * Routes:
 *   GET  /health
 *
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   POST /api/auth/refresh
 *
 *   GET  /api/categories
 *   GET  /api/products
 *   GET  /api/products/featured
 *   GET  /api/products/popular
 *   GET  /api/products/search?q=
 *   GET  /api/products/category/:categoryId
 *   GET  /api/products/:id
 *
 *   POST /api/orders
 *   GET  /api/orders
 *   GET  /api/orders/:id
 *   PATCH /api/orders/:id/status
 *
 *   POST /api/ai/order
 *   POST /api/promo/validate
 *
 *   (Legacy static menu — kept for backward compat)
 *   GET  /api/menu
 *   GET  /api/menu/item/:id
 */

import "dotenv/config";
import express from "express";
import { initDb } from "./db/localDb.js";
import { asyncHandler, globalErrorHandler } from "./middleware/errorHandler.js";
import {
    aiLimiter,
    corsMiddleware,
    generalLimiter,
    helmetMiddleware,
} from "./middleware/security.js";
import { validateBody } from "./middleware/validate.js";

// Auth
import {
    addAddress,
    addFavourite,
    AddressSchema,
    deleteAddress,
    forgotPassword, ForgotPasswordSchema,
    getAddresses,
    getFavourites,
    getMe,
    getNotificationPrefs,
    login, LoginSchema,
    logout,
    NotificationPrefsSchema,
    RefreshSchema,
    refreshToken,
    removeFavourite,
    resetPassword, ResetPasswordSchema,
    signup, SignupSchema,
    updateNotificationPrefs,
    updateProfile, UpdateProfileSchema,
} from "./controllers/authController.js";

// Products
import {
    getAllCategories,
    getAllProducts,
    getFeaturedProducts,
    getPopularProducts,
    getProductById,
    getProductsByCategory,
    searchProducts,
} from "./controllers/productsController.js";

// Orders
import {
    getOrderById,
    getOrders,
    placeOrder, PlaceOrderSchema,
    updateOrderStatus, UpdateStatusSchema,
} from "./controllers/ordersController.js";

// AI + Promo
import { AIOrderRequestSchema, handleAIOrder } from "./controllers/aiController.js";
import { PromoValidateSchema, validatePromo } from "./controllers/promoController.js";

// Legacy static menu (backward compat)
import {
    getFeatured,
    getMenu,
    getMenuByCategory,
    getMenuItem,
    getPopular,
} from "./controllers/menuController.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: "512kb" }));
app.use(generalLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? "development",
    database: "local SQLite",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/auth/signup",          validateBody(SignupSchema),          asyncHandler(signup));
app.post("/api/auth/login",           validateBody(LoginSchema),           asyncHandler(login));
app.post("/api/auth/logout",          asyncHandler(logout));
app.get( "/api/auth/me",              asyncHandler(getMe));
app.post("/api/auth/refresh",         validateBody(RefreshSchema),         asyncHandler(refreshToken));
app.post("/api/auth/forgot-password", validateBody(ForgotPasswordSchema),  asyncHandler(forgotPassword));
app.post("/api/auth/reset-password",  validateBody(ResetPasswordSchema),   asyncHandler(resetPassword));
app.patch("/api/auth/profile",        validateBody(UpdateProfileSchema),   asyncHandler(updateProfile));

// Addresses
app.get(   "/api/user/addresses",     asyncHandler(getAddresses));
app.post(  "/api/user/addresses",     validateBody(AddressSchema), asyncHandler(addAddress));
app.delete("/api/user/addresses/:id", asyncHandler(deleteAddress));

// Favourites
app.get(   "/api/user/favourites",              asyncHandler(getFavourites));
app.post(  "/api/user/favourites",              asyncHandler(addFavourite));
app.delete("/api/user/favourites/:menuItemId",  asyncHandler(removeFavourite));

// Notification preferences
app.get(  "/api/user/notifications", asyncHandler(getNotificationPrefs));
app.patch("/api/user/notifications", validateBody(NotificationPrefsSchema), asyncHandler(updateNotificationPrefs));

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT / CATEGORY ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/categories",                    asyncHandler(getAllCategories));
app.get("/api/products",                      asyncHandler(getAllProducts));
app.get("/api/products/featured",             asyncHandler(getFeaturedProducts));
app.get("/api/products/popular",              asyncHandler(getPopularProducts));
app.get("/api/products/search",               asyncHandler(searchProducts));
app.get("/api/products/category/:categoryId", asyncHandler(getProductsByCategory));
app.get("/api/products/:id",                  asyncHandler(getProductById));

// ─────────────────────────────────────────────────────────────────────────────
// ORDER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/orders",              validateBody(PlaceOrderSchema),  asyncHandler(placeOrder));
app.get( "/api/orders",              asyncHandler(getOrders));
app.get( "/api/orders/:id",          asyncHandler(getOrderById));
app.patch("/api/orders/:id/status",  validateBody(UpdateStatusSchema), asyncHandler(updateOrderStatus));

// ─────────────────────────────────────────────────────────────────────────────
// AI + PROMO ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.post("/api/ai/order",        aiLimiter, validateBody(AIOrderRequestSchema), asyncHandler(handleAIOrder));
app.post("/api/promo/validate",  validateBody(PromoValidateSchema), validatePromo);

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY STATIC MENU (backward compat — will be removed once mobile migrates)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/menu",                      getMenu);
app.get("/api/menu/featured",             getFeatured);
app.get("/api/menu/popular",              getPopular);
app.get("/api/menu/category/:categoryId", getMenuByCategory);
app.get("/api/menu/item/:id",             getMenuItem);

// ─────────────────────────────────────────────────────────────────────────────
// 404 + ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found." } });
});

app.use(globalErrorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────

// Init local DB first, then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🍽️  The Intelligent Bistro API`);
    console.log(`   Running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
    console.log(`   Database: local SQLite (bistro.db)`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
}).catch((err) => {
  console.error("[FATAL] Failed to initialise database:", err);
  process.exit(1);
});

export default app;
