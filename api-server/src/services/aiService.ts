/**
 * api-server/src/services/aiService.ts
 * LLM Tool-Calling AI ordering engine.
 *
 * Provider priority (controlled by AI_PROVIDER env var):
 *   "gemini" → Google Gemini 2.0 Flash (function calling)
 *   "openai" → OpenAI GPT-4o-mini (tool calling)
 *   "auto"   → tries OpenAI first, then Gemini, then local mock
 *
 * Falls back to local mock engine on quota/auth/network errors.
 */

import type { FunctionDeclaration, Tool } from "@google/generative-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type {
    AIAction,
    AIOrderRequest,
    AIOrderResponse,
    NavigationTarget,
} from "../../../shared/types.js";
import { THE_BISTRO } from "../data/menuData.js";

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS (lazy-initialized so missing keys don't crash on import)
// ─────────────────────────────────────────────────────────────────────────────

let _openaiClient: OpenAI | null = null;
let _geminiClient: GoogleGenerativeAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set.");
    _openaiClient = new OpenAI({ apiKey });
  }
  return _openaiClient;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!_geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set.");
    _geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return _geminiClient;
}

/** Which provider to use. Reads AI_PROVIDER env var, defaults to "auto". */
function getProvider(): "openai" | "gemini" | "auto" {
  const p = process.env.AI_PROVIDER?.toLowerCase();
  if (p === "openai" || p === "gemini") return p;
  return "auto";
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "CART_ADD",
      description:
        "Add one or more menu items to the cart. Use this when the user wants to order food.",
      parameters: {
        type: "object",
        required: ["updatedCartItems", "aiNarration"],
        properties: {
          updatedCartItems: {
            type: "array",
            description: "Items to add to the cart.",
            items: {
              type: "object",
              required: ["menuItemId", "quantity", "selectedCustomizations"],
              properties: {
                menuItemId: {
                  type: "string",
                  description: "The exact menu item ID from the menu.",
                },
                quantity: {
                  type: "integer",
                  minimum: 1,
                  maximum: 20,
                },
                selectedCustomizations: {
                  type: "object",
                  description:
                    "Map of customizationGroupId to optionId. Only include groups where a selection is needed.",
                  additionalProperties: { type: "string" },
                },
                specialInstructions: {
                  type: "string",
                  description: "Optional special instructions for this item.",
                },
              },
            },
          },
          aiNarration: {
            type: "string",
            description:
              "Friendly, conversational confirmation message to show the user. Include item names and any notable customizations.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "CART_REMOVE",
      description:
        "Remove specific line items from the cart by their lineItemId.",
      parameters: {
        type: "object",
        required: ["removeLineItemIds", "aiNarration"],
        properties: {
          removeLineItemIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of lineItemId strings to remove.",
          },
          aiNarration: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "CART_CLEAR",
      description: "Clear all items from the cart.",
      parameters: {
        type: "object",
        required: ["aiNarration"],
        properties: {
          aiNarration: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "NAVIGATE",
      description:
        "Navigate the user to a different screen in the app (e.g., cart, home, checkout).",
      parameters: {
        type: "object",
        required: ["navigateTo", "aiNarration"],
        properties: {
          navigateTo: {
            type: "string",
            enum: ["home", "cart", "menu", "item-detail", "checkout"],
          },
          navigateItemId: {
            type: "string",
            description: "Required when navigateTo is 'item-detail'.",
          },
          aiNarration: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "SHOW_OPTIONS",
      description:
        "Show the user a list of available menu items to choose from when they mention a category (e.g. 'I want pizza', 'show me burgers'). Use this instead of CLARIFY when you can present real menu options.",
      parameters: {
        type: "object",
        required: ["menuOptions", "aiNarration", "optionCategory"],
        properties: {
          menuOptions: {
            type: "array",
            description: "List of menu item IDs to show as option cards.",
            items: {
              type: "object",
              required: ["menuItemId"],
              properties: {
                menuItemId: { type: "string", description: "Exact menu item ID." },
              },
            },
          },
          optionCategory: {
            type: "string",
            description: "The category name, e.g. 'pizza', 'burgers', 'sushi'.",
          },
          aiNarration: {
            type: "string",
            description: "Friendly message introducing the options, e.g. 'Here are our pizzas! Which one would you like?'",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "CLARIFY",
      description:
        "Ask the user for clarification when the request is ambiguous, or provide information without modifying the cart.",
      parameters: {
        type: "object",
        required: ["aiNarration"],
        properties: {
          aiNarration: { type: "string", description: "The response or clarifying question to show the user." },
          requiresClarification: { type: "boolean", description: "True if you need more info from the user before acting." },
          clarificationPrompt: { type: "string", description: "The specific follow-up question to ask." },
        },
      },
    },
  },
];
// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const menuSummary = THE_BISTRO.menuItems
    .map((item) => {
      const customGroups = item.customizationGroups
        .map(
          (g) =>
            `  - ${g.label} (${g.type}, min:${g.minSelections}, max:${g.maxSelections}): ` +
            g.options
              .map(
                (o) =>
                  `${o.id}="${o.label}"${o.priceDelta > 0 ? ` +$${(o.priceDelta / 100).toFixed(2)}` : ""}${o.isDefault ? " [default]" : ""}`
              )
              .join(", ")
        )
        .join("\n");
      return (
        `ID: ${item.id} | ${item.name} | $${(item.basePrice / 100).toFixed(2)} | ` +
        `Rating: ${item.rating} | Category: ${item.categoryId}\n` +
        (customGroups ? `Customizations:\n${customGroups}` : "No customizations")
      );
    })
    .join("\n\n");

  return `You are the AI ordering assistant for "${THE_BISTRO.name}" — a premium food ordering app.

Your job is to help users order food by calling the appropriate tool function. You MUST always call exactly one tool.

RESTAURANT: ${THE_BISTRO.name}
CUISINE: ${THE_BISTRO.cuisineTypes.join(", ")}
DELIVERY TIME: ${THE_BISTRO.deliveryTimeRange}
DELIVERY FEE: $${(THE_BISTRO.deliveryFee / 100).toFixed(2)}

FULL MENU:
${menuSummary}

RULES:
1. Always call exactly one tool — never respond with plain text.
2. When adding items, use the exact menuItemId from the menu above.
3. For customizations, use the exact customizationGroupId and optionId from the menu.
4. If a required customization group (minSelections > 0) has no obvious choice, pick the first option or the default.
5. Be friendly, concise, and enthusiastic in aiNarration. Use food emojis sparingly.
6. If the user asks about something not on the menu, use CLARIFY.
7. Never invent menu items or IDs that don't exist in the menu above.
8. Prices are in cents internally — do NOT mention cents to the user, use dollar amounts.
9. IMPORTANT: When the user mentions a food category (e.g. "I want pizza", "show me burgers", "I want sushi") WITHOUT specifying a particular item, use SHOW_OPTIONS to present the available items in that category. Include ALL items from that category.
10. When the user says something like "two spicy chicken sandwiches" or "3 burgers", parse the quantity (number words: one=1, two=2, three=3, four=4, five=5) and any modifiers (spicy, double, large, etc.) and use CART_ADD with the correct quantity and customizations.
11. When the user picks a specific item from options you showed, use CART_ADD immediately.
12. For customization questions (e.g. "what size?", "which crust?"), use CLARIFY to ask, then CART_ADD when they answer.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SERVICE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI FUNCTION DECLARATIONS
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_FUNCTIONS: FunctionDeclaration[] = [
  {
    name: "CART_ADD",
    description: "Add one or more menu items to the cart.",
    parameters: {
      type: "object",
      required: ["updatedCartItems", "aiNarration"],
      properties: {
        updatedCartItems: {
          type: "array",
          description: "Items to add.",
          items: {
            type: "object",
            required: ["menuItemId", "quantity", "selectedCustomizations"],
            properties: {
              menuItemId: { type: "string" },
              quantity: { type: "integer" },
              selectedCustomizations: {
                type: "object",
                description: "Map of customizationGroupId to optionId.",
              },
              specialInstructions: { type: "string" },
            },
          },
        },
        aiNarration: { type: "string" },
      },
    },
  },
  {
    name: "CART_REMOVE",
    description: "Remove specific line items from the cart.",
    parameters: {
      type: "object",
      required: ["removeLineItemIds", "aiNarration"],
      properties: {
        removeLineItemIds: { type: "array", items: { type: "string" } },
        aiNarration: { type: "string" },
      },
    },
  },
  {
    name: "CART_CLEAR",
    description: "Clear all items from the cart.",
    parameters: {
      type: "object",
      required: ["aiNarration"],
      properties: { aiNarration: { type: "string" } },
    },
  },
  {
    name: "NAVIGATE",
    description: "Navigate the user to a different screen.",
    parameters: {
      type: "object",
      required: ["navigateTo", "aiNarration"],
      properties: {
        navigateTo: { type: "string" },
        navigateItemId: { type: "string" },
        aiNarration: { type: "string" },
      },
    },
  },
  {
    name: "SHOW_OPTIONS",
    description: "Show the user a list of available menu items when they mention a category.",
    parameters: {
      type: "object",
      required: ["menuOptions", "aiNarration", "optionCategory"],
      properties: {
        menuOptions: {
          type: "array",
          items: {
            type: "object",
            properties: { menuItemId: { type: "string" } },
          },
        },
        optionCategory: { type: "string" },
        aiNarration: { type: "string" },
      },
    },
  },
  {
    name: "CLARIFY",
    description: "Ask for clarification or provide information without modifying the cart.",
    parameters: {
      type: "object",
      required: ["aiNarration"],
      properties: {
        aiNarration: { type: "string" },
        requiresClarification: { type: "boolean" },
        clarificationPrompt: { type: "string" },
      },
    },
  },
];

const GEMINI_TOOLS: Tool[] = [{ functionDeclarations: GEMINI_FUNCTIONS }];

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

async function processWithGemini(request: AIOrderRequest): Promise<AIOrderResponse> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: GEMINI_TOOLS,
    systemInstruction: buildSystemPrompt(),
  });

  // Build conversation history for Gemini
  const history = request.conversationHistory.slice(-10).map((turn) => ({
    role: turn.role === "user" ? "user" as const : "model" as const,
    parts: [{ text: turn.content }],
  }));

  const cartContext =
    request.currentCart.items.length === 0
      ? "The cart is currently empty."
      : `Current cart (${request.currentCart.items.length} items):\n` +
        request.currentCart.items
          .map((item) => `- ${item.name} x${item.quantity} (lineItemId: ${item.lineItemId})`)
          .join("\n");

  const chat = model.startChat({ history });

  const result = await chat.sendMessage(
    `CURRENT CART STATE:\n${cartContext}\n\nUser: ${request.utterance}`
  );

  const candidate = result.response.candidates?.[0];
  const part = candidate?.content?.parts?.[0];

  // Extract function call from response
  const functionCall = part?.functionCall ?? result.response.functionCalls()?.[0];

  if (!functionCall) {
    // Gemini responded with text instead of a function call — wrap it
    const text = result.response.text();
    return {
      action: "CLARIFY",
      aiNarration: text || "I didn't quite catch that. What would you like to order?",
      requiresClarification: false,
    };
  }

  const action = functionCall.name as AIAction;
  const args = functionCall.args as Record<string, unknown>;

  const response: AIOrderResponse = {
    action,
    aiNarration: (args.aiNarration as string) ?? "Done!",
  };

  if (action === "CART_ADD" || action === "CART_UPDATE_QUANTITY") {
    response.updatedCartItems = args.updatedCartItems as AIOrderResponse["updatedCartItems"];
  }
  if (action === "CART_REMOVE") {
    response.removeLineItemIds = args.removeLineItemIds as string[];
  }
  if (action === "NAVIGATE") {
    response.navigateTo = args.navigateTo as NavigationTarget;
    if (args.navigateItemId) response.navigateItemId = args.navigateItemId as string;
  }
  if (action === "CLARIFY") {
    response.requiresClarification = (args.requiresClarification as boolean) ?? false;
    if (args.clarificationPrompt) response.clarificationPrompt = args.clarificationPrompt as string;
  }
  if (action === "SHOW_OPTIONS") {
    const rawOptions = (args.menuOptions as Array<{ menuItemId: string }>) ?? [];
    response.menuOptions = rawOptions.map((o) => {
      const item = THE_BISTRO.menuItems.find((m) => m.id === o.menuItemId);
      if (!item) return null;
      return {
        menuItemId: item.id,
        name: item.name,
        description: item.description,
        basePrice: item.basePrice,
        imageUrl: item.imageUrl,
        dietaryTags: item.dietaryTags,
        rating: item.rating,
        hasCustomizations: item.customizationGroups.length > 0,
      };
    }).filter(Boolean) as AIOrderResponse["menuOptions"];
    response.optionCategory = args.optionCategory as string;
  }

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Parse word numbers and digits: "two" → 2, "3" → 3 */
function parseQuantity(text: string): number {
  const words: Record<string, number> = {
    one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  for (const [word, val] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return val;
  }
  const match = text.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : 1;
}

/** Build SHOW_OPTIONS response for a category */
function showCategoryOptions(
  categoryId: string,
  narration: string
): AIOrderResponse {
  const items = THE_BISTRO.menuItems.filter((m) => m.categoryId === categoryId && m.isAvailable);
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
// LOCAL MOCK ENGINE — used when LLM is unavailable
// ─────────────────────────────────────────────────────────────────────────────

function localMockEngine(
  utterance: string,
  cartItemCount: number
): AIOrderResponse {
  const lower = utterance.toLowerCase();
  const qty = parseQuantity(lower);

  // ── Navigation ──────────────────────────────────────────────────────────────
  if (lower.includes("clear") || lower.includes("start over") || lower.includes("remove everything")) {
    return { action: "CART_CLEAR", aiNarration: "Done! Cart cleared. What would you like to order?" };
  }
  if (lower.includes("my cart") || lower.includes("checkout") || lower.includes("show cart") || lower.includes("order summary") || lower.includes("show order") || lower.includes("place order") || lower.includes("confirm order")) {
    return {
      action: "NAVIGATE", navigateTo: "cart",
      aiNarration: cartItemCount > 0
        ? `Here's your order summary! You have ${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} in your cart. Ready to place your order? 🛒`
        : "Your cart is empty. Want me to add something first?",
    };
  }
  if (lower.includes("home") || lower.includes("browse menu")) {
    return { action: "NAVIGATE", navigateTo: "home", aiNarration: "Taking you to the menu! 🍽️" };
  }

  // ── Multi-item orders (e.g. "two spicy chicken sandwiches and a large water") ──
  const hasAnd = lower.includes(" and ");
  if (hasAnd) {
    const parts = lower.split(/\s+and\s+/);
    const cartItems: Array<{ menuItemId: string; quantity: number; selectedCustomizations: Record<string, string> }> = [];
    const names: string[] = [];

    for (const part of parts) {
      const q = parseQuantity(part);
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
  const isSpecific = /margherita|diavola|truffle funghi|bbq chicken|vegan garden|dragon roll|rainbow|spicy tuna|salmon sashimi|veggie avocado|bistro classic|truffle mushroom|spicy crispy|garden smash|bbq bacon|carne asada|baja fish|al pastor|roasted veggie|cacio|lobster|bolognese|pesto|bistro caesar|harvest kale|poke bowl|korean bbq|mediterranean|teriyaki salmon|lava cake|cheesecake|tiramisu|matcha|lemonade/.test(lower);

  if (!isSpecific) {
    if (lower.includes("pizza") || lower.includes("pizzas")) {
      return showCategoryOptions("pizza", "Here are our pizzas! 🍕 Which one catches your eye?");
    }
    if (lower.includes("burger") || lower.includes("burgers") || lower.includes("cheeseburger")) {
      return showCategoryOptions("burgers", "Here are our burgers! 🍔 Which one would you like?");
    }
    if (lower.includes("sushi") || lower.includes("roll") || lower.includes("sashimi")) {
      return showCategoryOptions("sushi", "Here's our sushi menu! 🍣 What looks good?");
    }
    if (lower.includes("taco") || lower.includes("tacos")) {
      return showCategoryOptions("tacos", "Here are our tacos! 🌮 Which one would you like?");
    }
    if (lower.includes("bowl") || lower.includes("poke")) {
      return showCategoryOptions("bowls", "Here are our bowls! 🥗 Which one would you like?");
    }
    if (lower.includes("pasta") || lower.includes("noodle")) {
      return showCategoryOptions("pasta", "Here's our pasta selection! 🍝 Which one sounds good?");
    }
    if (lower.includes("salad")) {
      return showCategoryOptions("salads", "Here are our salads! 🥗 Which one would you like?");
    }
    if (lower.includes("dessert") || lower.includes("sweet") || lower.includes("cake")) {
      return showCategoryOptions("desserts", "Here are our desserts! 🍰 Which one would you like?");
    }
    if (lower.includes("drink") || lower.includes("beverage") || lower.includes("latte") || lower.includes("coffee")) {
      return showCategoryOptions("drinks", "Here are our drinks! 🥤 What would you like?");
    }
  }

  // ── Specific item orders ─────────────────────────────────────────────────────
  if (lower.includes("margherita")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "pizza-01", quantity: qty, selectedCustomizations: { "pizza-size": "pizza-10", "pizza-crust": "crust-hand" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Margherita Classica! 🍕` };
  }
  if (lower.includes("diavola") || lower.includes("spicy pizza")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "pizza-03", quantity: qty, selectedCustomizations: { "pizza-size": "pizza-10", "pizza-crust": "crust-hand", "spice-level": "spice-medium" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Spicy Diavola! 🌶️🍕` };
  }
  if (lower.includes("truffle funghi") || lower.includes("truffle pizza")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "pizza-02", quantity: qty, selectedCustomizations: { "pizza-size": "pizza-10", "pizza-crust": "crust-thin" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Truffle Funghi! 🍕` };
  }
  if (lower.includes("bbq chicken pizza") || lower.includes("bbq chicken ranch")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "pizza-04", quantity: qty, selectedCustomizations: { "pizza-size": "pizza-10", "pizza-crust": "crust-hand" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}BBQ Chicken Ranch! 🍕` };
  }
  if (lower.includes("vegan pizza") || lower.includes("garden harvest")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "pizza-05", quantity: qty, selectedCustomizations: { "pizza-size": "pizza-10", "pizza-crust": "crust-cauliflower" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Vegan Garden Harvest! 🌿🍕` };
  }
  if (lower.includes("bistro classic") || (lower.includes("burger") && isSpecific)) {
    const isDouble = lower.includes("double");
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "burger-01", quantity: qty, selectedCustomizations: { "burger-patty": isDouble ? "patty-double" : "patty-single", "burger-cheese": "cheese-american", "burger-sauce": "sauce-bistro", "side-choice": "side-fries" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}${isDouble ? "Double " : ""}Bistro Classic with fries! 🍔` };
  }
  if (lower.includes("truffle mushroom")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "burger-02", quantity: qty, selectedCustomizations: { "burger-patty": "patty-single", "burger-cheese": "cheese-swiss", "burger-sauce": "sauce-truffle", "side-choice": "side-fries" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Truffle Mushroom Melt! 🍔` };
  }
  if (lower.includes("spicy crispy") || lower.includes("crispy chicken")) {
    const spice = lower.includes("extra hot") ? "spice-extra-hot" : lower.includes("hot") ? "spice-hot" : lower.includes("mild") ? "spice-mild" : "spice-medium";
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "burger-03", quantity: qty, selectedCustomizations: { "spice-level": spice, "side-choice": "side-fries" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Spicy Crispy Chicken! 🌶️🍔` };
  }
  if (lower.includes("dragon roll")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "sushi-01", quantity: qty, selectedCustomizations: {} }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Dragon Roll! 🍣` };
  }
  if (lower.includes("spicy tuna")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "sushi-02", quantity: qty, selectedCustomizations: { "spice-level": "spice-medium" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Spicy Tuna Roll! 🌶️🍣` };
  }
  if (lower.includes("rainbow roll") || lower.includes("rainbow")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "sushi-03", quantity: qty, selectedCustomizations: {} }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Rainbow Roll! 🍣` };
  }
  if (lower.includes("carne asada")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "taco-01", quantity: qty, selectedCustomizations: { "taco-shell": "shell-corn", "spice-level": "spice-medium" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Carne Asada Tacos! 🌮` };
  }
  if (lower.includes("al pastor")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "taco-03", quantity: qty, selectedCustomizations: { "taco-shell": "shell-corn", "spice-level": "spice-medium" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Al Pastor Tacos! 🌮` };
  }
  if (lower.includes("poke bowl") || lower.includes("bistro poke")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "bowl-01", quantity: qty, selectedCustomizations: { "bowl-base": "base-white-rice", "protein-choice": "prot-chicken", "bowl-sauce": "bs-teriyaki" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Bistro Poke Bowl! 🥗` };
  }
  if (lower.includes("cacio") || lower.includes("cacio e pepe")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "pasta-01", quantity: qty, selectedCustomizations: { "pasta-type": "pasta-spaghetti" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Cacio e Pepe! 🍝` };
  }
  if (lower.includes("bolognese")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "pasta-03", quantity: qty, selectedCustomizations: { "pasta-type": "pasta-spaghetti" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Bolognese Ragu! 🍝` };
  }
  if (lower.includes("lava cake") || lower.includes("chocolate lava")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "dessert-01", quantity: qty, selectedCustomizations: {} }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Warm Chocolate Lava Cake! 🍫` };
  }
  if (lower.includes("cheesecake")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "dessert-02", quantity: qty, selectedCustomizations: {} }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}New York Cheesecake! 🍰` };
  }
  if (lower.includes("tiramisu")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "dessert-03", quantity: qty, selectedCustomizations: {} }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Tiramisu! ☕` };
  }
  if (lower.includes("matcha")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "drink-02", quantity: qty, selectedCustomizations: { "drink-size": "drink-md", "latte-temp": "temp-hot", "latte-milk": "milk-oat" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Medium Hot Matcha Latte! 🍵` };
  }
  if (lower.includes("lemonade")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "drink-01", quantity: qty, selectedCustomizations: { "drink-size": "drink-md", "lemonade-flavor": "lf-classic" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Medium Craft Lemonade! 🍋` };
  }
  if (lower.includes("water") && !lower.includes("sparkling")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "drink-05", quantity: qty, selectedCustomizations: {} }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Still Water! 💧` };
  }
  if (lower.includes("sparkling water") || lower.includes("sparkling")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "drink-03", quantity: qty, selectedCustomizations: {} }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Sparkling Water! 💧` };
  }
  if (lower.includes("cold brew") || lower.includes("cold coffee")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "drink-06", quantity: qty, selectedCustomizations: { "cold-brew-milk": "cb-black" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Cold Brew Coffee! ☕` };
  }
  if (lower.includes("energy drink") || lower.includes("energy boost")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "drink-07", quantity: qty, selectedCustomizations: { "energy-flavor": "ef-citrus" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Energy Boost! ⚡` };
  }
  if (lower.includes("lassi") || lower.includes("mango lassi")) {
    return { action: "CART_ADD", updatedCartItems: [{ menuItemId: "drink-08", quantity: qty, selectedCustomizations: { "drink-size": "drink-md" } }], aiNarration: `Added ${qty > 1 ? qty + "x " : ""}Mango Lassi! 🥭` };
  }

  // ── Recommendations ──────────────────────────────────────────────────────────
  if (lower.includes("recommend") || lower.includes("suggest") || lower.includes("popular") || lower.includes("what's good") || lower.includes("what's popular")) {
    return { action: "CLARIFY", aiNarration: "Our top picks right now:\n🍔 Bistro Classic Burger ⭐4.9\n🍣 Dragon Roll ⭐4.9\n🍕 Margherita Classica ⭐4.9\n🍫 Chocolate Lava Cake ⭐4.9\n\nWhat sounds good?", requiresClarification: false };
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return { action: "CLARIFY", aiNarration: `Hi! 👋 I'm your AI ordering assistant for ${THE_BISTRO.name}.\n\nTry saying:\n• "I want pizza" — see all pizzas\n• "Add two spicy chicken sandwiches"\n• "Show me sushi"\n• "What's popular?"`, requiresClarification: false };
  }

  return {
    action: "CLARIFY",
    aiNarration: `I didn't catch that. Try:\n• "I want pizza" or "Show me burgers"\n• "Add two dragon rolls"\n• "Show my cart"\n• "What's popular?"`,
    requiresClarification: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SERVICE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export async function processAIOrder(
  request: AIOrderRequest
): Promise<AIOrderResponse> {
  const provider = getProvider();
  const cartItemCount = request.currentCart.items.reduce((s, i) => s + i.quantity, 0);

  // ── Gemini-only mode ──────────────────────────────────────────────────────
  if (provider === "gemini") {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[AI] AI_PROVIDER=gemini but GEMINI_API_KEY not set — using local mock");
      return localMockEngine(request.utterance, cartItemCount);
    }
    try {
      const result = await processWithGemini(request);
      console.log(`[AI] Gemini ✓ action=${result.action}`);
      return result;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      console.warn(`[AI] Gemini error ${status ?? "unknown"} — falling back to local mock`);
      return localMockEngine(request.utterance, cartItemCount);
    }
  }

  // ── OpenAI-only mode ──────────────────────────────────────────────────────
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      console.warn("[AI] AI_PROVIDER=openai but OPENAI_API_KEY not set — using local mock");
      return localMockEngine(request.utterance, cartItemCount);
    }
    return processWithOpenAI(request, cartItemCount);
  }

  // ── Auto mode: OpenAI → Gemini → local mock ───────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await processWithOpenAI(request, cartItemCount);
      // processWithOpenAI returns local mock on quota errors, so this always resolves
      return result;
    } catch {
      // Unexpected — fall through to Gemini
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await processWithGemini(request);
      console.log(`[AI] Gemini ✓ action=${result.action}`);
      return result;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      console.warn(`[AI] Gemini error ${status ?? "unknown"} — falling back to local mock`);
    }
  }

  return localMockEngine(request.utterance, cartItemCount);
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI PROVIDER (extracted from original processAIOrder)
// ─────────────────────────────────────────────────────────────────────────────

