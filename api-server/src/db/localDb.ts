/**
 * api-server/src/db/localDb.ts
 * Local SQLite database using sql.js (pure JS, no native bindings).
 * Drop-in replacement for Supabase — same query interface.
 * Data persists to ./bistro.db on disk between server restarts.
 */

import fs from "fs";
import path from "path";
import initSqlJs, { Database } from "sql.js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../bistro.db");

let _db: Database | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

export async function initDb(): Promise<Database> {
  if (_db) return _db;

  const SQL = await initSqlJs();

  // Load existing DB from disk or create fresh
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
    console.log("[DB] Loaded existing database from", DB_PATH);
  } else {
    _db = new SQL.Database();
    console.log("[DB] Created new in-memory database");
  }

  createSchema(_db);
  seedIfEmpty(_db);
  persist(_db); // save initial state

  return _db;
}

export function getDb(): Database {
  if (!_db) throw new Error("Database not initialised. Call initDb() first.");
  return _db;
}

/** Persist current DB state to disk */
export function persist(db: Database): void {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

function createSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id          TEXT PRIMARY KEY,
      label       TEXT NOT NULL,
      icon_name   TEXT NOT NULL,
      badge_color TEXT NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id                   TEXT PRIMARY KEY,
      name                 TEXT NOT NULL,
      description          TEXT NOT NULL,
      base_price           INTEGER NOT NULL,
      image_url            TEXT NOT NULL,
      category_id          TEXT NOT NULL,
      dietary_tags         TEXT NOT NULL DEFAULT '[]',
      calories             INTEGER,
      is_available         INTEGER NOT NULL DEFAULT 1,
      rating               REAL NOT NULL DEFAULT 4.5,
      review_count         INTEGER NOT NULL DEFAULT 0,
      customization_groups TEXT NOT NULL DEFAULT '[]',
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      email        TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      phone        TEXT,
      avatar_url   TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id                   TEXT PRIMARY KEY,
      user_id              TEXT NOT NULL,
      status               TEXT NOT NULL DEFAULT 'pending',
      items                TEXT NOT NULL DEFAULT '[]',
      pricing              TEXT NOT NULL DEFAULT '{}',
      delivery_address     TEXT,
      estimated_delivery   TEXT,
      promo_code           TEXT,
      tip_amount           INTEGER NOT NULL DEFAULT 0,
      special_instructions TEXT,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id         TEXT PRIMARY KEY,
      order_id   TEXT NOT NULL,
      status     TEXT NOT NULL,
      message    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_history_order ON order_status_history(order_id);
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA — 50 products
// ─────────────────────────────────────────────────────────────────────────────

function seedIfEmpty(db: Database): void {
  const result = db.exec("SELECT COUNT(*) as cnt FROM categories");
  const count = result[0]?.values[0]?.[0] as number ?? 0;
  if (count > 0) return; // already seeded

  console.log("[DB] Seeding categories and products...");

  // Categories
  const cats = [
    ["deals",    "Deals",    "tag.fill",             "#FF3B30", 0],
    ["burgers",  "Burgers",  "flame.fill",            "#FF9500", 1],
    ["pizza",    "Pizza",    "circle.grid.2x2.fill",  "#FF6B35", 2],
    ["sushi",    "Sushi",    "fish.fill",             "#34C759", 3],
    ["bowls",    "Bowls",    "leaf.fill",             "#30D158", 4],
    ["tacos",    "Tacos",    "fork.knife",            "#FFCC00", 5],
    ["pasta",    "Pasta",    "sparkles",              "#AF52DE", 6],
    ["salads",   "Salads",   "leaf.circle.fill",      "#32ADE6", 7],
    ["desserts", "Desserts", "birthday.cake.fill",    "#FF2D55", 8],
    ["drinks",   "Drinks",   "cup.and.saucer.fill",   "#007AFF", 9],
  ];
  for (const [id, label, icon, color, order] of cats) {
    db.run(
      "INSERT OR IGNORE INTO categories VALUES (?,?,?,?,?)",
      [id, label, icon, color, order]
    );
  }

  // Products helper
  const ins = db.prepare(
    `INSERT OR IGNORE INTO products
     (id,name,description,base_price,image_url,category_id,dietary_tags,calories,rating,review_count,customization_groups)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  );

  const p = (
    id: string, name: string, desc: string, price: number,
    img: string, cat: string, tags: string[], cal: number | null,
    rating: number, reviews: number, groups: object[]
  ) => ins.run([id, name, desc, price, img, cat,
    JSON.stringify(tags), cal, rating, reviews, JSON.stringify(groups)]);

  // Shared customization groups
  const sideChoice = [{"id":"side-choice","label":"Choose a Side","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"side-fries","label":"Classic Fries","priceDelta":0,"isDefault":true},{"id":"side-sweet-fries","label":"Sweet Potato Fries","priceDelta":100},{"id":"side-salad","label":"Side Salad","priceDelta":50},{"id":"side-onion-rings","label":"Onion Rings","priceDelta":100}]}];
  const burgerPatty = {"id":"burger-patty","label":"Choose Your Patty","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"patty-single","label":"Single","priceDelta":0,"isDefault":true},{"id":"patty-double","label":"Double","priceDelta":200},{"id":"patty-plant","label":"Plant-Based","priceDelta":150}]};
  const burgerCheese = {"id":"burger-cheese","label":"Choose Cheese","type":"single","minSelections":0,"maxSelections":1,"options":[{"id":"cheese-none","label":"No Cheese","priceDelta":0,"isDefault":true},{"id":"cheese-american","label":"American","priceDelta":75},{"id":"cheese-cheddar","label":"Sharp Cheddar","priceDelta":75},{"id":"cheese-swiss","label":"Swiss","priceDelta":75},{"id":"cheese-pepper-jack","label":"Pepper Jack","priceDelta":75}]};
  const spiceLevel = {"id":"spice-level","label":"Spice Level","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"spice-mild","label":"Mild","priceDelta":0,"isDefault":true},{"id":"spice-medium","label":"Medium","priceDelta":0},{"id":"spice-hot","label":"Hot","priceDelta":0},{"id":"spice-extra","label":"Extra Hot 🔥","priceDelta":0}]};
  const pizzaSize = {"id":"pizza-size","label":"Choose a Size","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"pizza-10","label":"10\" Personal","priceDelta":0,"isDefault":true},{"id":"pizza-12","label":"12\" Small","priceDelta":300},{"id":"pizza-14","label":"14\" Medium","priceDelta":600},{"id":"pizza-16","label":"16\" Large","priceDelta":900}]};
  const pizzaCrust = {"id":"pizza-crust","label":"Choose Crust","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"crust-thin","label":"Thin & Crispy","priceDelta":0,"isDefault":true},{"id":"crust-hand","label":"Hand-Tossed","priceDelta":0},{"id":"crust-deep","label":"Deep Dish","priceDelta":200},{"id":"crust-cauliflower","label":"Cauliflower (GF)","priceDelta":300}]};
  const drinkSize = {"id":"drink-size","label":"Choose Size","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"drink-sm","label":"Small (12 oz)","priceDelta":0,"isDefault":true},{"id":"drink-md","label":"Medium (16 oz)","priceDelta":50},{"id":"drink-lg","label":"Large (22 oz)","priceDelta":100}]};
  const bowlBase = {"id":"bowl-base","label":"Choose Your Base","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"base-white-rice","label":"Steamed White Rice","priceDelta":0,"isDefault":true},{"id":"base-brown-rice","label":"Brown Rice","priceDelta":0},{"id":"base-quinoa","label":"Quinoa","priceDelta":100},{"id":"base-greens","label":"Mixed Greens","priceDelta":0}]};
  const bowlSauce = {"id":"bowl-sauce","label":"Choose Sauce","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"bs-teriyaki","label":"Teriyaki Glaze","priceDelta":0,"isDefault":true},{"id":"bs-ponzu","label":"Citrus Ponzu","priceDelta":0},{"id":"bs-spicy-miso","label":"Spicy Miso","priceDelta":0},{"id":"bs-tahini","label":"Lemon Tahini","priceDelta":0}]};
  const proteinChoice = {"id":"protein-choice","label":"Add Protein","type":"single","minSelections":0,"maxSelections":1,"options":[{"id":"prot-none","label":"No Protein","priceDelta":0,"isDefault":true},{"id":"prot-chicken","label":"Grilled Chicken","priceDelta":300},{"id":"prot-shrimp","label":"Shrimp","priceDelta":350},{"id":"prot-salmon","label":"Salmon","priceDelta":400},{"id":"prot-tofu","label":"Crispy Tofu","priceDelta":200}]};
  const tacoShell = {"id":"taco-shell","label":"Choose Shell","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"shell-corn","label":"Corn Tortilla","priceDelta":0,"isDefault":true},{"id":"shell-flour","label":"Flour Tortilla","priceDelta":0},{"id":"shell-lettuce","label":"Lettuce Wrap (GF)","priceDelta":0}]};
  const pastaType = {"id":"pasta-type","label":"Choose Pasta","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"pasta-spaghetti","label":"Spaghetti","priceDelta":0,"isDefault":true},{"id":"pasta-penne","label":"Penne Rigate","priceDelta":0},{"id":"pasta-rigatoni","label":"Rigatoni","priceDelta":0},{"id":"pasta-gf","label":"Gluten-Free Penne","priceDelta":200}]};
  const saladDressing = {"id":"salad-dressing","label":"Choose Dressing","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"dress-caesar","label":"Classic Caesar","priceDelta":0,"isDefault":true},{"id":"dress-balsamic","label":"Aged Balsamic","priceDelta":0},{"id":"dress-ranch","label":"Buttermilk Ranch","priceDelta":0},{"id":"dress-lemon","label":"Lemon Herb Vinaigrette","priceDelta":0}]};
  const sushiExtras = {"id":"sushi-extras","label":"Add Extras","type":"multi","minSelections":0,"maxSelections":4,"options":[{"id":"se-extra-sauce","label":"Extra Sauce","priceDelta":50},{"id":"se-spicy","label":"Make it Spicy","priceDelta":0},{"id":"se-avocado","label":"Extra Avocado","priceDelta":150},{"id":"se-tempura","label":"Tempura Crunch","priceDelta":100}]};

  const IMG = "https://images.unsplash.com/photo-";

  // BURGERS (8)
  p("burger-01","The Bistro Classic","Our signature smash-patty burger on a toasted brioche bun with Bistro special sauce, crisp lettuce, vine-ripened tomato, and house pickles.",1299,IMG+"1568901346375-23c9450c58cd?w=800","burgers",["popular"],720,4.9,2847,[burgerPatty,burgerCheese,...sideChoice]);
  p("burger-02","Truffle Mushroom Melt","Wagyu beef patty topped with sautéed wild mushrooms, truffle mayo, melted Swiss cheese, and caramelized onions on a pretzel bun.",1699,IMG+"1553979459-d2229ba7433b?w=800","burgers",["featured"],890,4.8,1203,[burgerPatty,...sideChoice]);
  p("burger-03","Spicy Crispy Chicken","Hand-breaded crispy chicken thigh with Nashville hot sauce, dill pickle chips, and honey butter on a toasted potato bun.",1399,IMG+"1606755962773-d324e0a13086?w=800","burgers",["spicy","popular"],810,4.7,987,[spiceLevel,...sideChoice]);
  p("burger-04","Garden Smash Burger","Crispy smashed plant-based patty with vegan cheddar, shredded lettuce, tomato, pickled red onion, and chipotle aioli.",1449,IMG+"1520072959219-c595dc870360?w=800","burgers",["vegan","popular"],640,4.6,654,[...sideChoice]);
  p("burger-05","BBQ Bacon Stack","Double smash patties, thick-cut applewood bacon, cheddar, crispy onion strings, and smoky BBQ sauce.",1799,IMG+"1594212699903-ec8a3eca50f5?w=800","burgers",["popular"],1050,4.8,1456,[burgerPatty,...sideChoice]);
  p("burger-06","Avocado Ranch Burger","Fresh beef patty with creamy avocado, crispy bacon, pepper jack cheese, and house ranch on a toasted brioche bun.",1549,IMG+"1550547660-d9450f859349?w=800","burgers",["popular"],920,4.7,876,[burgerPatty,...sideChoice]);
  p("burger-07","Breakfast Burger","Beef patty topped with a fried egg, crispy bacon, American cheese, and sriracha mayo. Served all day.",1499,IMG+"1565299507177-b0ac66763828?w=800","burgers",["popular"],980,4.6,543,[...sideChoice]);
  p("burger-08","Mushroom Swiss Veggie","Portobello mushroom cap, Swiss cheese, roasted red peppers, arugula, and garlic aioli on a whole wheat bun.",1249,IMG+"1571091718767-18b5b1457add?w=800","burgers",["vegetarian"],520,4.5,321,[...sideChoice]);

  // PIZZA (6)
  p("pizza-01","Margherita Classica","San Marzano tomato sauce, fresh buffalo mozzarella, hand-torn basil, and extra-virgin olive oil on a wood-fired crust.",1599,IMG+"1574071318508-1cdbab80d002?w=800","pizza",["vegetarian","popular"],680,4.9,3102,[pizzaSize,pizzaCrust]);
  p("pizza-02","Truffle Funghi","White truffle cream base, wild mushroom medley, fontina cheese, fresh thyme, and black truffle oil.",2199,IMG+"1565299624946-b28f40a0ae38?w=800","pizza",["vegetarian","featured"],760,4.8,891,[pizzaSize,pizzaCrust]);
  p("pizza-03","Spicy Diavola","Spicy tomato sauce, Calabrian chili, spicy salami, fresh mozzarella, and honey drizzle.",1899,IMG+"1513104890138-7c749659a591?w=800","pizza",["spicy","popular"],820,4.7,1234,[pizzaSize,pizzaCrust,spiceLevel]);
  p("pizza-04","BBQ Chicken Ranch","Smoky BBQ sauce, grilled chicken, red onion, corn, mozzarella, and ranch drizzle.",1799,IMG+"1571407970349-bc81e7e96d47?w=800","pizza",["popular"],790,4.6,2011,[pizzaSize,pizzaCrust]);
  p("pizza-05","Vegan Garden Harvest","Roasted garlic olive oil, seasonal roasted vegetables, vegan mozzarella, sun-dried tomatoes, and fresh arugula.",1699,IMG+"1593560708920-61dd98c46a4e?w=800","pizza",["vegan","gluten-free"],590,4.5,445,[pizzaSize,pizzaCrust]);
  p("pizza-06","Four Cheese","Tomato base with mozzarella, gorgonzola, fontina, and Parmigiano-Reggiano. Finished with fresh basil.",1899,IMG+"1548369937-47519962c11a?w=800","pizza",["vegetarian"],850,4.8,1567,[pizzaSize,pizzaCrust]);

  // SUSHI (6)
  p("sushi-01","Dragon Roll","Shrimp tempura and cucumber inside, topped with avocado, tobiko, and eel sauce. 8 pieces.",1699,IMG+"1617196034183-421b4040ed20?w=800","sushi",["popular","featured"],420,4.9,2156,[sushiExtras]);
  p("sushi-02","Spicy Tuna Roll","Fresh sushi-grade tuna, spicy mayo, cucumber, and scallions. 8 pieces.",1499,IMG+"1562802378-063ec186a863?w=800","sushi",["spicy","popular"],380,4.8,1789,[spiceLevel,sushiExtras]);
  p("sushi-03","Rainbow Roll","California roll base topped with alternating tuna, salmon, yellowtail, and avocado. 8 pieces.",1899,IMG+"1611143669185-af224c5e3252?w=800","sushi",["featured"],460,4.9,3401,[sushiExtras]);
  p("sushi-04","Veggie Avocado Roll","Creamy avocado, cucumber, pickled daikon, and sesame seeds. 8 pieces.",1099,IMG+"1559410545-0bdcd187e0a6?w=800","sushi",["vegan","gluten-free"],290,4.5,678,[sushiExtras]);
  p("sushi-05","Salmon Sashimi (6 pcs)","Premium Atlantic salmon, hand-sliced to order. Served with pickled ginger, wasabi, and soy sauce.",1999,IMG+"1534482421-64566f976cfa?w=800","sushi",["gluten-free","popular"],210,4.9,1102,[]);
  p("sushi-06","Volcano Roll","Spicy tuna inside, topped with baked scallop, spicy mayo, and masago. 8 pieces.",1799,IMG+"1617196034099-5b4e5e4e4e4e?w=800","sushi",["spicy"],440,4.7,876,[spiceLevel]);

  // BOWLS (5)
  p("bowl-01","Bistro Poke Bowl","Sushi-grade ahi tuna, edamame, cucumber, mango, avocado, and tobiko over seasoned sushi rice with ponzu.",1799,IMG+"1546069901-ba9599a7e63c?w=800","bowls",["gluten-free","popular"],580,4.9,2234,[bowlBase,{"id":"protein-choice","label":"Choose Protein","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"prot-tuna","label":"Ahi Tuna","priceDelta":0,"isDefault":true},{"id":"prot-salmon","label":"Salmon","priceDelta":200},{"id":"prot-chicken","label":"Grilled Chicken","priceDelta":0},{"id":"prot-tofu","label":"Crispy Tofu","priceDelta":0}]},bowlSauce]);
  p("bowl-02","Korean BBQ Bowl","Gochujang-marinated beef bulgogi, kimchi, pickled daikon, cucumber, sesame seeds over steamed rice.",1699,IMG+"1547592180-85f173990554?w=800","bowls",["spicy","popular"],650,4.8,1567,[bowlBase,spiceLevel,bowlSauce]);
  p("bowl-03","Mediterranean Grain Bowl","Quinoa, roasted chickpeas, cucumber, cherry tomatoes, kalamata olives, feta, and tzatziki.",1499,IMG+"1512621776951-a57141f2eefd?w=800","bowls",["vegetarian","gluten-free"],490,4.7,889,[bowlBase,bowlSauce]);
  p("bowl-04","Teriyaki Salmon Bowl","Pan-seared Atlantic salmon glazed with house teriyaki, steamed broccoli, edamame, shredded carrots.",1999,IMG+"1467003909585-2f8a72700288?w=800","bowls",["gluten-free","featured"],620,4.9,1890,[bowlBase,bowlSauce]);
  p("bowl-05","Acai Power Bowl","Organic acai blend, granola, fresh banana, blueberries, strawberries, honey, and coconut flakes.",1399,IMG+"1590301157890-4810ed352733?w=800","bowls",["vegan","gluten-free"],480,4.8,1234,[]);

  // TACOS (4)
  p("taco-01","Carne Asada Tacos (3)","Grilled marinated skirt steak, charred corn salsa, cotija cheese, pickled red onion, and cilantro on corn tortillas.",1499,IMG+"1565299585323-38d6b0865b47?w=800","tacos",["popular","gluten-free"],540,4.8,1678,[tacoShell,spiceLevel]);
  p("taco-02","Baja Fish Tacos (3)","Beer-battered cod, shredded cabbage, chipotle crema, mango salsa, and pickled jalapeños on flour tortillas.",1599,IMG+"1551504734-5ee1c4a1479b?w=800","tacos",["popular"],490,4.7,1234,[tacoShell,spiceLevel]);
  p("taco-03","Al Pastor Tacos (3)","Achiote-marinated pork, pineapple, white onion, and cilantro on corn tortillas with salsa verde.",1399,IMG+"1552332386-f8dd00dc2f85?w=800","tacos",["popular"],510,4.9,2345,[tacoShell,spiceLevel]);
  p("taco-04","Roasted Veggie Tacos (3)","Roasted sweet potato, black beans, charred corn, avocado crema, and pickled cabbage on corn tortillas.",1299,IMG+"1613514785940-daed07799d9b?w=800","tacos",["vegan","gluten-free"],420,4.6,567,[tacoShell]);

  // PASTA (5)
  p("pasta-01","Cacio e Pepe","Roman classic: al dente spaghetti tossed with Pecorino Romano, Parmigiano-Reggiano, and freshly cracked black pepper.",1699,IMG+"1621996346565-e3dbc646d9a9?w=800","pasta",["vegetarian","popular"],620,4.9,1890,[pastaType]);
  p("pasta-02","Lobster Linguine","Fresh Maine lobster, cherry tomatoes, garlic, white wine, chili flakes, and fresh parsley in a light bisque sauce.",3299,IMG+"1563379926898-05f4575a45d8?w=800","pasta",["featured"],780,4.9,678,[pastaType]);
  p("pasta-03","Bolognese Ragu","Slow-braised beef and pork ragu, San Marzano tomatoes, soffritto, and red wine. Finished with Parmigiano.",1999,IMG+"1598866594230-a7c12756260f?w=800","pasta",["popular"],840,4.8,2103,[pastaType]);
  p("pasta-04","Pesto Primavera","House-made basil pesto, seasonal roasted vegetables, cherry tomatoes, pine nuts, and shaved Parmigiano.",1599,IMG+"1473093295043-cdd812d0e601?w=800","pasta",["vegetarian","popular"],560,4.7,1102,[pastaType,proteinChoice]);
  p("pasta-05","Carbonara","Guanciale, egg yolk, Pecorino Romano, and black pepper. The authentic Roman way — no cream.",1799,IMG+"1612874742237-6526221588e3?w=800","pasta",["popular"],720,4.8,1456,[pastaType]);

  // SALADS (4)
  p("salad-01","Bistro Caesar","Crisp romaine hearts, house-made Caesar dressing, shaved Parmigiano-Reggiano, house croutons, and white anchovies.",1399,IMG+"1550304943-4f24f54ddde9?w=800","salads",["popular"],420,4.8,1456,[saladDressing,proteinChoice]);
  p("salad-02","Harvest Kale Salad","Massaged lacinato kale, roasted butternut squash, dried cranberries, candied pecans, goat cheese, and apple cider vinaigrette.",1499,IMG+"1512621776951-a57141f2eefd?w=800","salads",["vegetarian","gluten-free"],380,4.7,789,[saladDressing,proteinChoice]);
  p("salad-03","Niçoise Salad","Seared ahi tuna, haricots verts, cherry tomatoes, Niçoise olives, hard-boiled egg, and fingerling potatoes with lemon vinaigrette.",1899,IMG+"1540420773420-3366772f4999?w=800","salads",["gluten-free","featured"],490,4.8,567,[saladDressing]);
  p("salad-04","Greek Village Salad","Heirloom tomatoes, cucumber, red onion, Kalamata olives, and a thick slab of barrel-aged feta with oregano and olive oil.",1299,IMG+"1546069901-d5bfd2cbfb1f?w=800","salads",["vegetarian","gluten-free"],320,4.6,432,[]);

  // DESSERTS (6)
  p("dessert-01","Warm Chocolate Lava Cake","Decadent dark chocolate cake with a molten center, served with Madagascar vanilla bean ice cream and raspberry coulis.",999,IMG+"1606313564200-e75d5e30476c?w=800","desserts",["popular","featured"],680,4.9,3456,[{"id":"lava-extras","label":"Add Extras","type":"multi","minSelections":0,"maxSelections":3,"options":[{"id":"le-ice-cream","label":"Extra Scoop of Ice Cream","priceDelta":200},{"id":"le-whipped","label":"Whipped Cream","priceDelta":75},{"id":"le-caramel","label":"Salted Caramel Drizzle","priceDelta":100},{"id":"le-berries","label":"Fresh Berries","priceDelta":150}]}]);
  p("dessert-02","New York Cheesecake","Classic dense and creamy New York-style cheesecake on a graham cracker crust with seasonal berry compote.",849,IMG+"1533134242443-d4fd215305ad?w=800","desserts",["popular"],520,4.8,2109,[]);
  p("dessert-03","Tiramisu","Authentic Italian tiramisu with espresso-soaked ladyfingers, mascarpone cream, and a generous dusting of cocoa.",899,IMG+"1571877227200-a0d98ea607e9?w=800","desserts",["popular"],450,4.9,1876,[]);
  p("dessert-04","Vegan Mango Sorbet","Three scoops of house-made Alphonso mango sorbet with fresh mint and a lime zest garnish.",699,IMG+"1488900128323-21503983a07e?w=800","desserts",["vegan","gluten-free","dairy-free"],210,4.6,445,[]);
  p("dessert-05","Crème Brûlée","Classic French vanilla custard with a perfectly caramelized sugar crust. Served with fresh berries.",849,IMG+"1470124182917-cc6e71b22ecc?w=800","desserts",["vegetarian","gluten-free"],380,4.8,987,[]);
  p("dessert-06","Churros with Chocolate","Crispy cinnamon-sugar churros served with rich dark chocolate dipping sauce and dulce de leche.",799,IMG+"1624371414361-e670edf4b0b4?w=800","desserts",["vegetarian"],420,4.7,765,[]);

  // DRINKS (6)
  p("drink-01","Craft Lemonade","Fresh-squeezed lemonade with your choice of flavor: classic, strawberry, lavender, or mango chili.",499,IMG+"1621263764928-df1444c5e859?w=800","drinks",["vegan","gluten-free"],180,4.7,1234,[drinkSize,{"id":"lemonade-flavor","label":"Choose Flavor","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"lf-classic","label":"Classic","priceDelta":0,"isDefault":true},{"id":"lf-strawberry","label":"Strawberry","priceDelta":0},{"id":"lf-lavender","label":"Lavender","priceDelta":0},{"id":"lf-mango-chili","label":"Mango Chili","priceDelta":0}]}]);
  p("drink-02","Matcha Latte","Ceremonial-grade Japanese matcha whisked with steamed oat milk and a touch of honey. Hot or iced.",649,IMG+"1536256263959-770b48d82b0a?w=800","drinks",["vegan","gluten-free"],140,4.8,987,[drinkSize,{"id":"latte-temp","label":"Temperature","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"temp-hot","label":"Hot","priceDelta":0,"isDefault":true},{"id":"temp-iced","label":"Iced","priceDelta":0}]},{"id":"latte-milk","label":"Choose Milk","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"milk-oat","label":"Oat Milk","priceDelta":0,"isDefault":true},{"id":"milk-almond","label":"Almond Milk","priceDelta":0},{"id":"milk-whole","label":"Whole Milk","priceDelta":0}]}]);
  p("drink-03","Sparkling Water","Chilled San Pellegrino sparkling mineral water.",299,IMG+"1559839734-2b71ea197ec2?w=800","drinks",["vegan","gluten-free","dairy-free"],0,4.5,234,[]);
  p("drink-04","Fresh Pressed Juice","Cold-pressed daily. Green Detox (kale, cucumber, apple, ginger), Sunrise (orange, carrot, turmeric), or Berry Blast.",799,IMG+"1600271886742-f049cd451bba?w=800","drinks",["vegan","gluten-free","dairy-free"],120,4.7,678,[{"id":"juice-flavor","label":"Choose Juice","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"jf-green","label":"Green Detox","priceDelta":0,"isDefault":true},{"id":"jf-sunrise","label":"Sunrise","priceDelta":0},{"id":"jf-berry","label":"Berry Blast","priceDelta":0}]}]);
  p("drink-05","Cold Brew Coffee","Smooth 24-hour cold brew concentrate over ice. Served black or with oat milk.",549,IMG+"1461023058943-07fcbe16d735?w=800","drinks",["vegan","gluten-free"],10,4.8,876,[{"id":"cold-brew-milk","label":"Add Milk","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"cb-black","label":"Black","priceDelta":0,"isDefault":true},{"id":"cb-oat","label":"Oat Milk","priceDelta":50},{"id":"cb-almond","label":"Almond Milk","priceDelta":50}]}]);
  p("drink-06","Mango Lassi","Creamy blend of fresh Alphonso mango, yogurt, cardamom, and a hint of rose water.",599,IMG+"1553361371-9b22f78e8b1d?w=800","drinks",["vegetarian","gluten-free"],220,4.7,543,[]);

  // DEALS (3)
  p("deal-01","Burger + Fries + Drink Combo","Any classic burger, large fries, and a 16 oz craft lemonade. Save $4 vs ordering separately.",1999,IMG+"1550547660-d9450f859349?w=800","deals",["popular","featured"],1100,4.8,4521,[{"id":"burger-patty","label":"Choose Your Patty","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"patty-single","label":"Single","priceDelta":0,"isDefault":true},{"id":"patty-double","label":"Double","priceDelta":200}]},{"id":"combo-drink","label":"Choose Your Drink","type":"single","minSelections":1,"maxSelections":1,"options":[{"id":"cd-lemonade","label":"Craft Lemonade","priceDelta":0,"isDefault":true},{"id":"cd-water","label":"Sparkling Water","priceDelta":0},{"id":"cd-juice","label":"Fresh Pressed Juice","priceDelta":200}]}]);
  p("deal-02","Sushi Feast for Two","Dragon Roll + Rainbow Roll + Spicy Tuna Roll + 2 Miso Soups. Save $8.",4999,IMG+"1617196034183-421b4040ed20?w=800","deals",["featured"],1200,4.9,1234,[]);
  p("deal-03","Pizza + Salad Lunch Deal","Any 10\" personal pizza with a Bistro Caesar salad. Available 11am–3pm. Save $5.",2199,IMG+"1574071318508-1cdbab80d002?w=800","deals",["popular"],900,4.7,2109,[pizzaCrust]);

  ins.free();
  console.log("[DB] Seeded successfully.");
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY HELPERS — typed wrappers around sql.js
// ─────────────────────────────────────────────────────────────────────────────

/** Run a SELECT and return typed rows */
export function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

/** Run a single-row SELECT */
export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): T | null {
  const rows = query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run INSERT / UPDATE / DELETE and persist to disk */
export function run(
  sql: string,
  params: (string | number | null)[] = []
): void {
  const db = getDb();
  db.run(sql, params);
  persist(db);
}

/** Generate a UUID v4 */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Parse JSON column safely */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
