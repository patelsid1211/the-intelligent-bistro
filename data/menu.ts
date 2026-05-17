/**
 * data/menu.ts
 * Clean re-export of menu data for the mobile app.
 *
 * Avoids importing directly from api-server internals throughout the app.
 * All screens should import from "@/data/menu" instead of
 * "@/api-server/src/data/menuData".
 */

export {
    MENU_CATEGORIES,
    MENU_ITEM_MAP,
    THE_BISTRO, computePromoDiscount,
    getItemsByCategory, validatePromoCode
} from "@/api-server/src/data/menuData";

