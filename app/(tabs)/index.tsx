/**
 * app/(tabs)/index.tsx
 * Home screen matching the reference UI:
 * - "DELIVER TO" header with cart badge
 * - Greeting: "Hey [Name], Good [Time]!"
 * - Search bar
 * - All Categories horizontal scroll (food image cards)
 * - Open Restaurants section (full-width image cards)
 */

import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MenuItemCard from "@/components/MenuItemCard";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { THE_BISTRO, getItemsByCategory } from "@/data/menu";
import { RESTAURANTS } from "@/data/restaurants";
import { useAuth, useCart, useCartItemCount, useUI } from "@/store";
import { formatPrice } from "@/utils/format";
import type { MenuItem } from "@shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY CARD (food image style from reference)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_IMAGES: Record<string, string> = {
  deals:    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300",
  burgers:  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300",
  pizza:    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300",
  sushi:    "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300",
  bowls:    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300",
  tacos:    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300",
  pasta:    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300",
  salads:   "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300",
  desserts: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300",
  drinks:   "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300",
};

const CATEGORY_PRICES: Record<string, number> = {
  deals: 999, burgers: 1299, pizza: 1599, sushi: 1499,
  bowls: 1799, tacos: 1399, pasta: 1699, salads: 1299,
  desserts: 899, drinks: 599,
};

interface CategoryCardProps {
  id: string;
  label: string;
  isActive: boolean;
  onPress: (id: string) => void;
}