async function processWithOpenAI(
  request: AIOrderRequest,
  cartItemCount: number
): Promise<AIOrderResponse> {
  let client: OpenAI;
  try {
    client = getOpenAIClient();
  } catch {
    return localMockEngine(request.utterance, cartItemCount);
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt() },
  ];

  const recentHistory = request.conversationHistory.slice(-10);
  for (const turn of recentHistory) {
    messages.push({ role: turn.role, content: turn.content });
  }

  const cartContext =
    request.currentCart.items.length === 0
      ? "The cart is currently empty."
      : `Current cart (${request.currentCart.items.length} items):\n` +
        request.currentCart.items
          .map((item) => `- ${item.name} x${item.quantity} (lineItemId: ${item.lineItemId})`)
          .join("\n");

  messages.push({ role: "system", content: `CURRENT CART STATE:\n${cartContext}` });
  messages.push({ role: "user", content: request.utterance });

  let completion: OpenAI.Chat.ChatCompletion;
  try {
    completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: TOOLS,
      tool_choice: "required",
      temperature: 0.3,
      max_tokens: 1024,
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 429 || status === 401 || status === 503 || status === 500) {
      console.warn(`[AI] OpenAI ${status} — falling back to local mock engine`);
      return localMockEngine(request.utterance, cartItemCount);
    }
    throw err;
  }

  const choice = completion.choices[0];
  const toolCall = choice?.message?.tool_calls?.[0];

  if (!toolCall) {
    return {
      action: "CLARIFY",
      aiNarration: "I'm sorry, I didn't quite understand that. Could you rephrase your order?",
      requiresClarification: true,
    };
  }

  const action = toolCall.function.name as AIAction;
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
  } catch {
    return { action: "CLARIFY", aiNarration: "I had trouble processing that. Please try again.", requiresClarification: true };
  }

  const response: AIOrderResponse = { action, aiNarration: (args.aiNarration as string) ?? "Done!" };
  if (action === "CART_ADD" || action === "CART_UPDATE_QUANTITY") {
    response.updatedCartItems = args.updatedCartItems as AIOrderResponse["updatedCartItems"];
  }
  if (action === "CART_REMOVE") response.removeLineItemIds = args.removeLineItemIds as string[];
  if (action === "NAVIGATE") {
    response.navigateTo = args.navigateTo as NavigationTarget;
    if (args.navigateItemId) response.navigateItemId = args.navigateItemId as string;
  }
  if (action === "CLARIFY") {
    response.requiresClarification = (args.requiresClarification as boolean) ?? false;
    if (args.clarificationPrompt) response.clarificationPrompt = args.clarificationPrompt as string;
  }
  if (action === "SHOW_OPTIONS") {
    const rawOptions = (args.menuOptions as Array<{ menuItemId: string }>) ?? [];
    response.menuOptions = rawOptions.map((o) => {
      const item = THE_BISTRO.menuItems.find((m) => m.id === o.menuItemId);
      if (!item) return null;
      return {
        menuItemId: item.id,
        name: item.name,
        description: item.description,
        basePrice: item.basePrice,
        imageUrl: item.imageUrl,
        dietaryTags: item.dietaryTags as string[],
        rating: item.rating,
        hasCustomizations: item.customizationGroups.length > 0,
      };
    }).filter(Boolean) as AIOrderResponse["menuOptions"];
    response.optionCategory = args.optionCategory as string;
  }
  console.log(`[AI] OpenAI ✓ action=${response.action}`);
  return response;
}
