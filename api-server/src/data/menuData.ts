/**
 * /api-server/src/data/menuData.ts
 * Complete static menu dictionary for The Intelligent Bistro.
 * All prices are in cents. All IDs are stable slugs.
 */

import type {
    CustomizationGroup,
    MenuCategory,
    MenuItem,
    PromoCode,
    Restaurant,
} from "../../../shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CUSTOMIZATION GROUPS (reused across items)
// ─────────────────────────────────────────────────────────────────────────────

const SIZE_GROUP: CustomizationGroup = {
  id: "size",
  label: "Choose a Size",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "size-regular", label: "Regular", priceDelta: 0, isDefault: true },
    { id: "size-large", label: "Large", priceDelta: 150 },
    { id: "size-xl", label: "XL", priceDelta: 300 },
  ],
};

const DRINK_SIZE_GROUP: CustomizationGroup = {
  id: "drink-size",
  label: "Choose a Size",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "drink-sm", label: "Small (12 oz)", priceDelta: 0, isDefault: true },
    { id: "drink-md", label: "Medium (16 oz)", priceDelta: 50 },
    { id: "drink-lg", label: "Large (22 oz)", priceDelta: 100 },
  ],
};

const BURGER_PATTY_GROUP: CustomizationGroup = {
  id: "burger-patty",
  label: "Choose Your Patty",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "patty-single", label: "Single", priceDelta: 0, isDefault: true },
    { id: "patty-double", label: "Double", priceDelta: 200 },
    { id: "patty-triple", label: "Triple", priceDelta: 400 },
    { id: "patty-plant", label: "Plant-Based", priceDelta: 150 },
  ],
};

const BURGER_TOPPINGS_GROUP: CustomizationGroup = {
  id: "burger-toppings",
  label: "Add Toppings",
  type: "multi",
  minSelections: 0,
  maxSelections: 8,
  options: [
    { id: "top-lettuce", label: "Lettuce", priceDelta: 0, isDefault: true },
    { id: "top-tomato", label: "Tomato", priceDelta: 0, isDefault: true },
    { id: "top-onion", label: "Onion", priceDelta: 0, isDefault: true },
    { id: "top-pickles", label: "Pickles", priceDelta: 0, isDefault: true },
    { id: "top-jalapeno", label: "Jalapeños", priceDelta: 50 },
    { id: "top-avocado", label: "Avocado", priceDelta: 150 },
    { id: "top-bacon", label: "Crispy Bacon", priceDelta: 175 },
    { id: "top-egg", label: "Fried Egg", priceDelta: 125 },
    { id: "top-mushroom", label: "Sautéed Mushrooms", priceDelta: 100 },
    { id: "top-caramelized-onion", label: "Caramelized Onions", priceDelta: 75 },
  ],
};

const BURGER_CHEESE_GROUP: CustomizationGroup = {
  id: "burger-cheese",
  label: "Choose Cheese",
  type: "single",
  minSelections: 0,
  maxSelections: 1,
  options: [
    { id: "cheese-none", label: "No Cheese", priceDelta: 0, isDefault: true },
    { id: "cheese-american", label: "American", priceDelta: 75 },
    { id: "cheese-cheddar", label: "Sharp Cheddar", priceDelta: 75 },
    { id: "cheese-swiss", label: "Swiss", priceDelta: 75 },
    { id: "cheese-pepper-jack", label: "Pepper Jack", priceDelta: 75 },
    { id: "cheese-brie", label: "Brie", priceDelta: 150 },
  ],
};

const BURGER_SAUCE_GROUP: CustomizationGroup = {
  id: "burger-sauce",
  label: "Choose Sauce",
  type: "multi",
  minSelections: 1,
  maxSelections: 3,
  options: [
    { id: "sauce-ketchup", label: "Ketchup", priceDelta: 0, isDefault: true },
    { id: "sauce-mustard", label: "Mustard", priceDelta: 0 },
    { id: "sauce-mayo", label: "Mayo", priceDelta: 0 },
    { id: "sauce-bistro", label: "Bistro Special Sauce", priceDelta: 0 },
    { id: "sauce-sriracha", label: "Sriracha Aioli", priceDelta: 50 },
    { id: "sauce-bbq", label: "Smoky BBQ", priceDelta: 0 },
    { id: "sauce-truffle", label: "Truffle Mayo", priceDelta: 100 },
  ],
};

const PIZZA_SIZE_GROUP: CustomizationGroup = {
  id: "pizza-size",
  label: "Choose a Size",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "pizza-10", label: '10" Personal', priceDelta: 0, isDefault: true },
    { id: "pizza-12", label: '12" Small', priceDelta: 300 },
    { id: "pizza-14", label: '14" Medium', priceDelta: 600 },
    { id: "pizza-16", label: '16" Large', priceDelta: 900 },
  ],
};

const PIZZA_CRUST_GROUP: CustomizationGroup = {
  id: "pizza-crust",
  label: "Choose Crust",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "crust-thin", label: "Thin & Crispy", priceDelta: 0, isDefault: true },
    { id: "crust-hand", label: "Hand-Tossed", priceDelta: 0 },
    { id: "crust-deep", label: "Deep Dish", priceDelta: 200 },
    { id: "crust-cauliflower", label: "Cauliflower (GF)", priceDelta: 300 },
  ],
};