function CategoryCard({ id, label, isActive, onPress }: CategoryCardProps) {
  const imageUrl = CATEGORY_IMAGES[id] ?? CATEGORY_IMAGES.deals;
  const price = CATEGORY_PRICES[id] ?? 999;
  return (
    <TouchableOpacity
      style={[cc.card, isActive && cc.cardActive]}
      onPress={() => onPress(id)}
      activeOpacity={0.85}
    >
      <Image source={{ uri: imageUrl }} style={cc.image} resizeMode="cover" />
      <Text style={[cc.label, isActive && cc.labelActive]}>{label}</Text>
      {isActive ? (
        <Text style={cc.price}>{formatPrice(price)}</Text>
      ) : (
        <View style={cc.priceRow}>
          <Text style={cc.priceLabel}>Starting</Text>
          <Text style={cc.priceValue}>{formatPrice(price)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const cc = StyleSheet.create({
  card: {
    width: 120,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    padding: Spacing.sm,
    alignItems: "center",
    gap: Spacing.xs,
    marginRight: Spacing.md,
    ...Shadow.card,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: Colors.brand.primary,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: Radius.lg,
  },
  label: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    textAlign: "center",
  },
  labelActive: { color: Colors.brand.primary },
  priceRow: { alignItems: "center" },
  priceLabel: { fontSize: 10, color: Colors.neutral.secondary },
  priceValue: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  price: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANT CARD (full-width from reference)
// ─────────────────────────────────────────────────────────────────────────────

interface RestaurantCardProps {
  name: string;
  imageUrl: string;
  cuisines: string[];
  rating: number;
  deliveryFee: string;
  deliveryTime: string;
  onPress: () => void;
}

function RestaurantCard({ name, imageUrl, cuisines, rating, deliveryFee, deliveryTime, onPress }: RestaurantCardProps) {
  return (
    <TouchableOpacity style={rc.card} onPress={onPress} activeOpacity={0.88}>
      <Image source={{ uri: imageUrl }} style={rc.image} resizeMode="cover" />
      <View style={rc.info}>
        <Text style={rc.name}>{name}</Text>
        <Text style={rc.cuisines}>{cuisines.join(" · ")}</Text>
        <View style={rc.metaRow}>
          <Text style={rc.star}>☆</Text>
          <Text style={rc.rating}>{rating.toFixed(1)}</Text>
          <View style={rc.dot} />
          <Text style={rc.meta}>🛵 {deliveryFee}</Text>
          <View style={rc.dot} />
          <Text style={rc.meta}>⏱ {deliveryTime}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const rc = StyleSheet.create({
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  image: { width: "100%", height: 180 },
  info: { padding: Spacing.base, gap: Spacing.xs },
  name: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  cuisines: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: 2 },
  star: { fontSize: 14, color: Colors.brand.gold },
  rating: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.neutral.divider },
  meta: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOME SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const cartCount = useCartItemCount();
  const { activeCategoryId, setActiveCategory } = useUI();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const activeItems = getItemsByCategory(activeCategoryId);
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  const handleQuickAdd = useCallback((item: MenuItem) => {
    const hasRequired = item.customizationGroups.some((g) => g.minSelections > 0);
    if (hasRequired) { router.push(`/item/${item.id}` as any); return; }
    addItem(item.id, 1, []);
  }, [addItem, router]);

  const handleItemPress = useCallback((item: MenuItem) => {
    router.push(`/item/${item.id}` as any);
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 700));
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.brand.primary} />
        }
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.sm }]}
      >
        {/* ── Top header ── */}
        <View style={styles.header}>
          {/* Left: menu + deliver to */}
          <TouchableOpacity style={styles.menuBtn}>
            <SymbolView name={{ ios: "line.3.horizontal", android: "menu", web: "menu" }} tintColor={Colors.neutral.primary} size={22} />
          </TouchableOpacity>

          <View style={styles.deliverBlock}>
            <Text style={styles.deliverLabel}>DELIVER TO</Text>
            <TouchableOpacity style={styles.deliverRow}>
              <Text style={styles.deliverAddress} numberOfLines={1}>
                {THE_BISTRO.address.split(",")[0]}
              </Text>
              <Text style={styles.deliverChevron}> ▾</Text>
            </TouchableOpacity>
          </View>

          {/* Right: cart badge */}
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => router.push("/(tabs)/cart")}
          >
            <SymbolView name={{ ios: "bag.fill", android: "shopping_bag", web: "shopping_bag" }} tintColor={Colors.neutral.white} size={20} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Greeting ── */}
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            Hey {firstName},{" "}
            <Text style={styles.greetingBold}>{getGreeting()}!</Text>
          </Text>
        </View>

        {/* ── Search bar ── */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/search" as any)}
          accessibilityRole="search"
        >
          <SymbolView name={{ ios: "magnifyingglass", android: "search", web: "search" }} tintColor={Colors.neutral.placeholder} size={18} />
          <Text style={styles.searchPlaceholder}>Search dishes, restaurants</Text>
        </TouchableOpacity>

        {/* ── All Categories ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Categories</Text>
          <TouchableOpacity onPress={() => router.push("/search" as any)}>
            <Text style={styles.seeAll}>See All &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {THE_BISTRO.categories
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((cat) => (
              <CategoryCard
                key={cat.id}
                id={cat.id}
                label={cat.label}
                isActive={activeCategoryId === cat.id}
                onPress={setActiveCategory}
              />
            ))}
        </ScrollView>

        {/* ── Open Restaurants ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open Restaurants</Text>
          <TouchableOpacity onPress={() => router.push("/restaurants" as any)}>
            <Text style={styles.seeAll}>See All &gt;</Text>
          </TouchableOpacity>
        </View>

        {RESTAURANTS.slice(0, 3).map((r) => (
          <RestaurantCard
            key={r.id}
            name={r.name}
            imageUrl={r.imageUrl}
            cuisines={r.cuisines.slice(0, 4)}
            rating={r.rating}
            deliveryFee={r.deliveryFee === 0 ? "Free" : formatPrice(r.deliveryFee)}
            deliveryTime={r.deliveryTime}
            onPress={() => router.push(`/restaurants/${r.id}` as any)}
          />
        ))}

        {/* ── Popular Items section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {THE_BISTRO.categories.find((c) => c.id === activeCategoryId)?.label ?? "Popular"}
          </Text>
          <Text style={styles.seeAll}>{activeItems.length} items</Text>
        </View>

        <View style={styles.itemList}>
          {activeItems.slice(0, 6).map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              isHighlighted={false}
              onPress={handleItemPress}
              onQuickAdd={handleQuickAdd}
            />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.neutral.offWhite },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing["2xl"] },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.neutral.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  deliverBlock: { flex: 1 },
  deliverLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
    letterSpacing: 1,
  },
  deliverRow: { flexDirection: "row", alignItems: "center" },
  deliverAddress: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.neutral.primary,
  },
  deliverChevron: { fontSize: 12, color: Colors.neutral.secondary },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral.primary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.neutral.white,
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    lineHeight: 12,
  },

  // Greeting
  greetingRow: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontSize: Typography.size.lg,
    color: Colors.neutral.primary,
  },
  greetingBold: {
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
    height: 52,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.xl,
  },
  searchPlaceholder: {
    fontSize: Typography.size.base,
    color: Colors.neutral.placeholder,
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  seeAll: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.secondary,
    fontWeight: Typography.weight.medium,
  },

  // Category scroll
  categoryScroll: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.lg,
  },

  // Item list
  itemList: {
    paddingHorizontal: Spacing.base,
  },
});
