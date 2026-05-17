/**
 * data/restaurants.ts
 * 10 restaurants with their own menus.
 * Each restaurant has categories + menu items for the detail screen.
 */

export interface RestaurantMenuItem {
  id: string;
  /** Maps to the main MENU_ITEM_MAP key — if set, tapping opens the full item detail screen */
  menuItemId?: string;
  name: string;
  description: string;
  price: number; // cents
  imageUrl: string;
  category: string;
  rating: number;
  isPopular?: boolean;
}

export interface RestaurantData {
  id: string;
  name: string;
  tagline: string;
  imageUrl: string;
  logoUrl: string;
  cuisines: string[];
  rating: number;
  reviewCount: number;
  deliveryFee: number; // cents, 0 = free
  deliveryTime: string;
  minOrder: number; // cents
  categories: string[];
  menu: RestaurantMenuItem[];
}

export const RESTAURANTS: RestaurantData[] = [
  // ── 1. The Intelligent Bistro (main) ──────────────────────────────────────
  {
    id: "bistro-001",
    name: "The Intelligent Bistro",
    tagline: "Premium food, ordered your way",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
    logoUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200",
    cuisines: ["American", "Italian", "Japanese", "Mexican"],
    rating: 4.9,
    reviewCount: 18432,
    deliveryFee: 199,
    deliveryTime: "15-25 min",
    minOrder: 1500,
    categories: ["Burger", "Pizza", "Sushi", "Tacos"],
    menu: [
      { id: "b1-1", menuItemId: "burger-01", name: "Bistro Classic Burger", description: "Smash patty, special sauce, crisp lettuce, vine tomato", price: 1299, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", category: "Burger", rating: 4.9, isPopular: true },
      { id: "b1-2", menuItemId: "burger-02", name: "Truffle Mushroom Melt", description: "Wagyu beef, wild mushrooms, truffle mayo, Swiss cheese", price: 1699, imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400", category: "Burger", rating: 4.8 },
      { id: "b1-3", menuItemId: "pizza-01", name: "Margherita Classica", description: "San Marzano tomato, buffalo mozzarella, fresh basil", price: 1599, imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400", category: "Pizza", rating: 4.9, isPopular: true },
      { id: "b1-4", menuItemId: "pizza-03", name: "Spicy Diavola", description: "Calabrian chili, spicy salami, honey drizzle", price: 1899, imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400", category: "Pizza", rating: 4.7 },
      { id: "b1-5", menuItemId: "sushi-01", name: "Dragon Roll", description: "Shrimp tempura, avocado, tobiko, eel sauce. 8 pcs", price: 1699, imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400", category: "Sushi", rating: 4.9, isPopular: true },
      { id: "b1-6", menuItemId: "sushi-03", name: "Rainbow Roll", description: "California base, tuna, salmon, yellowtail, avocado. 8 pcs", price: 1899, imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400", category: "Sushi", rating: 4.9 },
      { id: "b1-7", menuItemId: "taco-01", name: "Carne Asada Tacos", description: "Grilled skirt steak, charred corn salsa, cotija. 3 pcs", price: 1499, imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400", category: "Tacos", rating: 4.8, isPopular: true },
      { id: "b1-8", menuItemId: "taco-03", name: "Al Pastor Tacos", description: "Achiote pork, pineapple, white onion, cilantro. 3 pcs", price: 1399, imageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=400", category: "Tacos", rating: 4.9 },
    ],
  },

  // ── 2. Burger Republic ────────────────────────────────────────────────────
  {
    id: "burger-republic",
    name: "Burger Republic",
    tagline: "Handcrafted burgers since 2010",
    imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800",
    logoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200",
    cuisines: ["American", "Fast Food"],
    rating: 4.7,
    reviewCount: 8234,
    deliveryFee: 0,
    deliveryTime: "20-30 min",
    minOrder: 1000,
    categories: ["Burgers", "Sides", "Drinks"],
    menu: [
      { id: "br-1", menuItemId: "burger-01", name: "Classic Smash", description: "Double smash patty, American cheese, pickles, mustard", price: 1099, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", category: "Burgers", rating: 4.8, isPopular: true },
      { id: "br-2", menuItemId: "burger-05", name: "BBQ Bacon Stack", description: "Triple patty, thick bacon, BBQ sauce, onion rings", price: 1599, imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400", category: "Burgers", rating: 4.7 },
      { id: "br-3", menuItemId: "burger-02", name: "Mushroom Swiss", description: "Beef patty, sautéed mushrooms, Swiss, garlic aioli", price: 1299, imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400", category: "Burgers", rating: 4.6 },
      { id: "br-4", menuItemId: "burger-03", name: "Crispy Chicken", description: "Fried chicken thigh, coleslaw, pickles, hot sauce", price: 1199, imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400", category: "Burgers", rating: 4.7, isPopular: true },
      { id: "br-5", name: "Loaded Fries", description: "Crispy fries, cheese sauce, bacon bits, jalapeños", price: 799, imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400", category: "Sides", rating: 4.5 },
      { id: "br-6", name: "Onion Rings", description: "Beer-battered, golden crispy, ranch dip", price: 599, imageUrl: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400", category: "Sides", rating: 4.4 },
      { id: "br-7", name: "Vanilla Shake", description: "Thick hand-spun vanilla milkshake", price: 699, imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400", category: "Drinks", rating: 4.6 },
    ],
  },

  // ── 3. Pizza Palace ───────────────────────────────────────────────────────
  {
    id: "pizza-palace",
    name: "Pizza Palace",
    tagline: "Wood-fired perfection",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
    logoUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200",
    cuisines: ["Italian", "Pizza"],
    rating: 4.8,
    reviewCount: 12567,
    deliveryFee: 149,
    deliveryTime: "25-35 min",
    minOrder: 2000,
    categories: ["Classic", "Specialty", "Calzone"],
    menu: [
      { id: "pp-1", menuItemId: "pizza-01", name: "Margherita", description: "Tomato, mozzarella, fresh basil, olive oil", price: 1499, imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400", category: "Classic", rating: 4.9, isPopular: true },
      { id: "pp-2", menuItemId: "pizza-04", name: "Pepperoni", description: "Tomato sauce, mozzarella, premium pepperoni", price: 1699, imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400", category: "Classic", rating: 4.8, isPopular: true },
      { id: "pp-3", menuItemId: "pizza-02", name: "Four Cheese", description: "Mozzarella, gorgonzola, fontina, parmesan", price: 1799, imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", category: "Specialty", rating: 4.7 },
      { id: "pp-4", menuItemId: "pizza-02", name: "Truffle Funghi", description: "Truffle cream, wild mushrooms, fontina, thyme", price: 2199, imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", category: "Specialty", rating: 4.8 },
      { id: "pp-5", menuItemId: "pizza-03", name: "Meat Calzone", description: "Folded pizza, ricotta, salami, ham, mozzarella", price: 1899, imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400", category: "Calzone", rating: 4.6 },
    ],
  },

  // ── 4. Sushi Zen ──────────────────────────────────────────────────────────
  {
    id: "sushi-zen",
    name: "Sushi Zen",
    tagline: "Authentic Japanese omakase",
    imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800",
    logoUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=200",
    cuisines: ["Japanese", "Sushi"],
    rating: 4.9,
    reviewCount: 6789,
    deliveryFee: 299,
    deliveryTime: "30-45 min",
    minOrder: 3000,
    categories: ["Rolls", "Sashimi", "Nigiri"],
    menu: [
      { id: "sz-1", menuItemId: "sushi-01", name: "Dragon Roll", description: "Shrimp tempura, avocado, tobiko, eel sauce. 8 pcs", price: 1799, imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400", category: "Rolls", rating: 4.9, isPopular: true },
      { id: "sz-2", menuItemId: "sushi-02", name: "Spicy Tuna Roll", description: "Fresh tuna, spicy mayo, cucumber, scallions. 8 pcs", price: 1599, imageUrl: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400", category: "Rolls", rating: 4.8, isPopular: true },
      { id: "sz-3", menuItemId: "sushi-03", name: "Rainbow Roll", description: "California base, tuna, salmon, yellowtail, avocado. 8 pcs", price: 1999, imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400", category: "Rolls", rating: 4.9 },
      { id: "sz-4", menuItemId: "sushi-05", name: "Salmon Sashimi", description: "Premium Atlantic salmon, 6 hand-cut slices", price: 1999, imageUrl: "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400", category: "Sashimi", rating: 4.9 },
      { id: "sz-5", menuItemId: "sushi-04", name: "Tuna Sashimi", description: "Bluefin tuna, 6 slices, wasabi, pickled ginger", price: 2299, imageUrl: "https://images.unsplash.com/photo-1559410545-0bdcd187e0a6?w=400", category: "Sashimi", rating: 4.8 },
      { id: "sz-6", menuItemId: "sushi-01", name: "Salmon Nigiri", description: "Hand-pressed sushi rice, fresh salmon. 2 pcs", price: 899, imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400", category: "Nigiri", rating: 4.7 },
    ],
  },

  // ── 5. Taco Fiesta ────────────────────────────────────────────────────────
  {
    id: "taco-fiesta",
    name: "Taco Fiesta",
    tagline: "Authentic Mexican street food",
    imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
    logoUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200",
    cuisines: ["Mexican", "Street Food"],
    rating: 4.6,
    reviewCount: 9123,
    deliveryFee: 0,
    deliveryTime: "15-25 min",
    minOrder: 1200,
    categories: ["Tacos", "Burritos", "Sides"],
    menu: [
      { id: "tf-1", menuItemId: "taco-01", name: "Carne Asada Tacos", description: "Grilled skirt steak, charred corn, cotija. 3 pcs", price: 1399, imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400", category: "Tacos", rating: 4.8, isPopular: true },
      { id: "tf-2", menuItemId: "taco-03", name: "Al Pastor Tacos", description: "Achiote pork, pineapple, cilantro. 3 pcs", price: 1299, imageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=400", category: "Tacos", rating: 4.9, isPopular: true },
      { id: "tf-3", menuItemId: "taco-02", name: "Fish Tacos", description: "Beer-battered cod, mango salsa, chipotle crema. 3 pcs", price: 1499, imageUrl: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400", category: "Tacos", rating: 4.7 },
      { id: "tf-4", name: "Chicken Burrito", description: "Grilled chicken, rice, beans, pico, guac, sour cream", price: 1599, imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400", category: "Burritos", rating: 4.6 },
      { id: "tf-5", name: "Chips & Guacamole", description: "Fresh tortilla chips, house-made guacamole", price: 799, imageUrl: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=400", category: "Sides", rating: 4.5 },
    ],
  },

  // ── 6. Pasta Bella ────────────────────────────────────────────────────────
  {
    id: "pasta-bella",
    name: "Pasta Bella",
    tagline: "Handmade pasta, Italian soul",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
    logoUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200",
    cuisines: ["Italian", "Pasta"],
    rating: 4.8,
    reviewCount: 5432,
    deliveryFee: 199,
    deliveryTime: "25-40 min",
    minOrder: 2000,
    categories: ["Pasta", "Risotto", "Dessert"],
    menu: [
      { id: "pb-1", menuItemId: "pasta-01", name: "Cacio e Pepe", description: "Spaghetti, Pecorino Romano, black pepper", price: 1699, imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400", category: "Pasta", rating: 4.9, isPopular: true },
      { id: "pb-2", menuItemId: "pasta-03", name: "Bolognese Ragu", description: "Slow-braised beef & pork, San Marzano tomatoes", price: 1999, imageUrl: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400", category: "Pasta", rating: 4.8, isPopular: true },
      { id: "pb-3", menuItemId: "pasta-02", name: "Lobster Linguine", description: "Fresh Maine lobster, white wine, cherry tomatoes", price: 3299, imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400", category: "Pasta", rating: 4.9 },
      { id: "pb-4", name: "Truffle Risotto", description: "Arborio rice, black truffle, parmesan, butter", price: 2499, imageUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400", category: "Risotto", rating: 4.8 },
      { id: "pb-5", menuItemId: "dessert-03", name: "Tiramisu", description: "Classic Italian, espresso-soaked ladyfingers, mascarpone", price: 899, imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400", category: "Dessert", rating: 4.9 },
    ],
  },

  // ── 7. Green Bowl ─────────────────────────────────────────────────────────
  {
    id: "green-bowl",
    name: "Green Bowl",
    tagline: "Healthy bowls, happy you",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",
    logoUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200",
    cuisines: ["Healthy", "Bowls", "Vegan"],
    rating: 4.7,
    reviewCount: 7654,
    deliveryFee: 0,
    deliveryTime: "20-30 min",
    minOrder: 1500,
    categories: ["Poke Bowls", "Grain Bowls", "Smoothies"],
    menu: [
      { id: "gb-1", menuItemId: "bowl-01", name: "Ahi Tuna Poke Bowl", description: "Sushi-grade tuna, edamame, mango, avocado, ponzu", price: 1799, imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400", category: "Poke Bowls", rating: 4.9, isPopular: true },
      { id: "gb-2", menuItemId: "bowl-02", name: "Korean BBQ Bowl", description: "Bulgogi beef, kimchi, pickled daikon, sesame rice", price: 1699, imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400", category: "Poke Bowls", rating: 4.8, isPopular: true },
      { id: "gb-3", menuItemId: "bowl-03", name: "Mediterranean Bowl", description: "Quinoa, chickpeas, feta, olives, tzatziki", price: 1499, imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400", category: "Grain Bowls", rating: 4.7 },
      { id: "gb-4", menuItemId: "bowl-04", name: "Teriyaki Salmon Bowl", description: "Pan-seared salmon, broccoli, edamame, teriyaki", price: 1999, imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400", category: "Grain Bowls", rating: 4.9 },
      { id: "gb-5", name: "Acai Smoothie Bowl", description: "Acai, banana, granola, fresh berries, honey", price: 1299, imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400", category: "Smoothies", rating: 4.6 },
    ],
  },

  // ── 8. The Dessert Lab ────────────────────────────────────────────────────
  {
    id: "dessert-lab",
    name: "The Dessert Lab",
    tagline: "Science meets sweetness",
    imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800",
    logoUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200",
    cuisines: ["Desserts", "Bakery"],
    rating: 4.8,
    reviewCount: 4321,
    deliveryFee: 149,
    deliveryTime: "20-35 min",
    minOrder: 1000,
    categories: ["Cakes", "Ice Cream", "Pastries"],
    menu: [
      { id: "dl-1", menuItemId: "dessert-01", name: "Chocolate Lava Cake", description: "Warm molten center, vanilla ice cream, berry coulis", price: 1099, imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400", category: "Cakes", rating: 4.9, isPopular: true },
      { id: "dl-2", menuItemId: "dessert-02", name: "NY Cheesecake", description: "Classic New York style, graham cracker crust, berry compote", price: 999, imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400", category: "Cakes", rating: 4.8, isPopular: true },
      { id: "dl-3", menuItemId: "dessert-03", name: "Tiramisu", description: "Espresso-soaked ladyfingers, mascarpone, cocoa", price: 899, imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400", category: "Cakes", rating: 4.9 },
      { id: "dl-4", name: "Matcha Ice Cream", description: "Premium Japanese matcha, 3 scoops", price: 799, imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400", category: "Ice Cream", rating: 4.7 },
      { id: "dl-5", name: "Croissant", description: "Buttery, flaky, freshly baked French croissant", price: 499, imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400", category: "Pastries", rating: 4.6 },
    ],
  },

  // ── 9. Spice Garden ───────────────────────────────────────────────────────
  {
    id: "spice-garden",
    name: "Spice Garden",
    tagline: "Bold flavors from South Asia",
    imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800",
    logoUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200",
    cuisines: ["Indian", "Pakistani", "Spicy"],
    rating: 4.7,
    reviewCount: 6543,
    deliveryFee: 199,
    deliveryTime: "30-45 min",
    minOrder: 2000,
    categories: ["Curries", "Biryani", "Breads"],
    menu: [
      { id: "sg-1", name: "Butter Chicken", description: "Tender chicken in rich tomato-cream sauce, naan", price: 1699, imageUrl: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400", category: "Curries", rating: 4.8, isPopular: true },
      { id: "sg-2", name: "Lamb Rogan Josh", description: "Slow-cooked lamb, Kashmiri spices, aromatic gravy", price: 1899, imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400", category: "Curries", rating: 4.7 },
      { id: "sg-3", name: "Chicken Biryani", description: "Basmati rice, saffron, whole spices, raita", price: 1799, imageUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400", category: "Biryani", rating: 4.9, isPopular: true },
      { id: "sg-4", name: "Garlic Naan", description: "Tandoor-baked, garlic butter, fresh cilantro", price: 399, imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400", category: "Breads", rating: 4.6 },
      { id: "sg-5", name: "Samosa (4 pcs)", description: "Crispy pastry, spiced potato & pea filling, chutney", price: 699, imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400", category: "Breads", rating: 4.5 },
    ],
  },

  // ── 10. Café Noir ─────────────────────────────────────────────────────────
  {
    id: "cafe-noir",
    name: "Café Noir",
    tagline: "Specialty coffee & light bites",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
    logoUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200",
    cuisines: ["Coffee", "Café", "Brunch"],
    rating: 4.6,
    reviewCount: 3210,
    deliveryFee: 0,
    deliveryTime: "15-25 min",
    minOrder: 800,
    categories: ["Coffee", "Tea", "Food"],
    menu: [
      { id: "cn-1", menuItemId: "drink-02", name: "Flat White", description: "Double ristretto, velvety microfoam, latte art", price: 599, imageUrl: "https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=400", category: "Coffee", rating: 4.8, isPopular: true },
      { id: "cn-2", menuItemId: "drink-02", name: "Matcha Latte", description: "Ceremonial grade matcha, oat milk, honey", price: 699, imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400", category: "Tea", rating: 4.7, isPopular: true },
      { id: "cn-3", menuItemId: "drink-01", name: "Cold Brew", description: "18-hour cold brew, served over ice", price: 549, imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", category: "Coffee", rating: 4.7 },
      { id: "cn-4", name: "Avocado Toast", description: "Sourdough, smashed avocado, poached egg, chili flakes", price: 1299, imageUrl: "https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400", category: "Food", rating: 4.6 },
      { id: "cn-5", name: "Acai Bowl", description: "Acai blend, granola, banana, berries, honey drizzle", price: 1199, imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400", category: "Food", rating: 4.5 },
    ],
  },
];

/** Lookup map for O(1) access */
export const RESTAURANT_MAP = new Map(RESTAURANTS.map((r) => [r.id, r]));