const PIZZA_TOPPINGS_GROUP: CustomizationGroup = {
  id: "pizza-toppings",
  label: "Add Toppings",
  type: "multi",
  minSelections: 0,
  maxSelections: 10,
  options: [
    { id: "pt-pepperoni", label: "Pepperoni", priceDelta: 150 },
    { id: "pt-sausage", label: "Italian Sausage", priceDelta: 150 },
    { id: "pt-mushroom", label: "Mushrooms", priceDelta: 100 },
    { id: "pt-bell-pepper", label: "Bell Peppers", priceDelta: 100 },
    { id: "pt-onion", label: "Red Onion", priceDelta: 100 },
    { id: "pt-olive", label: "Black Olives", priceDelta: 100 },
    { id: "pt-spinach", label: "Baby Spinach", priceDelta: 100 },
    { id: "pt-artichoke", label: "Artichoke Hearts", priceDelta: 150 },
    { id: "pt-prosciutto", label: "Prosciutto", priceDelta: 250 },
    { id: "pt-truffle", label: "Truffle Oil Drizzle", priceDelta: 200 },
  ],
};

const SUSHI_ROLL_EXTRAS_GROUP: CustomizationGroup = {
  id: "sushi-extras",
  label: "Add Extras",
  type: "multi",
  minSelections: 0,
  maxSelections: 4,
  options: [
    { id: "se-extra-sauce", label: "Extra Sauce", priceDelta: 50 },
    { id: "se-spicy", label: "Make it Spicy", priceDelta: 0 },
    { id: "se-cucumber", label: "Extra Cucumber", priceDelta: 50 },
    { id: "se-avocado", label: "Extra Avocado", priceDelta: 150 },
    { id: "se-tempura", label: "Tempura Crunch", priceDelta: 100 },
  ],
};

const PROTEIN_CHOICE_GROUP: CustomizationGroup = {
  id: "protein-choice",
  label: "Choose Protein",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "prot-chicken", label: "Grilled Chicken", priceDelta: 0, isDefault: true },
    { id: "prot-steak", label: "Steak", priceDelta: 300 },
    { id: "prot-shrimp", label: "Shrimp", priceDelta: 250 },
    { id: "prot-tofu", label: "Crispy Tofu", priceDelta: 0 },
    { id: "prot-salmon", label: "Salmon", priceDelta: 350 },
  ],
};

const SPICE_LEVEL_GROUP: CustomizationGroup = {
  id: "spice-level",
  label: "Spice Level",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "spice-mild", label: "Mild", priceDelta: 0, isDefault: true },
    { id: "spice-medium", label: "Medium", priceDelta: 0 },
    { id: "spice-hot", label: "Hot", priceDelta: 0 },
    { id: "spice-extra-hot", label: "Extra Hot 🔥", priceDelta: 0 },
  ],
};

