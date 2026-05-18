/**
 * /shared/types.ts
 * Single-source TypeScript contracts shared between the mobile app and API server.
 * All domain models, API request/response shapes, and AI engine payloads live here.
 *
 * Import path alias in mobile-app:  @shared/types
 * Import path alias in api-server:  ../../shared/types  (or @shared/types via tsconfig paths)
 */

// ─────────────────────────────────────────────────────────────────────────────
// MENU DOMAIN
// ─────────────────────────────────────────────────────────────────────────────

export type DietaryTag =
  | "vegan"
  | "vegetarian"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "spicy"
  | "popular"
  | "new"
  | "featured";

export type CustomizationOptionType = "single" | "multi";

export interface CustomizationOption {
  id: string;
  label: string;
  /** Price delta in cents (0 or positive) */
  priceDelta: number;
  isDefault?: boolean;
}

export interface CustomizationGroup {
  id: string;
  label: string;
  type: CustomizationOptionType;
  /** Minimum number of selections required (0 = optional) */
  minSelections: number;
  /** Maximum number of selections allowed */
  maxSelections: number;
  options: CustomizationOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  /** Base price in cents */
  basePrice: number;
  imageUrl: string;
  categoryId: string;
  dietaryTags: DietaryTag[];
  customizationGroups: CustomizationGroup[];
  /** Estimated calories */
  calories?: number;
  isAvailable: boolean;
  /** Average rating 0–5 */
  rating: number;
  /** Number of ratings */
  reviewCount: number;
}

export interface MenuCategory {
  id: string;
  label: string;
  /** Expo Symbols / SF Symbol name for the category badge icon */
  iconName: string;
  /** Hex color for the category badge background */
  badgeColor: string;
  sortOrder: number;
}

export interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  logoUrl: string;
  heroImageUrl: string;
  /** Average rating 0–5 */
  rating: number;
  reviewCount: number;
  /** Estimated delivery time range, e.g. "15-25 min" */
  deliveryTimeRange: string;
  /** Delivery fee in cents */
  deliveryFee: number;
  /** Minimum order amount in cents */
  minimumOrder: number;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  isOpen: boolean;
  address: string;
  cuisineTypes: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CART DOMAIN
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectedCustomization {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  /** Price delta in cents */
  priceDelta: number;
}

export interface CartItem {
  /** Unique line-item ID (uuid v4) */
  lineItemId: string;
  menuItemId: string;
  name: string;
  /** Base price in cents */
  basePrice: number;
  quantity: number;
  selectedCustomizations: SelectedCustomization[];
  /** Computed: basePrice + sum(priceDelta) per unit, in cents */
  unitPrice: number;
  /** Computed: unitPrice * quantity, in cents */
  lineTotal: number;
  specialInstructions?: string;
}

/** Tip preset values in cents, or "custom" for a user-entered amount */
export type TipPreset = 100 | 200 | 300 | "custom";

export interface Cart {
  restaurantId: string;
  items: CartItem[];
  /** Selected tip amount in cents */
  tipAmount: number;
  /** Applied promo code string */
  promoCode?: string;
  /** Discount amount in cents */
  promoDiscount: number;
}

export interface CartPricingBreakdown {
  /** Sum of all line totals, in cents */
  subtotal: number;
  /** Platform service fee in cents */
  serviceFee: number;
  /** Delivery fee in cents */
  deliveryFee: number;
  /** Calculated local tax in cents */
  tax: number;
  /** Driver tip in cents */
  tipAmount: number;
  /** Promo discount in cents (negative impact on total) */
  promoDiscount: number;
  /** Grand total in cents */
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH DOMAIN
// ─────────────────────────────────────────────────────────────────────────────

export type AuthMethod = "email" | "phone";

export interface CountryCode {
  name: string;
  /** ISO 3166-1 alpha-2 country code */
  code: string;
  dialCode: string;
  /** Unicode flag emoji */
  flag: string;
  /** E.164 phone mask pattern, e.g. "(###) ###-####" */
  phoneMask: string;
}

export interface LoginRequest {
  method: AuthMethod;
  email?: string;
  phone?: string;
  countryDialCode?: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  displayName: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI ORDERING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export type AIAction =
  | "CART_ADD"
  | "CART_REMOVE"
  | "CART_UPDATE_QUANTITY"
  | "CART_CLEAR"
  | "CART_APPLY_PROMO"
  | "NAVIGATE"
  | "CLARIFY"
  | "SHOW_OPTIONS";

export type NavigationTarget =
  | "home"
  | "cart"
  | "menu"
  | "item-detail"
  | "checkout";

export interface AICartItemInstruction {
  menuItemId: string;
  quantity: number;
  /** Map of customizationGroupId → optionId */
  selectedCustomizations: Record<string, string>;
  specialInstructions?: string;
}

/** A single option card shown in the chat for the user to pick from */
export interface AIMenuOption {
  menuItemId: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl: string;
  dietaryTags: string[];
  rating: number;
  hasCustomizations: boolean;
}

export interface AIOrderResponse {
  action: AIAction;
  /** Present for CART_ADD / CART_UPDATE_QUANTITY */
  updatedCartItems?: AICartItemInstruction[];
  /** Present for CART_REMOVE — line item IDs to remove */
  removeLineItemIds?: string[];
  /** Present for NAVIGATE */
  navigateTo?: NavigationTarget;
  /** Present for NAVIGATE to item-detail */
  navigateItemId?: string;
  /** Human-readable narration to display / speak to the user */
  aiNarration: string;
  /** True when the AI needs more info before acting */
  requiresClarification?: boolean;
  /** Follow-up question when requiresClarification is true */
  clarificationPrompt?: string;
  /** Present for SHOW_OPTIONS — list of items to display as cards */
  menuOptions?: AIMenuOption[];
  /** Category context for SHOW_OPTIONS (e.g. "pizza", "burgers") */
  optionCategory?: string;
}

export interface AIConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** If this turn contains interactive option cards */
  menuOptions?: AIMenuOption[];
  optionCategory?: string;
  /** Quick-add suggestion chips shown after item is added */
  addOnSuggestions?: Array<{ label: string; message: string }>;
  /** If true, renders an order summary card with place-order CTA */
  showOrderSummary?: boolean;
}

export interface AIOrderRequest {
  /** The user's raw natural language utterance */
  utterance: string;
  /** Current cart state so the LLM can perform delta operations */
  currentCart: Cart;
  /** Restaurant context so the LLM knows what's on the menu */
  restaurantId: string;
  /** Conversation history for multi-turn context (last N turns) */
  conversationHistory: AIConversationTurn[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────────────────────
// PROMO / DEALS
// ─────────────────────────────────────────────────────────────────────────────

export type PromoType = "percentage" | "flat" | "free_delivery" | "bogo";

export interface PromoCode {
  code: string;
  type: PromoType;
  /** Percentage (0–100) or flat amount in cents */
  value: number;
  description: string;
  /** Minimum order subtotal in cents to qualify */
  minimumOrderAmount: number;
  expiresAt: string;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY / ORDER
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface DeliveryAddress {
  street: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  instructions?: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: CartItem[];
  pricing: CartPricingBreakdown;
  status: OrderStatus;
  deliveryAddress: DeliveryAddress;
  estimatedDeliveryTime: string;
  placedAt: string;
  updatedAt: string;
}
