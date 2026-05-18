/**
 * store/index.ts
 * Zustand state machine for The Intelligent Bistro.
 * Single source of truth for auth, cart, UI, and AI conversation state.
 */

import { MENU_CATEGORIES as FALLBACK_CATEGORIES, THE_BISTRO } from "@/data/menu";
import type {
  AIConversationTurn,
  AIOrderResponse,
  AuthUser,
  Cart,
  CartItem,
  CartPricingBreakdown,
  MenuCategory,
  MenuItem,
  SelectedCustomization,
} from "@shared/types";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useShallow } from "zustand/shallow";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

async function _fetchCategories(): Promise<MenuCategory[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/categories`);
    const json = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

async function _fetchProducts(): Promise<MenuItem[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/products?limit=100`);
    const json = await res.json();
    return json.success ? json.data.products : null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_FEE_RATE = 0.05; // 5%
const TAX_RATE = 0.0875; // 8.75% (SF local tax)

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateLineItemId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function computeUnitPrice(
  basePrice: number,
  customizations: SelectedCustomization[]
): number {
  return (
    basePrice +
    customizations.reduce((sum, c) => sum + c.priceDelta, 0)
  );
}

function computePricing(cart: Cart): CartPricingBreakdown {
  const subtotal = cart.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const deliveryFee =
    cart.promoCode && cart.promoDiscount >= THE_BISTRO.deliveryFee
      ? 0
      : THE_BISTRO.deliveryFee;
  const tax = Math.round(subtotal * TAX_RATE);
  const total =
    subtotal +
    serviceFee +
    deliveryFee +
    tax +
    cart.tipAmount -
    cart.promoDiscount;

  return {
    subtotal,
    serviceFee,
    deliveryFee,
    tax,
    tipAmount: cart.tipAmount,
    promoDiscount: cart.promoDiscount,
    total: Math.max(0, total),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

interface CartState {
  cart: Cart;
  pricing: CartPricingBreakdown;
  /** IDs of line items that were just added/updated — used for highlight animation */
  recentlyUpdatedLineItemIds: string[];
}

interface AIState {
  conversationHistory: AIConversationTurn[];
  isChatOpen: boolean;
  isProcessing: boolean;
  lastAIResponse: AIOrderResponse | null;
}

interface UIState {
  activeCategoryId: string;
  isCartSheetOpen: boolean;
  isCustomizationSheetOpen: boolean;
  customizationItemId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU STATE
// ─────────────────────────────────────────────────────────────────────────────

interface MenuState {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  menuItemMap: Map<string, MenuItem>;
  isMenuLoaded: boolean;
  isMenuLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface AuthActions {
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
}

interface CartActions {
  addItem: (
    menuItemId: string,
    quantity: number,
    selectedCustomizations: SelectedCustomization[],
    specialInstructions?: string
  ) => void;
  removeItem: (lineItemId: string) => void;
  updateQuantity: (lineItemId: string, quantity: number) => void;
  clearCart: () => void;
  setTip: (amount: number) => void;
  applyPromo: (code: string, discountCents: number) => void;
  removePromo: () => void;
  /** Called by the AI engine to apply a batch of delta operations */
  applyAIResponse: (response: AIOrderResponse) => void;
  clearRecentlyUpdated: () => void;
}

interface AIActions {
  addConversationTurn: (turn: AIConversationTurn) => void;
  setProcessing: (processing: boolean) => void;
  setLastAIResponse: (response: AIOrderResponse | null) => void;
  openChat: () => void;
  closeChat: () => void;
  clearConversation: () => void;
}

interface UIActions {
  setActiveCategory: (categoryId: string) => void;
  openCartSheet: () => void;
  closeCartSheet: () => void;
  openCustomizationSheet: (itemId: string) => void;
  closeCustomizationSheet: () => void;
}

interface MenuActions {
  loadMenu: () => Promise<void>;
}

type BistroStore = AuthState &
  CartState &
  AIState &
  UIState &
  MenuState &
  AuthActions &
  CartActions &
  AIActions &
  UIActions &
  MenuActions;

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_CART: Cart = {
  restaurantId: THE_BISTRO.id,
  items: [],
  tipAmount: 0,
  promoCode: undefined,
  promoDiscount: 0,
};

const EMPTY_PRICING: CartPricingBreakdown = {
  subtotal: 0,
  serviceFee: 0,
  deliveryFee: THE_BISTRO.deliveryFee,
  tax: 0,
  tipAmount: 0,
  promoDiscount: 0,
  total: THE_BISTRO.deliveryFee,
};

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useBistroStore = create<BistroStore>()(
  subscribeWithSelector((set, get) => ({
    // ── Auth ──────────────────────────────────────────────────────────────────
    user: null,
    accessToken: null,
    isAuthenticated: false,

    setAuth: (user, accessToken) =>
      set({ user, accessToken, isAuthenticated: true }),

    clearAuth: () =>
      set({ user: null, accessToken: null, isAuthenticated: false }),

    // ── Cart ──────────────────────────────────────────────────────────────────
    cart: EMPTY_CART,
    pricing: EMPTY_PRICING,
    recentlyUpdatedLineItemIds: [],

    addItem: (menuItemId, quantity, selectedCustomizations, specialInstructions) => {
      const state = get();
      const menuItem = state.menuItemMap.get(menuItemId)
        ?? THE_BISTRO.menuItems.find((m) => m.id === menuItemId);
      if (!menuItem) return;

      const unitPrice = computeUnitPrice(menuItem.basePrice, selectedCustomizations);
      const lineItemId = generateLineItemId();

      const newItem: CartItem = {
        lineItemId,
        menuItemId,
        name: menuItem.name,
        basePrice: menuItem.basePrice,
        quantity,
        selectedCustomizations,
        unitPrice,
        lineTotal: unitPrice * quantity,
        specialInstructions,
      };

      set((state) => {
        const updatedItems = [...state.cart.items, newItem];
        const updatedCart = { ...state.cart, items: updatedItems };
        return {
          cart: updatedCart,
          pricing: computePricing(updatedCart),
          recentlyUpdatedLineItemIds: [lineItemId],
        };
      });
    },

    removeItem: (lineItemId) => {
      set((state) => {
        const updatedItems = state.cart.items.filter(
          (i) => i.lineItemId !== lineItemId
        );
        const updatedCart = { ...state.cart, items: updatedItems };
        return {
          cart: updatedCart,
          pricing: computePricing(updatedCart),
          recentlyUpdatedLineItemIds: [],
        };
      });
    },

    updateQuantity: (lineItemId, quantity) => {
      if (quantity <= 0) {
        get().removeItem(lineItemId);
        return;
      }
      set((state) => {
        const updatedItems = state.cart.items.map((item) =>
          item.lineItemId === lineItemId
            ? { ...item, quantity, lineTotal: item.unitPrice * quantity }
            : item
        );
        const updatedCart = { ...state.cart, items: updatedItems };
        return {
          cart: updatedCart,
          pricing: computePricing(updatedCart),
          recentlyUpdatedLineItemIds: [lineItemId],
        };
      });
    },

    clearCart: () =>
      set({
        cart: EMPTY_CART,
        pricing: EMPTY_PRICING,
        recentlyUpdatedLineItemIds: [],
      }),

    setTip: (amount) => {
      set((state) => {
        const updatedCart = { ...state.cart, tipAmount: amount };
        return { cart: updatedCart, pricing: computePricing(updatedCart) };
      });
    },

    applyPromo: (code, discountCents) => {
      set((state) => {
        const updatedCart = {
          ...state.cart,
          promoCode: code,
          promoDiscount: discountCents,
        };
        return { cart: updatedCart, pricing: computePricing(updatedCart) };
      });
    },

    removePromo: () => {
      set((state) => {
        const updatedCart = {
          ...state.cart,
          promoCode: undefined,
          promoDiscount: 0,
        };
        return { cart: updatedCart, pricing: computePricing(updatedCart) };
      });
    },

    applyAIResponse: (response) => {
      const store = get();
      const updatedIds: string[] = [];

      if (response.action === "CART_CLEAR") {
        store.clearCart();
        return;
      }

      if (
        response.action === "CART_ADD" ||
        response.action === "CART_UPDATE_QUANTITY"
      ) {
        response.updatedCartItems?.forEach((instruction) => {
          const menuItem = store.menuItemMap.get(instruction.menuItemId)
            ?? THE_BISTRO.menuItems.find((m) => m.id === instruction.menuItemId);
          if (!menuItem) return;

          // Build SelectedCustomization array from the instruction map
          const selectedCustomizations: SelectedCustomization[] = [];
          for (const [groupId, optionId] of Object.entries(
            instruction.selectedCustomizations
          )) {
            const group = menuItem.customizationGroups.find(
              (g) => g.id === groupId
            );
            const option = group?.options.find((o) => o.id === optionId);
            if (group && option) {
              selectedCustomizations.push({
                groupId,
                groupLabel: group.label,
                optionId: optionId as string,
                optionLabel: option.label,
                priceDelta: option.priceDelta,
              });
            }
          }

          const unitPrice = computeUnitPrice(
            menuItem.basePrice,
            selectedCustomizations
          );
          const lineItemId = generateLineItemId();
          updatedIds.push(lineItemId);

          const newItem: CartItem = {
            lineItemId,
            menuItemId: instruction.menuItemId,
            name: menuItem.name,
            basePrice: menuItem.basePrice,
            quantity: instruction.quantity,
            selectedCustomizations,
            unitPrice,
            lineTotal: unitPrice * instruction.quantity,
            specialInstructions: instruction.specialInstructions,
          };

          set((state) => {
            const updatedItems = [...state.cart.items, newItem];
            const updatedCart = { ...state.cart, items: updatedItems };
            return {
              cart: updatedCart,
              pricing: computePricing(updatedCart),
            };
          });
        });
      }

      if (response.action === "CART_REMOVE" && response.removeLineItemIds) {
        response.removeLineItemIds.forEach((id) => store.removeItem(id));
      }

      set({ recentlyUpdatedLineItemIds: updatedIds, lastAIResponse: response });
    },

    clearRecentlyUpdated: () => set({ recentlyUpdatedLineItemIds: [] }),

    // ── AI ────────────────────────────────────────────────────────────────────
    conversationHistory: [],
    isChatOpen: false,
    isProcessing: false,
    lastAIResponse: null,

    addConversationTurn: (turn) =>
      set((state) => ({
        conversationHistory: [
          ...state.conversationHistory.slice(-49), // keep last 50 turns
          turn,
        ],
      })),

    setProcessing: (processing) => set({ isProcessing: processing }),

    setLastAIResponse: (response) => set({ lastAIResponse: response }),

    openChat: () => set({ isChatOpen: true }),
    closeChat: () => set({ isChatOpen: false }),

    clearConversation: () =>
      set({ conversationHistory: [], lastAIResponse: null }),

    // ── UI ────────────────────────────────────────────────────────────────────
    activeCategoryId: "deals",
    isCartSheetOpen: false,
    isCustomizationSheetOpen: false,
    customizationItemId: null,

    setActiveCategory: (categoryId) => set({ activeCategoryId: categoryId }),
    openCartSheet: () => set({ isCartSheetOpen: true }),
    closeCartSheet: () => set({ isCartSheetOpen: false }),
    openCustomizationSheet: (itemId) =>
      set({ isCustomizationSheetOpen: true, customizationItemId: itemId }),
    closeCustomizationSheet: () =>
      set({ isCustomizationSheetOpen: false, customizationItemId: null }),

    // ── Menu ──────────────────────────────────────────────────────────────────
    categories: FALLBACK_CATEGORIES,
    menuItems: THE_BISTRO.menuItems,
    menuItemMap: new Map(THE_BISTRO.menuItems.map((m) => [m.id, m])),
    isMenuLoaded: false,
    isMenuLoading: false,

    loadMenu: async () => {
      const state = get();
      if (state.isMenuLoaded || state.isMenuLoading) return;
      set({ isMenuLoading: true });
      try {
        const [categories, products] = await Promise.all([
          _fetchCategories(),
          _fetchProducts(),
        ]);
        if (categories && products) {
          const itemMap = new Map(products.map((m) => [m.id, m]));
          set({
            categories,
            menuItems: products,
            menuItemMap: itemMap,
            isMenuLoaded: true,
          });
        }
      } catch {
        // silently fall back to hardcoded data
      } finally {
        set({ isMenuLoading: false });
      }
    },
  }))
);

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR HOOKS — shallow equality prevents infinite re-render loops
// ─────────────────────────────────────────────────────────────────────────────

export const useAuth = () =>
  useBistroStore(
    useShallow((s) => ({
      user: s.user,
      isAuthenticated: s.isAuthenticated,
      setAuth: s.setAuth,
      clearAuth: s.clearAuth,
    }))
  );

export const useCart = () =>
  useBistroStore(
    useShallow((s) => ({
      cart: s.cart,
      pricing: s.pricing,
      recentlyUpdatedLineItemIds: s.recentlyUpdatedLineItemIds,
      addItem: s.addItem,
      removeItem: s.removeItem,
      updateQuantity: s.updateQuantity,
      clearCart: s.clearCart,
      setTip: s.setTip,
      applyPromo: s.applyPromo,
      removePromo: s.removePromo,
      clearRecentlyUpdated: s.clearRecentlyUpdated,
    }))
  );

export const useAI = () =>
  useBistroStore(
    useShallow((s) => ({
      conversationHistory: s.conversationHistory,
      isChatOpen: s.isChatOpen,
      isProcessing: s.isProcessing,
      lastAIResponse: s.lastAIResponse,
      addConversationTurn: s.addConversationTurn,
      setProcessing: s.setProcessing,
      setLastAIResponse: s.setLastAIResponse,
      openChat: s.openChat,
      closeChat: s.closeChat,
      clearConversation: s.clearConversation,
      applyAIResponse: s.applyAIResponse,
    }))
  );

export const useUI = () =>
  useBistroStore(
    useShallow((s) => ({
      activeCategoryId: s.activeCategoryId,
      isCartSheetOpen: s.isCartSheetOpen,
      isCustomizationSheetOpen: s.isCustomizationSheetOpen,
      customizationItemId: s.customizationItemId,
      setActiveCategory: s.setActiveCategory,
      openCartSheet: s.openCartSheet,
      closeCartSheet: s.closeCartSheet,
      openCustomizationSheet: s.openCustomizationSheet,
      closeCustomizationSheet: s.closeCustomizationSheet,
    }))
  );

/** Derived: total item count in cart */
export const useCartItemCount = () =>
  useBistroStore((s) =>
    s.cart.items.reduce((sum, item) => sum + item.quantity, 0)
  );

export const useMenu = () =>
  useBistroStore(
    useShallow((s) => ({
      categories: s.categories,
      menuItems: s.menuItems,
      menuItemMap: s.menuItemMap,
      isMenuLoaded: s.isMenuLoaded,
      isMenuLoading: s.isMenuLoading,
      loadMenu: s.loadMenu,
    }))
  );