const SIDE_CHOICE_GROUP: CustomizationGroup = {
  id: "side-choice",
  label: "Choose a Side",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "side-fries", label: "Classic Fries", priceDelta: 0, isDefault: true },
    { id: "side-sweet-fries", label: "Sweet Potato Fries", priceDelta: 100 },
    { id: "side-salad", label: "Side Salad", priceDelta: 50 },
    { id: "side-onion-rings", label: "Onion Rings", priceDelta: 100 },
    { id: "side-coleslaw", label: "Coleslaw", priceDelta: 0 },
    { id: "side-fruit", label: "Fresh Fruit Cup", priceDelta: 75 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// MENU CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    id: "deals",
    label: "Deals",
    iconName: "tag.fill",
    badgeColor: "#FF3B30",
    sortOrder: 0,
  },
  {
    id: "burgers",
    label: "Burgers",
    iconName: "flame.fill",
    badgeColor: "#FF9500",
    sortOrder: 1,
  },
  {
    id: "pizza",
    label: "Pizza",
    iconName: "circle.grid.2x2.fill",
    badgeColor: "#FF6B35",
    sortOrder: 2,
  },
  {
    id: "sushi",
    label: "Sushi",
    iconName: "fish.fill",
    badgeColor: "#34C759",
    sortOrder: 3,
  },
  {
    id: "bowls",
    label: "Bowls",
    iconName: "leaf.fill",
    badgeColor: "#30D158",
    sortOrder: 4,
  },
  {
    id: "tacos",
    label: "Tacos",
    iconName: "fork.knife",
    badgeColor: "#FFCC00",
    sortOrder: 5,
  },
  {
    id: "pasta",
    label: "Pasta",
    iconName: "sparkles",
    badgeColor: "#AF52DE",
    sortOrder: 6,
  },
  {
    id: "salads",
    label: "Salads",
    iconName: "leaf.circle.fill",
    badgeColor: "#32ADE6",
    sortOrder: 7,
  },
  {
    id: "desserts",
    label: "Desserts",
    iconName: "birthday.cake.fill",
    badgeColor: "#FF2D55",
    sortOrder: 8,
  },
  {
    id: "drinks",
    label: "Drinks",
    iconName: "cup.and.saucer.fill",
    badgeColor: "#007AFF",
    sortOrder: 9,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — BURGERS
// ─────────────────────────────────────────────────────────────────────────────

const BURGER_ITEMS: MenuItem[] = [
  {
    id: "burger-01",
    name: "The Bistro Classic",
    description:
      "Our signature smash-patty burger on a toasted brioche bun with Bistro special sauce, crisp lettuce, vine-ripened tomato, and house pickles.",
    basePrice: 1299,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",
    categoryId: "burgers",
    dietaryTags: ["popular"],
    customizationGroups: [
      BURGER_PATTY_GROUP,
      BURGER_CHEESE_GROUP,
      BURGER_TOPPINGS_GROUP,
      BURGER_SAUCE_GROUP,
      SIDE_CHOICE_GROUP,
    ],
    calories: 720,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 2847,
  },
  {
    id: "burger-02",
    name: "Truffle Mushroom Melt",
    description:
      "Wagyu beef patty topped with sautéed wild mushrooms, truffle mayo, melted Swiss cheese, and caramelized onions on a pretzel bun.",
    basePrice: 1699,
    imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800",
    categoryId: "burgers",
    dietaryTags: ["featured"],
    customizationGroups: [
      BURGER_PATTY_GROUP,
      BURGER_CHEESE_GROUP,
      BURGER_TOPPINGS_GROUP,
      BURGER_SAUCE_GROUP,
      SIDE_CHOICE_GROUP,
    ],
    calories: 890,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 1203,
  },
  {
    id: "burger-03",
    name: "Spicy Crispy Chicken",
    description:
      "Hand-breaded crispy chicken thigh with Nashville hot sauce, dill pickle chips, and honey butter on a toasted potato bun.",
    basePrice: 1399,
    imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=800",
    categoryId: "burgers",
    dietaryTags: ["spicy", "popular"],
    customizationGroups: [
      SPICE_LEVEL_GROUP,
      BURGER_TOPPINGS_GROUP,
      BURGER_SAUCE_GROUP,
      SIDE_CHOICE_GROUP,
    ],
    calories: 810,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 987,
  },
  {
    id: "burger-04",
    name: "Garden Smash Burger",
    description:
      "Crispy smashed plant-based patty with vegan cheddar, shredded lettuce, tomato, pickled red onion, and chipotle aioli on a sesame bun.",
    basePrice: 1449,
    imageUrl: "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800",
    categoryId: "burgers",
    dietaryTags: ["vegan", "popular"],
    customizationGroups: [
      BURGER_TOPPINGS_GROUP,
      BURGER_SAUCE_GROUP,
      SIDE_CHOICE_GROUP,
    ],
    calories: 640,
    isAvailable: true,
    rating: 4.6,
    reviewCount: 654,
  },
  {
    id: "burger-05",
    name: "BBQ Bacon Stack",
    description:
      "Double smash patties, thick-cut applewood bacon, cheddar, crispy onion strings, and smoky BBQ sauce on a toasted brioche bun.",
    basePrice: 1799,
    imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800",
    categoryId: "burgers",
    dietaryTags: ["popular"],
    customizationGroups: [
      BURGER_PATTY_GROUP,
      BURGER_CHEESE_GROUP,
      BURGER_TOPPINGS_GROUP,
      BURGER_SAUCE_GROUP,
      SIDE_CHOICE_GROUP,
    ],
    calories: 1050,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 1456,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — PIZZA
// ─────────────────────────────────────────────────────────────────────────────

const PIZZA_ITEMS: MenuItem[] = [
  {
    id: "pizza-01",
    name: "Margherita Classica",
    description:
      "San Marzano tomato sauce, fresh buffalo mozzarella, hand-torn basil, and a drizzle of extra-virgin olive oil on a wood-fired crust.",
    basePrice: 1599,
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
    categoryId: "pizza",
    dietaryTags: ["vegetarian", "popular"],
    customizationGroups: [PIZZA_SIZE_GROUP, PIZZA_CRUST_GROUP, PIZZA_TOPPINGS_GROUP],
    calories: 680,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 3102,
  },
  {
    id: "pizza-02",
    name: "Truffle Funghi",
    description:
      "White truffle cream base, wild mushroom medley, fontina cheese, fresh thyme, and a finishing drizzle of black truffle oil.",
    basePrice: 2199,
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
    categoryId: "pizza",
    dietaryTags: ["vegetarian", "featured"],
    customizationGroups: [PIZZA_SIZE_GROUP, PIZZA_CRUST_GROUP, PIZZA_TOPPINGS_GROUP],
    calories: 760,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 891,
  },
  {
    id: "pizza-03",
    name: "Spicy Diavola",
    description:
      "Spicy tomato sauce, Calabrian chili, spicy salami, fresh mozzarella, and honey drizzle for the perfect sweet-heat balance.",
    basePrice: 1899,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",
    categoryId: "pizza",
    dietaryTags: ["spicy", "popular"],
    customizationGroups: [PIZZA_SIZE_GROUP, PIZZA_CRUST_GROUP, PIZZA_TOPPINGS_GROUP, SPICE_LEVEL_GROUP],
    calories: 820,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 1234,
  },
  {
    id: "pizza-04",
    name: "BBQ Chicken Ranch",
    description:
      "Smoky BBQ sauce base, grilled chicken, red onion, corn, mozzarella, and a ranch drizzle. A crowd-pleaser every time.",
    basePrice: 1799,
    imageUrl: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800",
    categoryId: "pizza",
    dietaryTags: ["popular"],
    customizationGroups: [PIZZA_SIZE_GROUP, PIZZA_CRUST_GROUP, PIZZA_TOPPINGS_GROUP],
    calories: 790,
    isAvailable: true,
    rating: 4.6,
    reviewCount: 2011,
  },
  {
    id: "pizza-05",
    name: "Vegan Garden Harvest",
    description:
      "Roasted garlic olive oil base, seasonal roasted vegetables, vegan mozzarella, sun-dried tomatoes, and fresh arugula.",
    basePrice: 1699,
    imageUrl: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800",
    categoryId: "pizza",
    dietaryTags: ["vegan", "gluten-free"],
    customizationGroups: [PIZZA_SIZE_GROUP, PIZZA_CRUST_GROUP, PIZZA_TOPPINGS_GROUP],
    calories: 590,
    isAvailable: true,
    rating: 4.5,
    reviewCount: 445,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — SUSHI
// ─────────────────────────────────────────────────────────────────────────────

const SUSHI_ITEMS: MenuItem[] = [
  {
    id: "sushi-01",
    name: "Dragon Roll",
    description:
      "Shrimp tempura and cucumber inside, topped with thinly sliced avocado, tobiko, and eel sauce. 8 pieces.",
    basePrice: 1699,
    imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800",
    categoryId: "sushi",
    dietaryTags: ["popular", "featured"],
    customizationGroups: [SUSHI_ROLL_EXTRAS_GROUP],
    calories: 420,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 2156,
  },
  {
    id: "sushi-02",
    name: "Spicy Tuna Roll",
    description:
      "Fresh sushi-grade tuna, spicy mayo, cucumber, and scallions wrapped in nori and seasoned sushi rice. 8 pieces.",
    basePrice: 1499,
    imageUrl: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=800",
    categoryId: "sushi",
    dietaryTags: ["spicy", "popular"],
    customizationGroups: [SUSHI_ROLL_EXTRAS_GROUP, SPICE_LEVEL_GROUP],
    calories: 380,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 1789,
  },
  {
    id: "sushi-03",
    name: "Rainbow Roll",
    description:
      "California roll base topped with alternating slices of tuna, salmon, yellowtail, and avocado. 8 pieces.",
    basePrice: 1899,
    imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800",
    categoryId: "sushi",
    dietaryTags: ["featured"],
    customizationGroups: [SUSHI_ROLL_EXTRAS_GROUP],
    calories: 460,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 3401,
  },
  {
    id: "sushi-04",
    name: "Veggie Avocado Roll",
    description:
      "Creamy avocado, cucumber, pickled daikon, and sesame seeds in seasoned sushi rice wrapped in nori. 8 pieces.",
    basePrice: 1099,
    imageUrl: "https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=800",
    categoryId: "sushi",
    dietaryTags: ["vegan", "gluten-free"],
    customizationGroups: [SUSHI_ROLL_EXTRAS_GROUP],
    calories: 290,
    isAvailable: true,
    rating: 4.5,
    reviewCount: 678,
  },
  {
    id: "sushi-05",
    name: "Salmon Sashimi (6 pcs)",
    description:
      "Premium Atlantic salmon, hand-sliced to order. Served with pickled ginger, wasabi, and soy sauce.",
    basePrice: 1999,
    imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800",
    categoryId: "sushi",
    dietaryTags: ["gluten-free", "popular"],
    customizationGroups: [SUSHI_ROLL_EXTRAS_GROUP],
    calories: 210,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 1102,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — BOWLS
// ─────────────────────────────────────────────────────────────────────────────

const BASE_CHOICE_GROUP: CustomizationGroup = {
  id: "bowl-base",
  label: "Choose Your Base",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "base-white-rice", label: "Steamed White Rice", priceDelta: 0, isDefault: true },
    { id: "base-brown-rice", label: "Brown Rice", priceDelta: 0 },
    { id: "base-quinoa", label: "Quinoa", priceDelta: 100 },
    { id: "base-greens", label: "Mixed Greens", priceDelta: 0 },
    { id: "base-cauliflower", label: "Cauliflower Rice", priceDelta: 100 },
  ],
};

const BOWL_TOPPINGS_GROUP: CustomizationGroup = {
  id: "bowl-toppings",
  label: "Add Toppings",
  type: "multi",
  minSelections: 0,
  maxSelections: 6,
  options: [
    { id: "bt-edamame", label: "Edamame", priceDelta: 75 },
    { id: "bt-corn", label: "Roasted Corn", priceDelta: 75 },
    { id: "bt-avocado", label: "Avocado", priceDelta: 150 },
    { id: "bt-kimchi", label: "Kimchi", priceDelta: 100 },
    { id: "bt-pickled-veg", label: "Pickled Vegetables", priceDelta: 75 },
    { id: "bt-crispy-onion", label: "Crispy Shallots", priceDelta: 75 },
    { id: "bt-seaweed", label: "Seaweed Salad", priceDelta: 100 },
    { id: "bt-soft-egg", label: "Soft-Boiled Egg", priceDelta: 125 },
  ],
};

const BOWL_SAUCE_GROUP: CustomizationGroup = {
  id: "bowl-sauce",
  label: "Choose Sauce",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "bs-teriyaki", label: "Teriyaki Glaze", priceDelta: 0, isDefault: true },
    { id: "bs-ponzu", label: "Citrus Ponzu", priceDelta: 0 },
    { id: "bs-spicy-miso", label: "Spicy Miso", priceDelta: 0 },
    { id: "bs-tahini", label: "Lemon Tahini", priceDelta: 0 },
    { id: "bs-peanut", label: "Thai Peanut", priceDelta: 0 },
    { id: "bs-chimichurri", label: "Chimichurri", priceDelta: 0 },
  ],
};

const BOWL_ITEMS: MenuItem[] = [
  {
    id: "bowl-01",
    name: "Bistro Poke Bowl",
    description:
      "Sushi-grade ahi tuna, edamame, cucumber, mango, avocado, and tobiko over seasoned sushi rice with ponzu dressing.",
    basePrice: 1799,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
    categoryId: "bowls",
    dietaryTags: ["gluten-free", "popular"],
    customizationGroups: [BASE_CHOICE_GROUP, PROTEIN_CHOICE_GROUP, BOWL_TOPPINGS_GROUP, BOWL_SAUCE_GROUP],
    calories: 580,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 2234,
  },
  {
    id: "bowl-02",
    name: "Korean BBQ Bowl",
    description:
      "Gochujang-marinated beef bulgogi, kimchi, pickled daikon, cucumber, sesame seeds, and scallions over steamed rice.",
    basePrice: 1699,
    imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800",
    categoryId: "bowls",
    dietaryTags: ["spicy", "popular"],
    customizationGroups: [BASE_CHOICE_GROUP, PROTEIN_CHOICE_GROUP, BOWL_TOPPINGS_GROUP, BOWL_SAUCE_GROUP, SPICE_LEVEL_GROUP],
    calories: 650,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 1567,
  },
  {
    id: "bowl-03",
    name: "Mediterranean Grain Bowl",
    description:
      "Quinoa, roasted chickpeas, cucumber, cherry tomatoes, kalamata olives, feta, and tzatziki with warm pita.",
    basePrice: 1499,
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    categoryId: "bowls",
    dietaryTags: ["vegetarian", "gluten-free"],
    customizationGroups: [BASE_CHOICE_GROUP, BOWL_TOPPINGS_GROUP, BOWL_SAUCE_GROUP],
    calories: 490,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 889,
  },
  {
    id: "bowl-04",
    name: "Teriyaki Salmon Bowl",
    description:
      "Pan-seared Atlantic salmon glazed with house teriyaki, steamed broccoli, edamame, shredded carrots, and sesame seeds.",
    basePrice: 1999,
    imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800",
    categoryId: "bowls",
    dietaryTags: ["gluten-free", "featured"],
    customizationGroups: [BASE_CHOICE_GROUP, BOWL_TOPPINGS_GROUP, BOWL_SAUCE_GROUP],
    calories: 620,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 1890,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — TACOS
// ─────────────────────────────────────────────────────────────────────────────

const TACO_SHELL_GROUP: CustomizationGroup = {
  id: "taco-shell",
  label: "Choose Shell",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "shell-corn", label: "Corn Tortilla", priceDelta: 0, isDefault: true },
    { id: "shell-flour", label: "Flour Tortilla", priceDelta: 0 },
    { id: "shell-crispy", label: "Crispy Shell", priceDelta: 50 },
    { id: "shell-lettuce", label: "Lettuce Wrap (GF)", priceDelta: 0 },
  ],
};

const TACO_TOPPINGS_GROUP: CustomizationGroup = {
  id: "taco-toppings",
  label: "Add Toppings",
  type: "multi",
  minSelections: 0,
  maxSelections: 6,
  options: [
    { id: "tt-pico", label: "Pico de Gallo", priceDelta: 0, isDefault: true },
    { id: "tt-guac", label: "Guacamole", priceDelta: 150 },
    { id: "tt-sour-cream", label: "Sour Cream", priceDelta: 75 },
    { id: "tt-cotija", label: "Cotija Cheese", priceDelta: 75 },
    { id: "tt-pickled-onion", label: "Pickled Red Onion", priceDelta: 50 },
    { id: "tt-cilantro", label: "Fresh Cilantro", priceDelta: 0 },
    { id: "tt-lime", label: "Lime Wedge", priceDelta: 0 },
    { id: "tt-jalapeno", label: "Sliced Jalapeños", priceDelta: 50 },
  ],
};

const TACO_ITEMS: MenuItem[] = [
  {
    id: "taco-01",
    name: "Carne Asada Tacos (3)",
    description:
      "Grilled marinated skirt steak, charred corn salsa, cotija cheese, pickled red onion, and cilantro on warm corn tortillas.",
    basePrice: 1499,
    imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
    categoryId: "tacos",
    dietaryTags: ["popular", "gluten-free"],
    customizationGroups: [TACO_SHELL_GROUP, TACO_TOPPINGS_GROUP, SPICE_LEVEL_GROUP],
    calories: 540,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 1678,
  },
  {
    id: "taco-02",
    name: "Baja Fish Tacos (3)",
    description:
      "Beer-battered cod, shredded cabbage, chipotle crema, mango salsa, and pickled jalapeños on flour tortillas.",
    basePrice: 1599,
    imageUrl: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800",
    categoryId: "tacos",
    dietaryTags: ["popular"],
    customizationGroups: [TACO_SHELL_GROUP, TACO_TOPPINGS_GROUP, SPICE_LEVEL_GROUP],
    calories: 490,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 1234,
  },
  {
    id: "taco-03",
    name: "Al Pastor Tacos (3)",
    description:
      "Achiote-marinated pork, pineapple, white onion, and cilantro on corn tortillas with salsa verde.",
    basePrice: 1399,
    imageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=800",
    categoryId: "tacos",
    dietaryTags: ["popular"],
    customizationGroups: [TACO_SHELL_GROUP, TACO_TOPPINGS_GROUP, SPICE_LEVEL_GROUP],
    calories: 510,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 2345,
  },
  {
    id: "taco-04",
    name: "Roasted Veggie Tacos (3)",
    description:
      "Roasted sweet potato, black beans, charred corn, avocado crema, and pickled cabbage on corn tortillas.",
    basePrice: 1299,
    imageUrl: "https://images.unsplash.com/photo-1613514785940-daed07799d9b?w=800",
    categoryId: "tacos",
    dietaryTags: ["vegan", "gluten-free"],
    customizationGroups: [TACO_SHELL_GROUP, TACO_TOPPINGS_GROUP],
    calories: 420,
    isAvailable: true,
    rating: 4.6,
    reviewCount: 567,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — PASTA
// ─────────────────────────────────────────────────────────────────────────────

const PASTA_TYPE_GROUP: CustomizationGroup = {
  id: "pasta-type",
  label: "Choose Pasta",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "pasta-spaghetti", label: "Spaghetti", priceDelta: 0, isDefault: true },
    { id: "pasta-penne", label: "Penne Rigate", priceDelta: 0 },
    { id: "pasta-rigatoni", label: "Rigatoni", priceDelta: 0 },
    { id: "pasta-fettuccine", label: "Fettuccine", priceDelta: 0 },
    { id: "pasta-gf", label: "Gluten-Free Penne", priceDelta: 200 },
  ],
};

const PASTA_ITEMS: MenuItem[] = [
  {
    id: "pasta-01",
    name: "Cacio e Pepe",
    description:
      "Roman classic: al dente spaghetti tossed with Pecorino Romano, Parmigiano-Reggiano, and freshly cracked black pepper.",
    basePrice: 1699,
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800",
    categoryId: "pasta",
    dietaryTags: ["vegetarian", "popular"],
    customizationGroups: [PASTA_TYPE_GROUP],
    calories: 620,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 1890,
  },
  {
    id: "pasta-02",
    name: "Lobster Linguine",
    description:
      "Fresh Maine lobster, cherry tomatoes, garlic, white wine, chili flakes, and fresh parsley in a light bisque sauce.",
    basePrice: 3299,
    imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800",
    categoryId: "pasta",
    dietaryTags: ["featured"],
    customizationGroups: [PASTA_TYPE_GROUP, SPICE_LEVEL_GROUP],
    calories: 780,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 678,
  },
  {
    id: "pasta-03",
    name: "Bolognese Ragu",
    description:
      "Slow-braised beef and pork ragu, San Marzano tomatoes, soffritto, and a splash of red wine. Finished with Parmigiano.",
    basePrice: 1999,
    imageUrl: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=800",
    categoryId: "pasta",
    dietaryTags: ["popular"],
    customizationGroups: [PASTA_TYPE_GROUP],
    calories: 840,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 2103,
  },
  {
    id: "pasta-04",
    name: "Pesto Primavera",
    description:
      "House-made basil pesto, seasonal roasted vegetables, cherry tomatoes, pine nuts, and shaved Parmigiano.",
    basePrice: 1599,
    imageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800",
    categoryId: "pasta",
    dietaryTags: ["vegetarian", "popular"],
    customizationGroups: [PASTA_TYPE_GROUP, PROTEIN_CHOICE_GROUP],
    calories: 560,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 1102,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — SALADS
// ─────────────────────────────────────────────────────────────────────────────

const SALAD_DRESSING_GROUP: CustomizationGroup = {
  id: "salad-dressing",
  label: "Choose Dressing",
  type: "single",
  minSelections: 1,
  maxSelections: 1,
  options: [
    { id: "dress-caesar", label: "Classic Caesar", priceDelta: 0, isDefault: true },
    { id: "dress-balsamic", label: "Aged Balsamic Vinaigrette", priceDelta: 0 },
    { id: "dress-ranch", label: "Buttermilk Ranch", priceDelta: 0 },
    { id: "dress-lemon", label: "Lemon Herb Vinaigrette", priceDelta: 0 },
    { id: "dress-tahini", label: "Lemon Tahini", priceDelta: 0 },
    { id: "dress-miso", label: "Ginger Miso", priceDelta: 0 },
  ],
};

const SALAD_ITEMS: MenuItem[] = [
  {
    id: "salad-01",
    name: "Bistro Caesar",
    description:
      "Crisp romaine hearts, house-made Caesar dressing, shaved Parmigiano-Reggiano, house croutons, and white anchovies.",
    basePrice: 1399,
    imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=800",
    categoryId: "salads",
    dietaryTags: ["popular"],
    customizationGroups: [SALAD_DRESSING_GROUP, PROTEIN_CHOICE_GROUP],
    calories: 420,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 1456,
  },
  {
    id: "salad-02",
    name: "Harvest Kale Salad",
    description:
      "Massaged lacinato kale, roasted butternut squash, dried cranberries, candied pecans, goat cheese, and apple cider vinaigrette.",
    basePrice: 1499,
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    categoryId: "salads",
    dietaryTags: ["vegetarian", "gluten-free"],
    customizationGroups: [SALAD_DRESSING_GROUP, PROTEIN_CHOICE_GROUP],
    calories: 380,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 789,
  },
  {
    id: "salad-03",
    name: "Niçoise Salad",
    description:
      "Seared ahi tuna, haricots verts, cherry tomatoes, Niçoise olives, hard-boiled egg, and fingerling potatoes with lemon vinaigrette.",
    basePrice: 1899,
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800",
    categoryId: "salads",
    dietaryTags: ["gluten-free", "featured"],
    customizationGroups: [SALAD_DRESSING_GROUP],
    calories: 490,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 567,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — DESSERTS
// ─────────────────────────────────────────────────────────────────────────────

const DESSERT_ITEMS: MenuItem[] = [
  {
    id: "dessert-01",
    name: "Warm Chocolate Lava Cake",
    description:
      "Decadent dark chocolate cake with a molten center, served with Madagascar vanilla bean ice cream and raspberry coulis.",
    basePrice: 999,
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800",
    categoryId: "desserts",
    dietaryTags: ["popular", "featured"],
    customizationGroups: [
      {
        id: "lava-extras",
        label: "Add Extras",
        type: "multi",
        minSelections: 0,
        maxSelections: 3,
        options: [
          { id: "le-ice-cream", label: "Extra Scoop of Ice Cream", priceDelta: 200 },
          { id: "le-whipped", label: "Whipped Cream", priceDelta: 75 },
          { id: "le-caramel", label: "Salted Caramel Drizzle", priceDelta: 100 },
          { id: "le-berries", label: "Fresh Berries", priceDelta: 150 },
        ],
      },
    ],
    calories: 680,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 3456,
  },
  {
    id: "dessert-02",
    name: "New York Cheesecake",
    description:
      "Classic dense and creamy New York-style cheesecake on a graham cracker crust with seasonal berry compote.",
    basePrice: 849,
    imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800",
    categoryId: "desserts",
    dietaryTags: ["popular"],
    customizationGroups: [],
    calories: 520,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 2109,
  },
  {
    id: "dessert-03",
    name: "Tiramisu",
    description:
      "Authentic Italian tiramisu with espresso-soaked ladyfingers, mascarpone cream, and a generous dusting of cocoa.",
    basePrice: 899,
    imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800",
    categoryId: "desserts",
    dietaryTags: ["popular"],
    customizationGroups: [],
    calories: 450,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 1876,
  },
  {
    id: "dessert-04",
    name: "Vegan Mango Sorbet",
    description:
      "Three scoops of house-made Alphonso mango sorbet with fresh mint and a lime zest garnish.",
    basePrice: 699,
    imageUrl: "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=800",
    categoryId: "desserts",
    dietaryTags: ["vegan", "gluten-free", "dairy-free"],
    customizationGroups: [],
    calories: 210,
    isAvailable: true,
    rating: 4.6,
    reviewCount: 445,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MENU ITEMS — DRINKS
// ─────────────────────────────────────────────────────────────────────────────

const DRINK_ITEMS: MenuItem[] = [
  {
    id: "drink-01",
    name: "Craft Lemonade",
    description:
      "Fresh-squeezed lemonade with your choice of flavor: classic, strawberry, lavender, or mango chili.",
    basePrice: 499,
    imageUrl: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800",
    categoryId: "drinks",
    dietaryTags: ["vegan", "gluten-free"],
    customizationGroups: [
      DRINK_SIZE_GROUP,
      {
        id: "lemonade-flavor",
        label: "Choose Flavor",
        type: "single",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "lf-classic", label: "Classic", priceDelta: 0, isDefault: true },
          { id: "lf-strawberry", label: "Strawberry", priceDelta: 0 },
          { id: "lf-lavender", label: "Lavender", priceDelta: 0 },
          { id: "lf-mango-chili", label: "Mango Chili", priceDelta: 0 },
        ],
      },
    ],
    calories: 180,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 1234,
  },
  {
    id: "drink-02",
    name: "Matcha Latte",
    description:
      "Ceremonial-grade Japanese matcha whisked with steamed oat milk and a touch of honey. Hot or iced.",
    basePrice: 649,
    imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800",
    categoryId: "drinks",
    dietaryTags: ["vegan", "gluten-free"],
    customizationGroups: [
      DRINK_SIZE_GROUP,
      {
        id: "latte-temp",
        label: "Temperature",
        type: "single",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "temp-hot", label: "Hot", priceDelta: 0, isDefault: true },
          { id: "temp-iced", label: "Iced", priceDelta: 0 },
        ],
      },
      {
        id: "latte-milk",
        label: "Choose Milk",
        type: "single",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "milk-oat", label: "Oat Milk", priceDelta: 0, isDefault: true },
          { id: "milk-almond", label: "Almond Milk", priceDelta: 0 },
          { id: "milk-whole", label: "Whole Milk", priceDelta: 0 },
          { id: "milk-coconut", label: "Coconut Milk", priceDelta: 0 },
        ],
      },
    ],
    calories: 140,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 987,
  },
  {
    id: "drink-03",
    name: "Sparkling Water",
    description: "Chilled San Pellegrino sparkling mineral water.",
    basePrice: 299,
    imageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800",
    categoryId: "drinks",
    dietaryTags: ["vegan", "gluten-free", "dairy-free"],
    customizationGroups: [],
    calories: 0,
    isAvailable: true,
    rating: 4.5,
    reviewCount: 234,
  },
  {
    id: "drink-04",
    name: "Fresh Pressed Juice",
    description:
      "Cold-pressed daily. Choose from: Green Detox (kale, cucumber, apple, ginger), Sunrise (orange, carrot, turmeric), or Berry Blast.",
    basePrice: 799,
    imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800",
    categoryId: "drinks",
    dietaryTags: ["vegan", "gluten-free", "dairy-free"],
    customizationGroups: [
      {
        id: "juice-flavor",
        label: "Choose Juice",
        type: "single",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "jf-green", label: "Green Detox", priceDelta: 0, isDefault: true },
          { id: "jf-sunrise", label: "Sunrise", priceDelta: 0 },
          { id: "jf-berry", label: "Berry Blast", priceDelta: 0 },
        ],
      },
    ],
    calories: 120,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 678,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DEALS / FEATURED COMBOS
// ─────────────────────────────────────────────────────────────────────────────

const DEAL_ITEMS: MenuItem[] = [
  {
    id: "deal-01",
    name: "Burger + Fries + Drink Combo",
    description:
      "Any classic burger, a large side of fries, and a 16 oz craft lemonade. Save $4 vs ordering separately.",
    basePrice: 1999,
    imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800",
    categoryId: "deals",
    dietaryTags: ["popular", "featured"],
    customizationGroups: [
      BURGER_PATTY_GROUP,
      BURGER_CHEESE_GROUP,
      BURGER_SAUCE_GROUP,
      {
        id: "combo-drink",
        label: "Choose Your Drink",
        type: "single",
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: "cd-lemonade", label: "Craft Lemonade", priceDelta: 0, isDefault: true },
          { id: "cd-water", label: "Sparkling Water", priceDelta: 0 },
          { id: "cd-juice", label: "Fresh Pressed Juice", priceDelta: 200 },
        ],
      },
    ],
    calories: 1100,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 4521,
  },
  {
    id: "deal-02",
    name: "Sushi Feast for Two",
    description:
      "Dragon Roll + Rainbow Roll + Spicy Tuna Roll + 2 Miso Soups. Perfect for sharing. Save $8.",
    basePrice: 4999,
    imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800",
    categoryId: "deals",
    dietaryTags: ["featured"],
    customizationGroups: [SUSHI_ROLL_EXTRAS_GROUP],
    calories: 1200,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 1234,
  },
  {
    id: "deal-03",
    name: "Pizza + Salad Lunch Deal",
    description:
      "Any 10\" personal pizza with a Bistro Caesar salad. Available 11am–3pm. Save $5.",
    basePrice: 2199,
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800",
    categoryId: "deals",
    dietaryTags: ["popular"],
    customizationGroups: [PIZZA_CRUST_GROUP, PIZZA_TOPPINGS_GROUP, SALAD_DRESSING_GROUP],
    calories: 900,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 2109,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PROMO CODES
// ─────────────────────────────────────────────────────────────────────────────


export const PROMO_CODES: PromoCode[] = [
  {
    code: "BISTRO10",
    type: "percentage",
    value: 10,
    description: "10% off your entire order",
    minimumOrderAmount: 2000,
    expiresAt: "2026-12-31T23:59:59Z",
    isActive: true,
  },
  {
    code: "FREESHIP",
    type: "free_delivery",
    value: 0,
    description: "Free delivery on your order",
    minimumOrderAmount: 1500,
    expiresAt: "2026-12-31T23:59:59Z",
    isActive: true,
  },
  {
    code: "WELCOME5",
    type: "flat",
    value: 500,
    description: "$5 off your first order",
    minimumOrderAmount: 1000,
    expiresAt: "2026-12-31T23:59:59Z",
    isActive: true,
  },
  {
    code: "LUNCH20",
    type: "percentage",
    value: 20,
    description: "20% off lunch orders (11am–3pm)",
    minimumOrderAmount: 1500,
    expiresAt: "2026-09-30T23:59:59Z",
    isActive: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANT RECORD — THE INTELLIGENT BISTRO
// ─────────────────────────────────────────────────────────────────────────────

export const THE_BISTRO: Restaurant = {
  id: "the-bistro",
  name: "The Intelligent Bistro",
  tagline: "Premium food, ordered your way — just say the word.",
  logoUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
  heroImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200",
  rating: 4.9,
  reviewCount: 18_432,
  deliveryTimeRange: "15-25 min",
  deliveryFee: 199,
  minimumOrder: 1000,
  isOpen: true,
  address: "123 Bistro Lane, San Francisco, CA 94105",
  cuisineTypes: ["American", "Italian", "Japanese", "Mexican", "Mediterranean"],
  categories: MENU_CATEGORIES,
  menuItems: [
    ...DEAL_ITEMS,
    ...BURGER_ITEMS,
    ...PIZZA_ITEMS,
    ...SUSHI_ITEMS,
    ...BOWL_ITEMS,
    ...TACO_ITEMS,
    ...PASTA_ITEMS,
    ...SALAD_ITEMS,
    ...DESSERT_ITEMS,
    ...DRINK_ITEMS,
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** O(1) item lookup by ID */
export const MENU_ITEM_MAP: ReadonlyMap<string, MenuItem> = new Map(
  THE_BISTRO.menuItems.map((item) => [item.id, item])
);

/** O(1) category lookup by ID */
export const CATEGORY_MAP: ReadonlyMap<string, MenuCategory> = new Map(
  MENU_CATEGORIES.map((cat) => [cat.id, cat])
);

/** O(1) promo code lookup */
export const PROMO_CODE_MAP: ReadonlyMap<string, PromoCode> = new Map(
  PROMO_CODES.map((promo) => [promo.code.toUpperCase(), promo])
);

/**
 * Returns all menu items for a given category ID, sorted by rating descending.
 */
export function getItemsByCategory(categoryId: string): MenuItem[] {
  return THE_BISTRO.menuItems
    .filter((item) => item.categoryId === categoryId && item.isAvailable)
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Returns featured items across all categories (dietaryTags includes "featured"),
 * sorted by reviewCount descending.
 */
export function getFeaturedItems(): MenuItem[] {
  return THE_BISTRO.menuItems
    .filter((item) => item.dietaryTags.includes("featured") && item.isAvailable)
    .sort((a, b) => b.reviewCount - a.reviewCount);
}

/**
 * Returns popular items across all categories (dietaryTags includes "popular"),
 * sorted by rating descending.
 */
export function getPopularItems(): MenuItem[] {
  return THE_BISTRO.menuItems
    .filter((item) => item.dietaryTags.includes("popular") && item.isAvailable)
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Validates a promo code and returns it if active, or null if invalid/expired.
 */
export function validatePromoCode(code: string): PromoCode | null {
  const promo = PROMO_CODE_MAP.get(code.toUpperCase());
  if (!promo || !promo.isActive) return null;
  if (new Date(promo.expiresAt) < new Date()) return null;
  return promo;
}

/**
 * Computes the discount amount in cents for a given promo and subtotal.
 * Returns 0 if the subtotal doesn't meet the minimum order requirement.
 */
export function computePromoDiscount(promo: PromoCode, subtotalCents: number): number {
  if (subtotalCents < promo.minimumOrderAmount) return 0;
  switch (promo.type) {
    case "percentage":
      return Math.round((subtotalCents * promo.value) / 100);
    case "flat":
      return Math.min(promo.value, subtotalCents);
    case "free_delivery":
      return THE_BISTRO.deliveryFee;
    case "bogo":
      // BOGO: discount equals the price of the cheapest item
      return 0; // Placeholder — implement per-order logic in the service layer
    default:
      return 0;
  }
}
