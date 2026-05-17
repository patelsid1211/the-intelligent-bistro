/**
 * hooks/useAIChat.ts
 * Shared AI chat logic — used by both the full AI Chat screen and the
 * floating AIBubble mini panel.
 *
 * Handles:
 * - Sending messages to the API (with AbortController)
 * - Falling back to the local mock engine on network failure
 * - Applying AI responses to the cart store
 * - Adding conversation turns
 * - Navigation commands
 */

import { THE_BISTRO } from "@/data/menu";
import { useAI, useCart } from "@/store";
import { sendAIOrder } from "@/store/apiClient";
import { mockAIEngine } from "@/utils/ai";
import type { AIOrderResponse } from "@shared/types";
import { useRouter } from "expo-router";
import { useCallback, useRef } from "react";

const ROUTE_MAP: Record<string, string> = {
  cart:        "/(tabs)/cart",
  home:        "/(tabs)",
  menu:        "/(tabs)",
  checkout:    "/(tabs)/cart",
};

interface UseAIChatOptions {
  /** Called after each response is processed (e.g. scroll to bottom). */
  onResponse?: () => void;
  /** Called when a NAVIGATE action fires (e.g. close the mini panel). */
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

  /** Apply a resolved AI response to the store and trigger side effects. */
  const handleResponse = useCallback(
    (response: AIOrderResponse) => {
      // Apply cart mutations
      if (
        ["CART_ADD", "CART_REMOVE", "CART_CLEAR", "CART_UPDATE_QUANTITY"].includes(
          response.action
        )
      ) {
        applyAIResponse(response);
      }

      // Add assistant turn (with optional option cards)
      addConversationTurn({
        role: "assistant",
        content: response.aiNarration,
        timestamp: Date.now(),
        menuOptions:
          response.action === "SHOW_OPTIONS" ? response.menuOptions : undefined,
        optionCategory: response.optionCategory,
      });

      setProcessing(false);
      onResponse?.();

      // Handle navigation
      if (response.action === "NAVIGATE" && response.navigateTo) {
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

  /** Send a user message, call the API, fall back to mock on failure. */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      // Add user turn immediately
      addConversationTurn({ role: "user", content: trimmed, timestamp: Date.now() });
      setProcessing(true);
      onResponse?.();

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      let response: AIOrderResponse;
      try {
        const apiResult = await sendAIOrder(
          {
            utterance: trimmed,
            currentCart: cart,
            restaurantId: THE_BISTRO.id,
            conversationHistory: conversationHistory.slice(-10),
          },
          abortRef.current.signal
        );

        if (apiResult === null) {
          response = mockAIEngine(trimmed, cartItemCount);
        } else if (!apiResult.success) {
          response = {
            action: "CLARIFY",
            aiNarration: "I ran into an issue. Please try again.",
            requiresClarification: false,
          };
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
    [
      isProcessing,
      cartItemCount,
      cart,
      conversationHistory,
      addConversationTurn,
      setProcessing,
      handleResponse,
      onResponse,
    ]
  );

  return {
    sendMessage,
    isProcessing,
    conversationHistory,
  };
}
