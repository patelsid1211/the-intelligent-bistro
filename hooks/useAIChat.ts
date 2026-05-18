/**
 * hooks/useAIChat.ts
 * Shared AI chat logic — used by both the full AI Chat screen and the
 * floating AIBubble mini panel.
 */

import { useAI, useBistroStore, useCart } from "@/store";
import { sendAIOrder } from "@/store/apiClient";
import { mockAIEngine } from "@/utils/ai";
import type { AIOrderResponse } from "@shared/types";
import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";

const ROUTE_MAP: Record<string, string> = {
  cart:     "/(tabs)/cart",
  home:     "/(tabs)",
  menu:     "/(tabs)",
  checkout: "/(tabs)/cart",
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD-ON SUGGESTIONS — shown after item is added to cart
// ─────────────────────────────────────────────────────────────────────────────

const ADD_ON_MAP: Record<string, Array<{ label: string; message: string }>> = {
  burgers:  [
    { label: "🍟 Add Fries",         message: "add fries" },
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🍰 Add Dessert",       message: "show me desserts" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  pizza:    [
    { label: "🥗 Add a Salad",       message: "show me salads" },
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🍰 Add Dessert",       message: "show me desserts" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  sushi:    [
    { label: "🍣 Add More Rolls",    message: "show me sushi" },
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🍰 Add Dessert",       message: "show me desserts" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  tacos:    [
    { label: "🥑 Add Guacamole",     message: "add guacamole" },
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🍰 Add Dessert",       message: "show me desserts" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  bowls:    [
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🍰 Add Dessert",       message: "show me desserts" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  pasta:    [
    { label: "🥗 Add a Salad",       message: "show me salads" },
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🍰 Add Dessert",       message: "show me desserts" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  salads:   [
    { label: "🍕 Add a Pizza",       message: "show me pizza" },
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  desserts: [
    { label: "☕ Add a Coffee",      message: "add cold brew" },
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  drinks:   [
    { label: "🍔 Add a Burger",      message: "show me burgers" },
    { label: "🍕 Add a Pizza",       message: "show me pizza" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
  deals:    [
    { label: "🥤 Add a Drink",       message: "show me drinks" },
    { label: "🛒 Order Summary",     message: "show order summary" },
  ],
};

const DEFAULT_ADD_ONS = [
  { label: "🥤 Add a Drink",   message: "show me drinks" },
  { label: "🍰 Add Dessert",   message: "show me desserts" },
  { label: "🛒 Order Summary", message: "show order summary" },
];

function getAddOnSuggestions(menuItemIds: string[]) {
  const store = useBistroStore.getState();
  // Find the category of the first added item
  const firstItem = store.menuItemMap.get(menuItemIds[0]);
  if (!firstItem) return DEFAULT_ADD_ONS;
  return ADD_ON_MAP[firstItem.categoryId] ?? DEFAULT_ADD_ONS;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

interface UseAIChatOptions {
  onResponse?: () => void;
  onNavigate?: () => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { onResponse, onNavigate } = options;
  const router = useRouter();

  const {
    conversationHistory,
    isProcessing,
    addConversationTurn,
    setProcessing,
    applyAIResponse,
  } = useAI();

  const { cart } = useCart();
  const abortRef = useRef<AbortController | null>(null);
  const cartItemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  const handleResponse = useCallback(
    (response: AIOrderResponse) => {
      // Apply cart mutations
      if (["CART_ADD", "CART_REMOVE", "CART_CLEAR", "CART_UPDATE_QUANTITY"].includes(response.action)) {
        applyAIResponse(response);
      }

      // Determine add-on suggestions for CART_ADD
      const isCartAdd = response.action === "CART_ADD" || response.action === "CART_UPDATE_QUANTITY";
      const addedIds = isCartAdd
        ? (response.updatedCartItems ?? []).map((i) => i.menuItemId)
        : [];
      const addOnSuggestions = addedIds.length > 0 ? getAddOnSuggestions(addedIds) : undefined;

      // Detect order summary request
      const isOrderSummary = response.action === "NAVIGATE" && response.navigateTo === "cart";

      addConversationTurn({
        role: "assistant",
        content: response.aiNarration,
        timestamp: Date.now(),
        menuOptions: response.action === "SHOW_OPTIONS" ? response.menuOptions : undefined,
        optionCategory: response.optionCategory,
        addOnSuggestions,
        showOrderSummary: isOrderSummary,
      });

      setProcessing(false);
      onResponse?.();

      // Handle navigation — but NOT for cart (we show summary inline instead)
      if (response.action === "NAVIGATE" && response.navigateTo && response.navigateTo !== "cart") {
        const route =
          response.navigateTo === "item-detail" && response.navigateItemId
            ? `/item/${response.navigateItemId}`
            : (ROUTE_MAP[response.navigateTo] ?? "/(tabs)");
        onNavigate?.();
        setTimeout(() => router.push(route as any), onNavigate ? 300 : 0);
      }
    },
    [applyAIResponse, addConversationTurn, setProcessing, onResponse, onNavigate, router]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      addConversationTurn({ role: "user", content: trimmed, timestamp: Date.now() });
      setProcessing(true);
      onResponse?.();

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      let response: AIOrderResponse;
      try {
        const apiResult = await sendAIOrder(
          {
            utterance: trimmed,
            currentCart: cart,
            restaurantId: cart.restaurantId,
            conversationHistory: conversationHistory.slice(-10),
          },
          abortRef.current.signal
        );

        if (apiResult === null) {
          response = mockAIEngine(trimmed, cartItemCount);
        } else if (!apiResult.success) {
          response = { action: "CLARIFY", aiNarration: "I ran into an issue. Please try again.", requiresClarification: false };
        } else {
          response = apiResult.data;
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setProcessing(false);
          return;
        }
        response = mockAIEngine(trimmed, cartItemCount);
      }

      handleResponse(response);
    },
    [isProcessing, cartItemCount, cart, conversationHistory, addConversationTurn, setProcessing, handleResponse, onResponse]
  );

  return { sendMessage, isProcessing, conversationHistory };
}
