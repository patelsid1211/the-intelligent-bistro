# 🍽️ The Intelligent Bistro

> An AI-powered food ordering mobile app where you order by having a conversation.

**"Add two spicy chicken sandwiches, a dragon roll, and a large matcha latte"** → cart updated instantly.

---

## Demo

| Home & Menu | AI Ordering | Cart & Checkout |
|---|---|---|
| Browse 50+ items across 10 categories | Natural language → structured cart actions | Full pricing breakdown, promo codes, order flow |

> 📹 **[Watch the 5-minute Loom walkthrough](https://www.loom.com/share/d875d4cfab27429fada50e1997b5c415)**

---

## What It Does

- 🤖 **Conversational AI ordering** — type naturally, the AI parses intent and updates your cart
- 🍕 **50+ menu items** across 10 categories (burgers, pizza, sushi, tacos, pasta, bowls, and more)
- 🏪 **10 restaurants** with individual menus and detail pages
- 🛒 **Full cart** — customizations, quantity, tip selector, promo codes, order placement
- 💬 **Floating AI bubble** — available on every screen, no need to switch tabs
- 👤 **Auth** — signup, login, JWT refresh, forgot password
- 📱 **Account management** — addresses, payment, favourites, notifications, settings

---

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | React Native 0.83 + Expo SDK 55 |
| Navigation | Expo Router v3 (file-based) |
| State | Zustand 5 with `useShallow` selectors |
| Animations | React Native Reanimated 4 |
| Icons | expo-symbols (SF Symbols) |
| Language | TypeScript |

### Backend
| | |
|---|---|
| Server | Node.js + Express 4 |
| Database | SQLite via sql.js (no native deps) |
| Auth | bcryptjs + JWT (access + refresh tokens) |
| Validation | Zod |
| Security | Helmet + CORS + express-rate-limit |

### AI Engine
| Priority | Provider | Trigger |
|---|---|---|
| 1st | Google Gemini 2.0 Flash | Default |
| 2nd | OpenAI GPT-4o-mini | Gemini quota hit |
| 3rd | Local mock engine | Server unreachable |

The app **always works** — even with no API key, the built-in offline engine handles all ordering commands.

---

## AI Ordering Examples

```
"I want pizza"                              → shows all 5 pizzas as cards
"Add two dragon rolls"                      → adds 2× Dragon Roll to cart
"Show me burgers"                           → browse all burger options
"Add a spicy crispy chicken, extra hot"     → adds with correct spice level
"Add two spicy chicken sandwiches and a large water" → multi-item order
"What's popular?"                           → top-rated recommendations
"Clear my cart"                             → cart cleared
"show order summary"                        → inline order summary + Place Order button
"place order" / "confirm order"             → same as above
"show my cart" / "checkout"                 → inline order summary
```

After adding any item, **suggestion chips** appear:
- Category-specific add-ons (e.g. 🍟 Add Fries, 🥤 Add Drink, 🍰 Dessert)
- 🛒 Order Summary — shows inline cart with "Place Order 🚀" button

The AI uses **LLM function/tool calling** — it returns structured JSON, not free text:

```json
{
  "action": "CART_ADD",
  "updatedCartItems": [
    {
      "menuItemId": "burger-03",
      "quantity": 1,
      "selectedCustomizations": { "spice-level": "spice-extra-hot" }
    }
  ],
  "aiNarration": "Added Spicy Crispy Chicken — extra hot! 🌶️🔥"
}
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Run in 5 steps

```bash
# 1. Clone
git clone https://github.com/patelsid1211/the-intelligent-bistro.git
cd the-intelligent-bistro/mobile-app

# 2. Install frontend deps
npm install

# 3. Install backend deps
cd api-server && npm install && cd ..

# 4. Configure backend
cd api-server && cp .env.example .env
# (optional) add GEMINI_API_KEY to .env for live AI
# app works without it using the built-in offline engine

# 5. Start backend (terminal 1)
cd api-server && npx tsx src/server.ts

# 6. Start app (terminal 2)
npx expo start
# scan QR code with Expo Go
```

> Full setup instructions → [SETUP.md](./SETUP.md)  
> Full technical documentation → [TECHNICAL_DOCS.md](./TECHNICAL_DOCS.md)

---

## Project Structure

```
mobile-app/
├── app/                    # Screens (Expo Router file-based routing)
│   ├── (auth)/             # Login / Signup / Forgot Password
│   ├── (tabs)/             # Home, Cart, AI Chat, Profile
│   ├── item/[id].tsx       # Item detail + customization
│   ├── restaurants/        # Restaurant list + detail
│   └── account/            # Profile sub-screens
├── components/             # AIBubble, BackButton, MenuItemCard, CartLineItem
├── store/index.ts          # Zustand — auth, cart, AI, UI slices
├── data/                   # 50 menu items + 10 restaurants
├── hooks/useAIChat.ts      # Shared AI chat logic
├── shared/types.ts         # TypeScript contracts (frontend + backend)
└── api-server/
    └── src/
        ├── server.ts                 # Express + all routes
        ├── controllers/              # Auth, products, orders, AI, promo
        ├── services/aiService.ts     # Gemini → OpenAI → mock fallback
        └── db/localDb.ts             # SQLite (sql.js, no native deps)
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login → JWT tokens |
| POST | `/api/ai/order` | Process natural language order |
| GET | `/api/products` | All menu items |
| POST | `/api/orders` | Place order |
| POST | `/api/promo/validate` | Validate promo code |
| GET | `/health` | Server health check |

---

## Environment Variables

Copy `api-server/.env.example` to `api-server/.env`:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3001) |
| `GEMINI_API_KEY` | No* | Free at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `OPENAI_API_KEY` | No* | [platform.openai.com](https://platform.openai.com/api-keys) |
| `AI_PROVIDER` | No | `gemini` / `openai` / `auto` (default: auto) |

*App works without any AI key using the built-in offline engine.

---

## Promo Codes (for testing)

| Code | Discount |
|---|---|
| `SAVE10` | 10% off |
| `FLAT5` | $5 flat discount |
| `FREESHIP` | Free delivery |

---

## Built With AI Tools

This project was built using **Kiro** (AI coding assistant) to demonstrate how AI tools can accelerate production-quality software development. The AI assisted with architecture decisions, component generation, and debugging — while all design decisions and requirements were human-directed.

---

## License

MIT
