/**
 * utils/ai.ts
 * Client-side AI utilities:
 * - parseQty: natural language quantity parsing
 * - showCategoryOptions: build a SHOW_OPTIONS response
 * - mockAIEngine: local fallback when the server is unreachable
 *
 * Single source of truth — used by both ai-chat.tsx and AIBubble.tsx.
 */

import type { AIOrderResponse } from "@shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// QUANTITY PARSING
// ─────────────────────────────────────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  one: 1, a: 1, an: 1,
  two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** Parse a natural language quantity from a lowercase utterance. */
export function parseQty(text: string): number {
  for (const [word, value] of Object.entries(WORD_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  const match = text.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOW_OPTIONS BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/** Build a SHOW_OPTIONS response for all available items in a category. */
export function showCategoryOptions(
  categoryId: string,
  narration: string
): AIOrderResponse {
  // Try live store first, fall back to hardcoded data
  let items = THE_BISTRO.menuItems.filter(
    (m) => m.categoryId === categoryId && m.isAvailable
  );
  try {
    // Dynamic import to avoid circular dependency at module load time
    const { useBistroStore } = require("@/store");
    const storeItems = useBistroStore.getState().menuItems as typeof THE_BISTRO.menuItems;
    if (storeItems && storeItems.length > 0) {
      items = storeItems.filter((m) => m.categoryId === categoryId && m.isAvailable);
    }
  } catch {
    // store not ready yet — use hardcoded fallback
  }
  return {
    action: "SHOW_OPTIONS",
    aiNarration: narration,
    optionCategory: categoryId,
    menuOptions: items.map((item) => ({
      menuItemId: item.id,
      name: item.name,
      description: item.description,
      basePrice: item.basePrice,
      imageUrl: item.imageUrl,
      dietaryTags: item.dietaryTags as string[],
      rating: item.rating,
      hasCustomizations: item.customizationGroups.length > 0,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIFIC ITEM MATCHERS
// ─────────────────────────────────────────────────────────────────────────────

/** Regex that matches specific item names — used to skip category browsing. */
const SPECIFIC_ITEM_RE =
  /margherita|diavola|truffle funghi|bbq chicken ranch|vegan garden|dragon roll|rainbow|spicy tuna|salmon sashimi|bistro classic|truffle mushroom|spicy crispy|garden smash|bbq bacon|carne asada|baja fish|al pastor|roasted veggie|cacio|lobster|bolognese|pesto|bistro caesar|poke bowl|korean bbq|mediterranean|teriyaki salmon|lava cake|cheesecake|tiramisu|matcha|lemonade/;

function add(
  menuItemId: string,
  qty: number,
  customizations: Record<string, string>,
  narration: string
): AIOrderResponse {
  return {
    action: "CART_ADD",
    updatedCartItems: [{ menuItemId, quantity: qty, selectedCustomizations: customizations }],
    aiNarration: narration,
  };
}

function qty_label(qty: number, name: string): string {
  return qty > 1 ? `${qty}× ${name}` : name;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL MOCK ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Client-side fallback AI engine.
 * Used when the API server is unreachable or returns an error.
 * Mirrors the server-side localMockEngine in aiService.ts.
 */
export function mockAIEngine(
  utterance: string,
  cartItemCount: number
): AIOrderResponse {
  const lower = utterance.toLowerCase();
  const qty = parseQty(lower);

  // ── Navigation ──────────────────────────────────────────────────────────────
  if (lower.includes("clear") || lower.includes("start over")) {
    return { action: "CART_CLEAR", aiNarration: "Done! Cart cleared. What would you like to order?" };
  }
  if (lower.includes("my cart") || lower.includes("show cart") || lower.includes("go to cart") || lower.includes("open cart") || lower.includes("take me") || lower.includes("go cart") || lower.includes("view cart")) {
    return {
      action: "NAVIGATE",
      navigateTo: "cart",
      aiNarration: cartItemCount > 0
        ? `You have ${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} in your cart. Taking you there! 🛒`
        : "Your cart is empty. Want me to add something?",
    };
  }
  if (lower.includes("order summary") || lower.includes("show order") || lower.includes("place order") || lower.includes("confirm order") || lower.includes("checkout")) {
    return {
      action: "NAVIGATE",
      navigateTo: "cart",
      aiNarration: cartItemCount > 0
        ? `Here's your order summary! You have ${cartItemCount} item${cartItemCount !== 1 ? "s" : ""}. Ready to place your order? 🛒`
        : "Your cart is empty. Want me to add something?",
    };
  }
  if (lower.includes("home") || lower.includes("browse menu")) {
    return { action: "NAVIGATE", navigateTo: "home", aiNarration: "Taking you to the menu! 🍽️" };
  }

  // ── Multi-item orders (e.g. "two spicy chicken sandwiches and a large water") ──
  if (lower.includes(" and ")) {
    const parts = lower.split(/\s+and\s+/);
    const cartItems: Array<{ menuItemId: string; quantity: number; selectedCustomizations: Record<string, string> }> = [];
    const names: string[] = [];

    for (const part of parts) {
      const q = parseQty(part);
      if (part.includes("spicy crispy") || part.includes("crispy chicken") || part.includes("spicy chicken")) {
        const spice = part.includes("extra hot") ? "spice-extra-hot" : part.includes("hot") ? "spice-hot" : part.includes("mild") ? "spice-mild" : "spice-medium";
        cartItems.push({ menuItemId: "burger-03", quantity: q, selectedCustomizations: { "spice-level": spice, "side-choice": "side-fries" } });
        names.push(`${q > 1 ? q + "× " : ""}Spicy Crispy Chicken`);
      } else if (part.includes("water") && !part.includes("sparkling")) {
        cartItems.push({ menuItemId: "drink-05", quantity: q, selectedCustomizations: {} });
        names.push(`${q > 1 ? q + "× " : ""}Still Water`);
      } else if (part.includes("sparkling")) {
        cartItems.push({ menuItemId: "drink-03", quantity: q, selectedCustomizations: {} });
        names.push(`${q > 1 ? q + "× " : ""}Sparkling Water`);
      } else if (part.includes("lemonade")) {
        cartItems.push({ menuItemId: "drink-01", quantity: q, selectedCustomizations: { "drink-size": part.includes("large") ? "drink-lg" : "drink-md", "lemonade-flavor": "lf-classic" } });
        names.push(`${q > 1 ? q + "× " : ""}Craft Lemonade`);
      } else if (part.includes("matcha")) {
        cartItems.push({ menuItemId: "drink-02", quantity: q, selectedCustomizations: { "drink-size": part.includes("large") ? "drink-lg" : "drink-md", "latte-temp": "temp-hot", "latte-milk": "milk-oat" } });
        names.push(`${q > 1 ? q + "× " : ""}Matcha Latte`);
      } else if (part.includes("dragon roll")) {
        cartItems.push({ menuItemId: "sushi-01", quantity: q, selectedCustomizations: {} });
        names.push(`${q > 1 ? q + "× " : ""}Dragon Roll`);
      } else if (part.includes("margherita")) {
        cartItems.push({ menuItemId: "pizza-01", quantity: q, selectedCustomizations: { "pizza-size": "pizza-10", "pizza-crust": "crust-hand" } });
        names.push(`${q > 1 ? q + "× " : ""}Margherita`);
      } else if (part.includes("bistro classic") || (part.includes("burger") && !part.includes("bbq"))) {
        cartItems.push({ menuItemId: "burger-01", quantity: q, selectedCustomizations: { "burger-patty": "patty-single", "burger-cheese": "cheese-american", "burger-sauce": "sauce-bistro", "side-choice": "side-fries" } });
        names.push(`${q > 1 ? q + "× " : ""}Bistro Classic`);
      } else if (part.includes("cold brew")) {
        cartItems.push({ menuItemId: "drink-06", quantity: q, selectedCustomizations: { "cold-brew-milk": "cb-black" } });
        names.push(`${q > 1 ? q + "× " : ""}Cold Brew`);
      } else if (part.includes("energy")) {
        cartItems.push({ menuItemId: "drink-07", quantity: q, selectedCustomizations: { "energy-flavor": "ef-citrus" } });
        names.push(`${q > 1 ? q + "× " : ""}Energy Boost`);
      }
    }

    if (cartItems.length > 1) {
      return {
        action: "CART_ADD",
        updatedCartItems: cartItems,
        aiNarration: `Added ${names.join(" and ")} to your cart! 🛒`,
      };
    }
  }

  // ── Category browsing → SHOW_OPTIONS ────────────────────────────────────────
  const isSpecific = SPECIFIC_ITEM_RE.test(lower);
  if (!isSpecific) {
    if (lower.includes("pizza"))                                    return showCategoryOptions("pizza",    "Here are our pizzas! 🍕 Which one would you like?");
    if (lower.includes("burger") || lower.includes("cheeseburger")) return showCategoryOptions("burgers",  "Here are our burgers! 🍔 Which one would you like?");
    if (lower.includes("sushi") || lower.includes("roll"))          return showCategoryOptions("sushi",    "Here's our sushi menu! 🍣 What looks good?");
    if (lower.includes("taco"))                                     return showCategoryOptions("tacos",    "Here are our tacos! 🌮 Which one would you like?");
    if (lower.includes("bowl") || lower.includes("poke"))           return showCategoryOptions("bowls",    "Here are our bowls! 🥗 Which one would you like?");
    if (lower.includes("pasta") || lower.includes("noodle"))        return showCategoryOptions("pasta",    "Here's our pasta! 🍝 Which one sounds good?");
    if (lower.includes("salad"))                                    return showCategoryOptions("salads",   "Here are our salads! 🥗 Which one would you like?");
    if (lower.includes("dessert") || lower.includes("cake"))        return showCategoryOptions("desserts", "Here are our desserts! 🍰 Which one would you like?");
    if (lower.includes("drink") || lower.includes("latte") || lower.includes("coffee"))
                                                                    return showCategoryOptions("drinks",   "Here are our drinks! 🥤 What would you like?");
  }

  // ── Specific item orders ─────────────────────────────────────────────────────
  if (lower.includes("margherita"))
    return add("pizza-01", qty, { "pizza-size": "pizza-10", "pizza-crust": "crust-hand" }, `Added ${qty_label(qty, "Margherita Classica")}! 🍕`);
  if (lower.includes("diavola"))
    return add("pizza-03", qty, { "pizza-size": "pizza-10", "pizza-crust": "crust-hand", "spice-level": "spice-medium" }, `Added ${qty_label(qty, "Spicy Diavola")}! 🌶️🍕`);
  if (lower.includes("truffle funghi"))
    return add("pizza-02", qty, { "pizza-size": "pizza-10", "pizza-crust": "crust-thin" }, `Added ${qty_label(qty, "Truffle Funghi")}! 🍕`);
  if (lower.includes("bbq chicken ranch"))
    return add("pizza-04", qty, { "pizza-size": "pizza-10", "pizza-crust": "crust-hand" }, `Added ${qty_label(qty, "BBQ Chicken Ranch")}! 🍕`);
  if (lower.includes("bistro classic") || (lower.includes("burger") && isSpecific)) {
    const isDouble = lower.includes("double");
    return add("burger-01", qty, { "burger-patty": isDouble ? "patty-double" : "patty-single", "burger-cheese": "cheese-american", "burger-sauce": "sauce-bistro", "side-choice": "side-fries" }, `Added ${qty_label(qty, isDouble ? "Double Bistro Classic" : "Bistro Classic")}! 🍔`);
  }
  if (lower.includes("spicy crispy") || lower.includes("crispy chicken")) {
    const spice = lower.includes("extra hot") ? "spice-extra-hot" : lower.includes("hot") ? "spice-hot" : lower.includes("mild") ? "spice-mild" : "spice-medium";
    return add("burger-03", qty, { "spice-level": spice, "side-choice": "side-fries" }, `Added ${qty_label(qty, "Spicy Crispy Chicken")}! 🌶️🍔`);
  }
  if (lower.includes("dragon roll"))
    return add("sushi-01", qty, {}, `Added ${qty_label(qty, "Dragon Roll")}! 🍣`);
  if (lower.includes("spicy tuna"))
    return add("sushi-02", qty, { "spice-level": "spice-medium" }, `Added ${qty_label(qty, "Spicy Tuna Roll")}! 🌶️🍣`);
  if (lower.includes("rainbow"))
    return add("sushi-03", qty, {}, `Added ${qty_label(qty, "Rainbow Roll")}! 🍣`);
  if (lower.includes("carne asada"))
    return add("taco-01", qty, { "taco-shell": "shell-corn", "spice-level": "spice-medium" }, `Added ${qty_label(qty, "Carne Asada Tacos")}! 🌮`);
  if (lower.includes("al pastor"))
    return add("taco-03", qty, { "taco-shell": "shell-corn", "spice-level": "spice-medium" }, `Added ${qty_label(qty, "Al Pastor Tacos")}! 🌮`);
  if (lower.includes("poke bowl") || lower.includes("bistro poke"))
    return add("bowl-01", qty, { "bowl-base": "base-white-rice", "protein-choice": "prot-chicken", "bowl-sauce": "bs-teriyaki" }, `Added ${qty_label(qty, "Bistro Poke Bowl")}! 🥗`);
  if (lower.includes("cacio"))
    return add("pasta-01", qty, { "pasta-type": "pasta-spaghetti" }, `Added ${qty_label(qty, "Cacio e Pepe")}! 🍝`);
  if (lower.includes("bolognese"))
    return add("pasta-03", qty, { "pasta-type": "pasta-spaghetti" }, `Added ${qty_label(qty, "Bolognese Ragu")}! 🍝`);
  if (lower.includes("lava cake") || lower.includes("chocolate lava"))
    return add("dessert-01", qty, {}, `Added ${qty_label(qty, "Chocolate Lava Cake")}! 🍫`);
  if (lower.includes("cheesecake"))
    return add("dessert-02", qty, {}, `Added ${qty_label(qty, "New York Cheesecake")}! 🍰`);
  if (lower.includes("tiramisu"))
    return add("dessert-03", qty, {}, `Added ${qty_label(qty, "Tiramisu")}! ☕`);
  if (lower.includes("matcha"))
    return add("drink-02", qty, { "drink-size": "drink-md", "latte-temp": "temp-hot", "latte-milk": "milk-oat" }, `Added ${qty_label(qty, "Matcha Latte")}! 🍵`);
  if (lower.includes("lemonade"))
    return add("drink-01", qty, { "drink-size": "drink-md", "lemonade-flavor": "lf-classic" }, `Added ${qty_label(qty, "Craft Lemonade")}! 🍋`);
  if (lower.includes("water") && !lower.includes("sparkling"))
    return add("drink-05", qty, {}, `Added ${qty_label(qty, "Still Water")}! 💧`);
  if (lower.includes("sparkling water") || lower.includes("sparkling"))
    return add("drink-03", qty, {}, `Added ${qty_label(qty, "Sparkling Water")}! 💧`);
  if (lower.includes("cold brew") || lower.includes("cold coffee"))
    return add("drink-06", qty, { "cold-brew-milk": "cb-black" }, `Added ${qty_label(qty, "Cold Brew Coffee")}! ☕`);
  if (lower.includes("energy") || lower.includes("energy drink"))
    return add("drink-07", qty, { "energy-flavor": "ef-citrus" }, `Added ${qty_label(qty, "Energy Boost")}! ⚡`);
  if (lower.includes("lassi") || lower.includes("mango lassi"))
    return add("drink-08", qty, { "drink-size": "drink-md" }, `Added ${qty_label(qty, "Mango Lassi")}! 🥭`);

  // ── Recommendations ──────────────────────────────────────────────────────────
  if (lower.includes("recommend") || lower.includes("popular") || lower.includes("what's good") || lower.includes("what's popular")) {
    return {
      action: "CLARIFY",
      aiNarration: "Our top picks right now:\n🍔 Bistro Classic Burger ⭐4.9\n🍣 Dragon Roll ⭐4.9\n🍕 Margherita Classica ⭐4.9\n🍫 Chocolate Lava Cake ⭐4.9\n\nWhat sounds good?",
      requiresClarification: false,
    };
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return {
      action: "CLARIFY",
      aiNarration: `Hi! 👋 I'm your AI ordering assistant for The Intelligent Bistro.\n\nTry:\n• "I want pizza" — see all pizzas\n• "Add two dragon rolls"\n• "Show me burgers"\n• "What's popular?"`,
      requiresClarification: false,
    };
  }

  return {
    action: "CLARIFY",
    aiNarration: `Try:\n• "I want pizza" or "Show me burgers"\n• "Add two spicy chicken sandwiches"\n• "Show my cart"\n• "What's popular?"`,
    requiresClarification: true,
  };
}
