# The Intelligent Bistro — Technical Documentation

> **Version**: 1.0.0 | **Platform**: React Native (Expo) + Node.js | **Date**: May 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Architecture](#3-architecture)
4. [Frontend — React Native / Expo](#4-frontend--react-native--expo)
5. [Backend — Node.js / Express](#5-backend--nodejs--express)
6. [AI Ordering Engine](#6-ai-ordering-engine)
7. [Data Layer](#7-data-layer)
8. [Setup & Running](#8-setup--running)
9. [Environment Variables](#9-environment-variables)
10. [Key Design Decisions](#10-key-design-decisions)

---

## 1. Project Overview

**The Intelligent Bistro** is a production-quality food ordering mobile app where users can browse a restaurant menu and manage a shopping cart through both a traditional UI and a conversational AI interface.

### What it does

- Browse 10 restaurants and 50+ menu items across 10 categories
- Add items to cart with full customization (size, crust, toppings, spice level, etc.)
- Order via natural language: *"Add two spicy chicken sandwiches and a large water"*
- AI parses intent → returns structured JSON → mutates cart state
- Full auth flow (signup / login / forgot password / JWT refresh)
- Account management: addresses, payment, favourites, notifications, promos, settings
- Floating AI bubble available on every screen for quick ordering
- Order success screen with animated confetti and order tracking

### Tech Stack Summary

| Layer | Technology |
|---|---|
| Mobile Framework | React Native 0.83 + Expo SDK 55 |
| Navigation | Expo Router v3 (file-based) |
| State Management | Zustand 5 with `useShallow` selectors |
| Animations | React Native Reanimated 4 |
| Icons | expo-symbols (SF Symbols) |
| Backend | Node.js + Express 4 |
| Database | SQLite via sql.js (persisted to `bistro.db`) |
| AI — Primary | Google Gemini 2.0 Flash (function calling) |
| AI — Fallback | OpenAI GPT-4o-mini (tool calling) |
| AI — Offline | Local mock engine (pattern matching) |
| Auth | bcryptjs + JWT (access + refresh tokens) |
| Validation | Zod |
| Security | Helmet + CORS + express-rate-limit |
| Language | TypeScript throughout |


---

## 2. Repository Structure

```
mobile-app/                          # Monorepo root
├── app/                             # Expo Router screens (file-based routing)
│   ├── _layout.tsx                  # Root layout — fonts, auth guard, AIBubble
│   ├── +html.tsx                    # Web HTML shell
│   ├── +not-found.tsx               # 404 screen
│   ├── modal.tsx                    # Generic modal route
│   ├── order-success.tsx            # Post-checkout success + confetti
│   ├── search.tsx                   # Global search screen
│   ├── (auth)/
│   │   ├── _layout.tsx              # Auth stack layout
│   │   └── login.tsx                # Login / Signup / Forgot Password
│   ├── (tabs)/
│   │   ├── _layout.tsx              # Tab bar (5 tabs + center AI button)
│   │   ├── index.tsx                # Home screen — categories + menu
│   │   ├── cart.tsx                 # Cart screen — line items + checkout
│   │   ├── ai-chat.tsx              # Full AI chat screen
│   │   ├── profile.tsx              # User profile screen
│   │   └── two.tsx                  # Orders history tab
│   ├── account/
│   │   ├── addresses.tsx            # Delivery addresses manager
│   │   ├── favourites.tsx           # Saved favourite items
│   │   ├── help.tsx                 # Help & support
│   │   ├── notifications.tsx        # Notification preferences
│   │   ├── payment.tsx              # Payment methods
│   │   ├── promos.tsx               # Promo codes
│   │   ├── settings.tsx             # App settings
│   │   └── terms.tsx                # Terms & privacy
│   ├── item/
│   │   └── [id].tsx                 # Item detail — hero + customization + add to cart
│   ├── order/
│   │   └── [id].tsx                 # Order detail / tracking
│   └── restaurants/
│       ├── index.tsx                # All restaurants list with search
│       └── [id].tsx                 # Restaurant detail — hero + menu grid
│
├── api-server/                      # Node.js Express backend
│   ├── src/
│   │   ├── server.ts                # Entry point — routes + middleware
│   │   ├── controllers/
│   │   │   ├── aiController.ts      # POST /api/ai/order
│   │   │   ├── authController.ts    # Auth routes (signup/login/refresh/etc.)
│   │   │   ├── menuController.ts    # Legacy static menu routes
│   │   │   ├── ordersController.ts  # CRUD orders
│   │   │   ├── productsController.ts# Products + categories
│   │   │   └── promoController.ts   # Promo code validation
│   │   ├── db/
│   │   │   ├── localDb.ts           # sql.js SQLite wrapper + seed
│   │   │   ├── schema.sql           # Supabase PostgreSQL schema (reference)
│   │   │   ├── seed.sql             # Seed data (reference)
│   │   │   └── supabase.ts          # Supabase client (optional cloud mode)
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts      # asyncHandler + globalErrorHandler
│   │   │   ├── security.ts          # Helmet + CORS + rate limiters
│   │   │   └── validate.ts          # Zod body validation middleware
│   │   ├── services/
│   │   │   └── aiService.ts         # LLM tool-calling engine (Gemini/OpenAI/mock)
│   │   └── data/
│   │       └── menuData.ts          # THE_BISTRO static menu (mirrors frontend)
│   ├── bistro.db                    # SQLite database file (auto-created)
│   ├── .env                         # Local secrets (not committed)
│   ├── .env.example                 # Template for env vars
│   ├── package.json
│   └── tsconfig.json
│
├── assets/                          # Static assets
│   ├── fonts/SpaceMono-Regular.ttf
│   └── images/                      # App icons, splash, food images
│
├── components/                      # Shared React Native components
│   ├── AIBubble.tsx                 # Draggable floating AI chat bubble
│   ├── BackButton.tsx               # Gray circle chevron back button
│   ├── CartLineItem.tsx             # Cart item row with thumbnail
│   ├── CategoryBadge.tsx            # Category pill with SF Symbol icon
│   └── MenuItemCard.tsx             # Food card with image + price
│
├── constants/
│   └── Theme.ts                     # Design tokens (Colors, Spacing, Radius, Typography, Shadow)
│
├── data/
│   ├── menu.ts                      # THE_BISTRO — 50 menu items, 10 categories
│   └── restaurants.ts               # 10 restaurants with menus + menuItemId mappings
│
├── hooks/
│   └── useAIChat.ts                 # Shared AI chat logic (used by chat screen + bubble)
│
├── shared/
│   └── types.ts                     # TypeScript contracts shared by frontend + backend
│
├── store/
│   ├── index.ts                     # Zustand store — auth, cart, AI, UI slices
│   └── apiClient.ts                 # HTTP client for API calls
│
├── utils/
│   ├── ai.ts                        # Client-side mock AI engine + helpers
│   ├── customization.ts             # Customization selection helpers
│   └── format.ts                    # Currency, date, string formatters
│
├── app.json                         # Expo config
├── package.json                     # Frontend dependencies
├── TECHNICAL_DOCS.md                # This file
├── AGENTS.md                        # AI agent instructions
└── CLAUDE.md                        # Claude Code instructions
```


---

## 3. Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App (Expo)                   │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │  Screens │   │Components│   │  Hooks   │   │  Utils  │ │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬────┘ │
│       │              │              │               │       │
│       └──────────────┴──────────────┴───────────────┘       │
│                              │                               │
│                    ┌─────────▼──────────┐                   │
│                    │   Zustand Store     │                   │
│                    │  auth | cart | AI   │                   │
│                    │  ui  | pricing      │                   │
│                    └─────────┬──────────┘                   │
│                              │                               │
│                    ┌─────────▼──────────┐                   │
│                    │    apiClient.ts     │                   │
│                    │  (fetch + AbortCtrl)│                   │
│                    └─────────┬──────────┘                   │
└──────────────────────────────┼──────────────────────────────┘
                               │ HTTP (localhost:3001)
┌──────────────────────────────▼──────────────────────────────┐
│                   Express API Server                         │
│                                                             │
│  Helmet │ CORS │ Rate Limit │ Zod Validation                │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   Auth   │  │ Products │  │  Orders  │  │  AI/Promo │  │
│  │Controller│  │Controller│  │Controller│  │ Controller│  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘         │
│                              │                               │
│                    ┌─────────▼──────────┐                   │
│                    │   localDb.ts        │                   │
│                    │  sql.js SQLite      │                   │
│                    │  bistro.db on disk  │                   │
│                    └────────────────────┘                   │
│                                                             │
│                    ┌────────────────────┐                   │
│                    │   aiService.ts      │                   │
│                    │  Gemini 2.0 Flash   │                   │
│                    │  → OpenAI GPT-4o   │                   │
│                    │  → Local Mock       │                   │
│                    └────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Frontend / Backend Separation

- The **frontend** is a pure React Native app. It holds all UI state in Zustand and communicates with the backend exclusively via `store/apiClient.ts`.
- The **backend** is a stateless Express API. It owns auth (JWT), order persistence (SQLite), and AI processing (LLM calls).
- **Shared types** in `shared/types.ts` are imported by both sides, ensuring the API contract never drifts.
- The frontend has a **client-side mock AI engine** (`utils/ai.ts`) that activates automatically when the server is unreachable, so the app remains functional offline.


---

## 4. Frontend — React Native / Expo

### 4.1 Expo Router v3 — File-Based Routing

Navigation is entirely file-based. The folder structure under `app/` maps directly to routes:

| File | Route | Notes |
|---|---|---|
| `app/(auth)/login.tsx` | `/login` | Auth stack, no tab bar |
| `app/(tabs)/index.tsx` | `/` | Home tab |
| `app/(tabs)/cart.tsx` | `/cart` | Cart tab |
| `app/(tabs)/ai-chat.tsx` | `/ai-chat` | AI Chat tab |
| `app/(tabs)/profile.tsx` | `/profile` | Profile tab |
| `app/item/[id].tsx` | `/item/:id` | Dynamic item detail |
| `app/restaurants/index.tsx` | `/restaurants` | All restaurants |
| `app/restaurants/[id].tsx` | `/restaurants/:id` | Restaurant detail |
| `app/order/[id].tsx` | `/order/:id` | Order tracking |
| `app/order-success.tsx` | `/order-success` | Post-checkout (fullScreenModal) |
| `app/account/*.tsx` | `/account/*` | Account sub-screens |

The root `app/_layout.tsx` handles:
- Font loading (`SpaceMono`)
- Auth guard — redirects unauthenticated users to `/login`
- Renders `<AIBubble />` globally so it appears on every screen
- Registers all stack routes with their presentation styles

### 4.2 Design System — `constants/Theme.ts`

All visual tokens are centralized. Never use raw hex values or magic numbers in components.

```typescript
Colors.brand.primary      // #F97316 — orange CTAs, active states
Colors.brand.gold         // #F59E0B — star ratings
Colors.neutral.white      // #FFFFFF
Colors.neutral.surface    // #F3F4F6 — input backgrounds
Colors.neutral.primary    // #111827 — near-black text
Colors.auth.bg            // #1A1A2E — dark navy auth screen
Colors.semantic.error     // #EF4444

Spacing.base              // 16px — standard padding
Spacing.xl                // 24px — section gaps

Radius.lg                 // 16px — cards
Radius.full               // 9999 — pills, avatars

Typography.size.md        // 17px — body text
Typography.weight.bold    // "700"

Shadow.card               // Standard card shadow (cross-platform)
Shadow.lg                 // Elevated modals
```

### 4.3 State Management — Zustand Store

The single store (`store/index.ts`) is divided into four logical slices. All selector hooks use `useShallow` to prevent infinite re-render loops.

#### Auth Slice
```typescript
useAuth() → { user, isAuthenticated, setAuth, clearAuth }
```
- `setAuth(user, accessToken)` — called after successful login/signup
- `clearAuth()` — called on logout, clears all user state
- Session is persisted to `AsyncStorage` via `store/apiClient.ts`

#### Cart Slice
```typescript
useCart() → { cart, pricing, addItem, removeItem, updateQuantity,
               clearCart, setTip, applyPromo, removePromo, applyAIResponse }
```
- `addItem(menuItemId, qty, customizations, instructions)` — looks up item from `THE_BISTRO`, computes `unitPrice`, appends `CartItem`
- `applyAIResponse(response)` — batch operation called by the AI engine; handles `CART_ADD`, `CART_REMOVE`, `CART_CLEAR`
- `pricing` is recomputed on every cart mutation using `computePricing()`:
  - Subtotal = sum of all `lineTotal`s
  - Service fee = 5% of subtotal
  - Tax = 8.75% of subtotal (SF local rate)
  - Delivery fee = from restaurant data (waived if promo covers it)
  - Total = subtotal + fees + tip − promo discount

#### AI Slice
```typescript
useAI() → { conversationHistory, isProcessing, lastAIResponse,
             addConversationTurn, setProcessing, openChat, closeChat,
             clearConversation, applyAIResponse }
```
- Conversation history is capped at 50 turns (last 50 kept)
- `isChatOpen` controls the floating bubble's expanded state

#### UI Slice
```typescript
useUI() → { activeCategoryId, isCartSheetOpen, isCustomizationSheetOpen,
             customizationItemId, setActiveCategory, ... }
```
- Controls which category tab is active on the home screen
- Manages sheet open/close state for cart and customization modals

#### Derived Selectors
```typescript
useCartItemCount()  // total quantity across all line items
```


### 4.4 Key Screens

#### Home Screen (`app/(tabs)/index.tsx`)
- "DELIVER TO" header with location
- Greeting with user's display name
- Search bar → navigates to `/search`
- Horizontal category badge scroll (10 categories, SF Symbol icons)
- "Open Restaurants" section — 3 cards, "See All" → `/restaurants`
- Menu items grid filtered by active category
- Pulls data from `data/menu.ts` (static, no API call needed for menu)

#### Cart Screen (`app/(tabs)/cart.tsx`)
- `CartLineItem` components for each line item (thumbnail, name, customizations, quantity stepper, remove)
- Tip selector: $1 / $2 / $3 / Custom
- Promo code input — validates against `POST /api/promo/validate`
- Pricing breakdown: subtotal, service fee, delivery, tax, tip, discount, **total**
- "PLACE ORDER" button positioned above tab bar using `TAB_BAR_HEIGHT + insets.bottom`
- On place order: calls `POST /api/orders`, clears cart, navigates to `/order-success`

#### AI Chat Screen (`app/(tabs)/ai-chat.tsx`)
- Full-screen chat UI with message bubbles
- `SHOW_OPTIONS` responses render interactive `MenuItemCard` grids inline
- Tapping an option card opens `CustomizeModal` for that item
- `CustomizeModal` supports both `single` (radio) and `multi` (checkbox) customization groups
- Uses `SelectionMap = Record<string, Set<string>>` for multi-select state
- "Add to Cart" from modal calls `store.addItem()` directly

#### Item Detail Screen (`app/item/[id].tsx`)
- Hero image with gradient overlay
- Sticky validation banner (shows missing required groups)
- Per-group customization selectors (radio for `single`, checkbox for `multi`)
- Special instructions text input
- Quantity stepper
- "ADD TO CART" CTA — disabled until all required groups are satisfied

#### Restaurant Detail (`app/restaurants/[id].tsx`)
- Hero image + sticky info card (rating, delivery time, fee, min order)
- Category tabs for filtering menu
- 2-column menu grid
- Tapping an item with `menuItemId` navigates to `/item/[menuItemId]` (full customization)

#### Profile Screen (`app/(tabs)/profile.tsx`)
- Root tab screen — no back button, title centered
- Avatar with edit overlay
- 4 grouped menu sections with colored icons
- Edit Profile bottom sheet with label-above-input layout
- Orange full-width SAVE button

### 4.5 Shared Components

| Component | Purpose |
|---|---|
| `AIBubble` | Draggable floating bubble, snaps to screen edges, mini chat panel slides up. Uses `transform: [translateX, translateY]` for animation. |
| `BackButton` | Gray circle with chevron-left. Used on all non-root screens. |
| `MenuItemCard` | Food card: image, name, description, price, rating, dietary tags, add button. |
| `CartLineItem` | Cart row: thumbnail, name, customization summary, quantity stepper, remove button. |
| `CategoryBadge` | Pill with SF Symbol icon and colored background. Active state uses orange border. |

### 4.6 Shared Hooks

#### `hooks/useAIChat.ts`
Shared between `ai-chat.tsx` and `AIBubble.tsx`. Handles:
- Sending messages to `POST /api/ai/order` with `AbortController`
- Falling back to `mockAIEngine` on network failure or server error
- Applying AI responses to the cart store via `applyAIResponse`
- Adding conversation turns to the store
- Executing navigation commands from `NAVIGATE` actions

```typescript
const { sendMessage, isProcessing, conversationHistory } = useAIChat({
  onResponse: () => scrollToBottom(),
  onNavigate: () => closeBubble(),
});
```

### 4.7 Shared Utilities

| File | Exports | Purpose |
|---|---|---|
| `utils/ai.ts` | `parseQty`, `showCategoryOptions`, `mockAIEngine` | Client-side AI fallback engine |
| `utils/customization.ts` | `buildSelectedCustomizations`, `validateCustomizations` | Customization selection helpers |
| `utils/format.ts` | `formatCents`, `formatDate`, `formatDeliveryTime` | Display formatting |
| `store/apiClient.ts` | `sendAIOrder`, `login`, `signup`, `placeOrder`, etc. | Typed HTTP client |


---

## 5. Backend — Node.js / Express

### 5.1 API Endpoints

#### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Server status, timestamp, DB info |

#### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create account. Body: `{ email, password, displayName }` |
| POST | `/api/auth/login` | No | Login. Body: `{ email, password }`. Returns `{ user, accessToken, refreshToken }` |
| POST | `/api/auth/logout` | Bearer | Invalidate session |
| GET | `/api/auth/me` | Bearer | Get current user profile |
| POST | `/api/auth/refresh` | No | Refresh access token. Body: `{ refreshToken }` |
| POST | `/api/auth/forgot-password` | No | Send reset email. Body: `{ email }` |
| POST | `/api/auth/reset-password` | No | Reset password. Body: `{ token, newPassword }` |

#### Products & Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/categories` | No | All menu categories |
| GET | `/api/products` | No | All products (paginated) |
| GET | `/api/products/featured` | No | Featured items |
| GET | `/api/products/popular` | No | Popular items (rating ≥ 4.7) |
| GET | `/api/products/search?q=` | No | Full-text search on name + description |
| GET | `/api/products/category/:categoryId` | No | Products in a category |
| GET | `/api/products/:id` | No | Single product with full customization groups |

#### Orders

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | Bearer | Place a new order. Body: `PlaceOrderSchema` |
| GET | `/api/orders` | Bearer | Get user's order history |
| GET | `/api/orders/:id` | Bearer | Get single order details |
| PATCH | `/api/orders/:id/status` | Bearer | Update order status |

#### AI & Promo

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ai/order` | No | Process natural language order. Body: `AIOrderRequest` |
| POST | `/api/promo/validate` | No | Validate promo code. Body: `{ code, subtotal }` |

#### Legacy Menu (backward compat)

| Method | Path | Description |
|---|---|---|
| GET | `/api/menu` | Full static menu |
| GET | `/api/menu/featured` | Featured items |
| GET | `/api/menu/popular` | Popular items |
| GET | `/api/menu/category/:categoryId` | Items by category |
| GET | `/api/menu/item/:id` | Single item |

### 5.2 Request / Response Format

All API responses follow the `ApiResponse<T>` wrapper from `shared/types.ts`:

```typescript
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

### 5.3 Authentication

- **Signup**: password hashed with `bcryptjs` (10 salt rounds), stored in `users` table
- **Login**: password compared with `bcrypt.compare`, returns signed JWT access token (15 min) + refresh token (7 days)
- **Access token**: `Authorization: Bearer <token>` header, verified with `jsonwebtoken`
- **Refresh**: `POST /api/auth/refresh` with refresh token returns new access token
- **Forgot password**: generates a reset token, stores hash in DB, returns token in response (dev mode — in production would email it)

### 5.4 Database — SQLite via sql.js

The local database uses `sql.js` — a pure JavaScript SQLite implementation with no native bindings. This means it works in any Node.js environment without compilation.

**Tables:**

| Table | Purpose |
|---|---|
| `categories` | Menu categories (id, label, icon_name, badge_color, sort_order) |
| `products` | Menu items (id, name, description, base_price, image_url, category_id, dietary_tags JSON, calories, is_available, rating, review_count, customization_groups JSON) |
| `users` | User accounts (id, email, password_hash, display_name, phone, avatar_url) |
| `orders` | Orders (id, user_id, status, items JSON, pricing JSON, delivery_address JSON, promo_code, tip_amount) |
| `order_status_history` | Status change log (order_id, status, message, created_at) |

**Persistence**: After every write operation, `persist(db)` exports the in-memory database to `bistro.db` on disk. On server start, `initDb()` loads the file back into memory.

**Query helpers** (`localDb.ts`):
```typescript
query<T>(sql, params)      // SELECT → typed array
queryOne<T>(sql, params)   // SELECT → single row or null
run(sql, params)           // INSERT/UPDATE/DELETE + auto-persist
uuid()                     // UUID v4 generator
parseJson<T>(value, fallback) // Safe JSON column parser
```

### 5.5 Security Middleware

```typescript
// Helmet — sets 11 security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmetMiddleware);

// CORS — only allows CORS_ORIGIN (default: http://localhost:8081)
app.use(corsMiddleware);

// General rate limit — 100 requests per 15 minutes per IP
app.use(generalLimiter);

// AI rate limit — 20 requests per minute per IP (on /api/ai/order only)
app.use('/api/ai/order', aiLimiter);

// Zod body validation — rejects malformed requests before they reach controllers
app.post('/api/auth/signup', validateBody(SignupSchema), asyncHandler(signup));
```

### 5.6 Error Handling

`asyncHandler` wraps every controller to catch async errors and forward them to `globalErrorHandler`:

```typescript
export const asyncHandler = (fn: RequestHandler) =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const status = err.status ?? 500;
  res.status(status).json({
    success: false,
    error: { code: err.code ?? 'INTERNAL_ERROR', message: err.message }
  });
};
```


---

## 6. AI Ordering Engine

### 6.1 Overview

The AI engine lives in `api-server/src/services/aiService.ts`. It receives a natural language utterance plus the current cart state and conversation history, then returns a structured `AIOrderResponse` JSON object that the frontend applies to the cart.

### 6.2 Provider Chain

```
AI_PROVIDER env var
       │
       ├── "gemini"  → Gemini 2.0 Flash only
       ├── "openai"  → GPT-4o-mini only
       └── "auto"    → OpenAI first → Gemini fallback → Local mock
                                          ↑                  ↑
                                    on 429/auth error   on network error
```

The client side (`utils/ai.ts`) has its own `mockAIEngine` that activates when the API server itself is unreachable.

### 6.3 Tool / Function Calling Schema

Both Gemini and OpenAI are given the same 6 tools. The LLM must call exactly one tool per response.

| Tool | When to use | Key parameters |
|---|---|---|
| `CART_ADD` | User wants to add items | `updatedCartItems[]` (menuItemId, quantity, selectedCustomizations map) |
| `CART_REMOVE` | User wants to remove items | `removeLineItemIds[]` |
| `CART_CLEAR` | User wants to start over | — |
| `NAVIGATE` | Navigate to a screen | `navigateTo` (home/cart/menu/item-detail/checkout), `navigateItemId` |
| `SHOW_OPTIONS` | User mentions a category without a specific item | `menuOptions[]` (menuItemId list), `optionCategory` |
| `CLARIFY` | Ambiguous request or info response | `requiresClarification`, `clarificationPrompt` |

All tools also require `aiNarration` — the friendly message shown to the user.

### 6.4 System Prompt

The system prompt injected into every LLM call includes:
- Restaurant name, cuisine types, delivery time, delivery fee
- **Full menu** — every item with its ID, price, rating, category, and all customization groups with option IDs and price deltas
- 12 behavioral rules (always call a tool, use exact IDs, parse word numbers, use SHOW_OPTIONS for categories, etc.)

### 6.5 Natural Language → Structured JSON Flow

```
User: "Add two spicy chicken sandwiches and a large water"
         │
         ▼
  buildSystemPrompt()  ← full menu context
         │
         ▼
  LLM (Gemini/OpenAI)
         │
         ▼
  Tool call: CART_ADD {
    updatedCartItems: [
      { menuItemId: "burger-03", quantity: 2,
        selectedCustomizations: { "spice-level": "spice-medium", "side-choice": "side-fries" } },
      { menuItemId: "drink-03", quantity: 1,
        selectedCustomizations: { "drink-size": "drink-lg" } }
    ],
    aiNarration: "Added 2× Spicy Crispy Chicken and a Large Sparkling Water! 🌶️🥤"
  }
         │
         ▼
  aiController.ts → returns AIOrderResponse
         │
         ▼
  useAIChat.ts → applyAIResponse(response)
         │
         ▼
  store.addItem() × 2 → cart updated → pricing recomputed
```

### 6.6 SHOW_OPTIONS Flow

```
User: "I want pizza"
         │
         ▼
  LLM calls SHOW_OPTIONS {
    menuOptions: [{ menuItemId: "pizza-01" }, { menuItemId: "pizza-02" }, ...],
    optionCategory: "pizza",
    aiNarration: "Here are our pizzas! 🍕 Which one would you like?"
  }
         │
         ▼
  Frontend renders MenuItemCard grid inline in chat
         │
         ▼
  User taps "Margherita Classica"
         │
         ▼
  CustomizeModal opens → user selects size + crust
         │
         ▼
  store.addItem("pizza-01", 1, [size, crust])
```

### 6.7 Quantity Parsing

Both the server and client parse natural language quantities:

```typescript
"one" | "a" | "an" → 1
"two"              → 2
"three"            → 3
... up to "ten"    → 10
"3" (digit)        → 3  // regex fallback
default            → 1
```

### 6.8 Local Mock Engine

When the LLM is unavailable, `localMockEngine` (server) / `mockAIEngine` (client) handles requests via pattern matching:

- Navigation: "my cart", "checkout", "home", "browse menu"
- Category browsing: "pizza", "burger", "sushi", "taco", "bowl", "pasta", "salad", "dessert", "drink"
- Specific items: matched by name substring (e.g. "margherita", "dragon roll", "carne asada")
- Recommendations: "recommend", "popular", "what's good"
- Greetings: "hello", "hi", "hey"


---

## 7. Data Layer

### 7.1 `shared/types.ts` — Type Contracts

This file is the single source of truth for all domain models. Both the frontend and backend import from it.

**Key types:**

```typescript
MenuItem              // id, name, basePrice (cents), imageUrl, categoryId,
                      // dietaryTags, customizationGroups[], rating, isAvailable

CustomizationGroup    // id, label, type ("single"|"multi"),
                      // minSelections, maxSelections, options[]

CustomizationOption   // id, label, priceDelta (cents), isDefault?

CartItem              // lineItemId, menuItemId, name, basePrice, quantity,
                      // selectedCustomizations[], unitPrice, lineTotal

Cart                  // restaurantId, items[], tipAmount, promoCode, promoDiscount

CartPricingBreakdown  // subtotal, serviceFee, deliveryFee, tax, tipAmount,
                      // promoDiscount, total (all in cents)

AIOrderRequest        // utterance, currentCart, restaurantId, conversationHistory[]
AIOrderResponse       // action, aiNarration, updatedCartItems?, menuOptions?, ...
AIConversationTurn    // role, content, timestamp, menuOptions?, optionCategory?

AuthUser              // id, email?, phone?, displayName, avatarUrl?
AuthResponse          // user, accessToken, refreshToken

Order                 // id, userId, restaurantId, items[], pricing, status,
                      // deliveryAddress, estimatedDeliveryTime

PromoCode             // code, type, value, minimumOrderAmount, expiresAt
```

### 7.2 `data/menu.ts` — THE_BISTRO

The main restaurant object used by both the frontend store and the backend AI service. Contains:
- 10 categories (deals, burgers, pizza, sushi, bowls, tacos, pasta, salads, desserts, drinks)
- 50 menu items with full customization groups
- Restaurant metadata (delivery fee, delivery time, minimum order)

The backend `api-server/src/data/menuData.ts` is a mirror of this file, used to build the AI system prompt and seed the SQLite database.

### 7.3 `data/restaurants.ts` — 10 Restaurants

Each restaurant has:
- `id`, `name`, `tagline`, `imageUrl`, `logoUrl`
- `cuisines[]`, `rating`, `reviewCount`
- `deliveryFee`, `deliveryTime`, `minOrder`
- `categories[]` — for the detail screen's tab filter
- `menu[]` — restaurant-specific items, each with an optional `menuItemId` field

The `menuItemId` field maps a restaurant's menu item to the main `THE_BISTRO` menu item. When a user taps an item with a `menuItemId`, the app navigates to `/item/[menuItemId]` which opens the full customization screen.

**Restaurants:**
1. The Intelligent Bistro (main) — American, Italian, Japanese, Mexican
2. Burger Republic — American, Fast Food
3. Pizza Palace — Italian, Pizza
4. Sushi Zen — Japanese, Sushi
5. Taco Fiesta — Mexican, Street Food
6. Pasta Bella — Italian, Pasta
7. Green Bowl — Healthy, Bowls, Vegan
8. The Dessert Lab — Desserts, Bakery
9. Spice Garden — Indian, Pakistani, Spicy
10. Café Noir — Coffee, Café, Brunch


---

## 8. Setup & Running

### Prerequisites

- Node.js 20+
- npm 10+
- Expo Go app on your phone (iOS or Android), or an iOS/Android simulator
- (Optional) Google Gemini API key for live AI — free tier available

### Step 1 — Clone & Install

```bash
# Install frontend dependencies
cd mobile-app
npm install

# Install backend dependencies
cd api-server
npm install
```

### Step 2 — Configure Backend Environment

```bash
cd api-server
cp .env.example .env
```

Edit `.env` and fill in your values (see [Environment Variables](#9-environment-variables) below).

At minimum, set `GEMINI_API_KEY` for live AI. The app works without it using the local mock engine.

### Step 3 — Start the API Server

```bash
cd api-server
npx tsx src/server.ts
```

> **Important**: Use `npx tsx src/server.ts` directly, NOT `npm run dev`. The `tsx watch` mode has a hot-reload glitch with `ForgotPasswordSchema` that causes a crash on file changes.

The server starts at `http://localhost:3001`. You should see:

```
🍽️  The Intelligent Bistro API
   Running on http://localhost:3001
   Environment: development
   Database: local SQLite (bistro.db)
   Health: http://localhost:3001/health
```

On first run, the database is created and seeded with all 50 products and 10 categories automatically.

### Step 4 — Start the Expo App

In a new terminal:

```bash
cd mobile-app
npx expo start
```

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan the QR code with Expo Go on your phone

### Step 5 — Verify

1. Open the app — you should see the login screen
2. Tap "Sign Up" and create an account
3. Browse the home screen — categories and menu items should load
4. Tap the AI chat tab and type "I want pizza" — you should see pizza options
5. Check `http://localhost:3001/health` in a browser to confirm the server is running

### Running Without the Server

The app works in offline mode. The client-side mock AI engine handles all ordering commands. Auth will not work (no server), but you can bypass the auth guard by modifying `app/_layout.tsx` temporarily.


---

## 9. Environment Variables

### Frontend (`mobile-app/.env` or `app.json` extra)

| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001` | Base URL for the API server. Change to your server's IP when testing on a physical device (e.g. `http://192.168.1.x:3001`) |

### Backend (`api-server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Port the Express server listens on |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `CORS_ORIGIN` | No | `http://localhost:8081` | Allowed origin for CORS. Set to your Expo dev server URL |
| `GEMINI_API_KEY` | No* | — | Google Gemini API key. Get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `OPENAI_API_KEY` | No* | — | OpenAI API key. Get one at [platform.openai.com](https://platform.openai.com/api-keys) |
| `AI_PROVIDER` | No | `auto` | `"gemini"` \| `"openai"` \| `"auto"`. `auto` tries OpenAI first, then Gemini, then local mock |
| `JWT_SECRET` | Yes | — | Secret for signing JWT access tokens. Use a long random string in production |
| `JWT_REFRESH_SECRET` | Yes | — | Secret for signing JWT refresh tokens. Must be different from `JWT_SECRET` |

*At least one AI key is recommended for live AI. The app falls back to the local mock engine if neither is set.

### Physical Device Testing

When running Expo on a physical device, the device cannot reach `localhost`. Find your machine's local IP:

```bash
# macOS
ipconfig getifaddr en0
```

Then set `EXPO_PUBLIC_API_URL=http://192.168.x.x:3001` and update `CORS_ORIGIN` in `api-server/.env` to match the Expo dev server URL shown in the terminal.


---

## 10. Key Design Decisions

### Why Zustand over Redux or Context?

Zustand has minimal boilerplate, supports `subscribeWithSelector` for fine-grained subscriptions, and the `useShallow` selector pattern prevents the infinite re-render loops that plain object selectors cause in React Native. The entire store is ~300 lines with no reducers, actions, or dispatchers.

### Why `useShallow` on every selector?

Without `useShallow`, every call to `useBistroStore(s => ({ a: s.a, b: s.b }))` creates a new object reference on every render, causing all consumers to re-render even when the values haven't changed. `useShallow` does a shallow equality check on the returned object, so components only re-render when their specific slice actually changes.

### Why sql.js instead of better-sqlite3?

`better-sqlite3` requires native compilation (node-gyp), which fails in many CI environments and on Apple Silicon without Rosetta. `sql.js` is pure JavaScript — it compiles SQLite to WebAssembly and works everywhere Node.js runs. The tradeoff is slightly higher memory usage and slower startup, which is acceptable for a development/demo server.

### Why a local mock AI engine?

The Gemini free tier has a 15 RPM quota that's easy to hit during demos. Having a deterministic local fallback means the app always works, even without an API key or internet connection. The mock engine mirrors the server-side engine exactly, so behavior is consistent.

### Why `npx tsx` instead of `npm run dev`?

`tsx watch` (the `npm run dev` script) uses file watching with hot-reload. There's a known glitch where `ForgotPasswordSchema` (a Zod schema exported from `authController.ts`) gets re-evaluated during hot-reload in a way that causes a runtime crash. Running `npx tsx src/server.ts` without watch mode avoids this entirely. For production, compile with `tsc` and run `node dist/server.js`.

### Why file-based routing (Expo Router) over React Navigation?

Expo Router v3 gives URL-based deep linking for free, makes the route structure immediately obvious from the file tree, and handles the auth guard pattern cleanly via `app/_layout.tsx`. The tradeoff is less flexibility for complex nested navigators, but the app's navigation needs are straightforward.

### Why `transform: [translateX, translateY]` for the AI bubble?

React Native's `Animated` API does not support animating `left` and `top` style properties — those are layout properties that bypass the native animation thread. Using `transform` keeps animations on the UI thread (via Reanimated), resulting in 60fps drag performance even on lower-end devices.

### Why prices in cents (integers)?

Floating-point arithmetic on currency values causes rounding errors (e.g. `$1.10 + $2.20 = $3.3000000000000003`). Storing all prices as integer cents and only converting to dollars for display eliminates this class of bug entirely.

### Why `TAB_BAR_HEIGHT + insets.bottom` for the Place Order button?

The tab bar height varies by device (standard vs. notched). Using `useSafeAreaInsets().bottom` accounts for the home indicator on iPhone X+ devices. Without this, the button would be hidden behind the tab bar on notched devices.

### Why no react-native-svg?

`react-native-svg` requires native module linking and doesn't work in Expo Go without a custom dev client. The app uses `expo-symbols` (SF Symbols on iOS, Material Symbols on Android) for all icons, which is bundled with Expo and works in Expo Go out of the box.

### Supabase Schema (schema.sql)

The `api-server/src/db/schema.sql` file contains a full PostgreSQL schema for Supabase, including Row Level Security policies and real-time subscriptions. This is the production-ready schema. The current local SQLite implementation (`localDb.ts`) mirrors this schema and can be swapped for Supabase by updating `api-server/src/db/supabase.ts` and replacing the `query`/`run` calls in controllers.

---

*Documentation generated from source code — May 2026*
