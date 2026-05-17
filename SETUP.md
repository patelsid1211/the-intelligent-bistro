# The Intelligent Bistro — Setup Guide

> A conversational AI food ordering app built with React Native (Expo) + Node.js.  
> Order food by typing naturally: *"Add two spicy chicken sandwiches and a large water"*

---

## Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| npm | 10+ | Comes with Node.js |
| Git | Any | [git-scm.com](https://git-scm.com) |
| Expo Go (phone) | Latest | [iOS App Store](https://apps.apple.com/app/expo-go/id982107779) · [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) |

> **No Xcode or Android Studio needed.** Expo Go on your phone is all you need to run the app.

---

## Quick Start (5 steps)

### Step 1 — Clone

```bash
git clone https://github.com/YOUR_USERNAME/the-bistro.git
cd the-bistro/mobile-app
```

---

### Step 2 — Install Dependencies

> `node_modules` is not included in the repo (535 MB). Run these commands to install everything locally.

```bash
# Install frontend packages (~454 MB)
npm install

# Install backend packages (~81 MB)
cd api-server
npm install
cd ..
```

---

### Step 3 — Configure the Backend

```bash
cd api-server
cp .env.example .env
```

Open `api-server/.env` in any text editor and set:

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:8081

# AI provider: "gemini" | "openai" | "auto"
AI_PROVIDER=gemini

# FREE Gemini key → https://aistudio.google.com/app/apikey
GEMINI_API_KEY=paste_your_key_here
```

> **No API key?** Leave `GEMINI_API_KEY` blank — the app has a built-in offline AI engine that handles all ordering commands automatically. Every feature still works.

---

### Step 4 — Start the API Server

Open a terminal in the `api-server` folder:

```bash
cd api-server
npx tsx src/server.ts
```

You should see:

```
🍽️  The Intelligent Bistro API
   Running on http://localhost:3001
   Environment: development
   Database: local SQLite (bistro.db)
   Health: http://localhost:3001/health
```

The SQLite database (`bistro.db`) is **created and seeded automatically** on first run — no setup needed.

> ⚠️ Use `npx tsx src/server.ts` directly. Do **not** use `npm run dev` — the watch mode has a known hot-reload glitch.

**Leave this terminal open.**

---

### Step 5 — Start the Expo App

Open a **second terminal** in the `mobile-app` root folder:

```bash
npx expo start
```

| Device | How to open |
|---|---|
| 📱 iPhone / Android | Scan the QR code with the **Expo Go** app |
| 🖥 iOS Simulator | Press `i` in the terminal (macOS + Xcode required) |
| 🤖 Android Emulator | Press `a` in the terminal (Android Studio required) |

---

## Try It Out

Once the app opens:

1. **Sign up** with any email and password (e.g. `test@test.com` / `password123`)
2. **Home screen** — tap category badges to filter the menu
3. **AI Chat** — tap the center `+` tab or the floating orange bubble, then try:
   - `"I want pizza"` → shows all pizzas as cards
   - `"Add two dragon rolls"` → adds directly to cart
   - `"Show me burgers"` → browse burger options
   - `"Add a spicy crispy chicken and a matcha latte"` → adds both items
   - `"What's popular?"` → top-rated recommendations
   - `"Show my cart"` → navigates to cart
4. **Restaurants** → tap "See All" on the home screen to browse all 10 restaurants
5. **Cart** → tap the bag icon, try promo code `SAVE10`, then place an order

---

## Promo Codes

| Code | Discount |
|---|---|
| `SAVE10` | 10% off subtotal |
| `FLAT5` | $5 flat discount |
| `FREESHIP` | Free delivery |

---

## Physical Device Setup (phone on same Wi-Fi)

When testing on a real phone, `localhost` won't work — use your computer's local IP instead.

**Find your IP:**
```bash
# macOS
ipconfig getifaddr en0

# Windows (run in Command Prompt)
ipconfig
# look for "IPv4 Address" under your Wi-Fi adapter

# Linux
hostname -I
```

**Update `api-server/.env`:**
```env
CORS_ORIGIN=http://192.168.x.x:8081
```

Expo automatically shows your local IP in the QR code — just scan and it connects.

---

## Troubleshooting

**App shows "Cannot connect to server"**
- Confirm the API server is running in another terminal
- On a physical device, make sure you updated `CORS_ORIGIN` with your local IP (see above)
- Check the server is reachable: open `http://localhost:3001/health` in a browser

**AI gives no response or times out**
- Gemini free tier allows 15 requests/minute — the app falls back to the offline engine automatically
- The offline engine works without any API key and handles all common orders

**Port 3001 already in use**
```bash
# macOS / Linux
lsof -ti:3001 | xargs kill

# Windows (PowerShell)
netstat -ano | findstr :3001
# then: taskkill /PID <pid> /F
```

**`npm install` fails**
- Make sure you're on Node.js 20+: `node --version`
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

**Expo QR code not scanning**
- Phone and computer must be on the same Wi-Fi network
- Press `c` in the Expo terminal to clear the cache and regenerate the QR code

**Database errors on server start**
- Delete `api-server/bistro.db` and restart — it will be recreated fresh with all seed data

---

## What's Not in the Repo

These are excluded from git and must be created locally:

| File / Folder | Why excluded | How to get it |
|---|---|---|
| `node_modules/` | 454 MB, machine-specific | `npm install` |
| `api-server/node_modules/` | 81 MB, machine-specific | `cd api-server && npm install` |
| `api-server/.env` | Contains secret API keys | `cp .env.example .env` then fill in |
| `api-server/bistro.db` | Auto-generated database | Created on first server start |
| `.expo/` | Expo local cache | Auto-created by `npx expo start` |

---

## Project Structure

```
mobile-app/
├── app/                    # All screens (Expo Router file-based routing)
│   ├── (auth)/login.tsx    # Login / Signup / Forgot Password
│   ├── (tabs)/             # Main tab screens (Home, Cart, AI Chat, Profile)
│   ├── item/[id].tsx       # Item detail + customization
│   ├── restaurants/        # Restaurant list + detail
│   └── account/            # Profile sub-screens
├── components/             # Shared UI (AIBubble, BackButton, MenuItemCard, etc.)
├── store/index.ts          # Zustand state — auth, cart, AI, UI
├── data/                   # Menu items (50) + restaurants (10)
├── hooks/useAIChat.ts      # Shared AI chat logic
├── constants/Theme.ts      # Design tokens (colors, spacing, typography)
├── shared/types.ts         # TypeScript contracts shared by frontend + backend
└── api-server/             # Node.js Express backend
    └── src/
        ├── server.ts                # Express app + all routes
        ├── controllers/             # Auth, products, orders, AI, promo
        ├── services/aiService.ts    # Gemini → OpenAI → local mock fallback
        └── db/localDb.ts            # SQLite via sql.js (no native deps)
```

For full technical details see [TECHNICAL_DOCS.md](./TECHNICAL_DOCS.md).
