/**
 * app/restaurants/[id].tsx
 * Restaurant detail screen.
 * - Hero image with back button (no ··· button)
 * - Rating / delivery / time meta row
 * - Category filter tabs (horizontal scroll)
 * - 2-column menu grid — tapping an item opens item detail if it exists in
 *   MENU_ITEM_MAP, otherwise shows a quick-add sheet
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { MENU_ITEM_MAP } from "@/data/menu";
import { RESTAURANT_MAP } from "@/data/restaurants";
import { useBistroStore } from "@/store";
import { formatPrice } from "@/utils/format";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const restaurant = RESTAURANT_MAP.get(id ?? "");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const handleAdd = useCallback((menuItemId: string) => {
    const item = restaurant?.menu.find((m) => m.id === menuItemId);
    if (!item || !restaurant) return;

    // Directly set cart state — restaurant items bypass THE_BISTRO lookup
    const lineItemId = `li_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const { cart, pricing } = useBistroStore.getState();

    const newItem = {
      lineItemId,
      menuItemId: item.id,
      name: item.name,
      basePrice: item.price,
      quantity: 1,
      selectedCustomizations: [],
      unitPrice: item.price,
      lineTotal: item.price,
    };

    const updatedItems = [...cart.items, newItem];
    const subtotal = updatedItems.reduce((s, i) => s + i.lineTotal, 0);
    const serviceFee = Math.round(subtotal * 0.05);
    const tax = Math.round(subtotal * 0.0875);
    const total = subtotal + serviceFee + (restaurant.deliveryFee) + tax + cart.tipAmount - cart.promoDiscount;

    useBistroStore.setState({
      cart: { ...cart, items: updatedItems },
      pricing: { ...pricing, subtotal, serviceFee, deliveryFee: restaurant.deliveryFee, tax, total: Math.max(0, total) },
      recentlyUpdatedLineItemIds: [lineItemId],
    });
  }, [restaurant]);

  const handleItemPress = useCallback((item: { id: string; menuItemId?: string }) => {
    // If the item has a menuItemId mapping, open the full item detail with customizations
    const targetId = item.menuItemId ?? item.id;
    if (MENU_ITEM_MAP.has(targetId)) {
      router.push(`/item/${targetId}` as any);
    }
    // Items without a mapping (e.g. Loaded Fries) are added via the + button only
  }, [router]);

  if (!restaurant) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md }}>
        <Text style={{ fontSize: Typography.size.lg, color: Colors.neutral.secondary }}>
          Restaurant not found
        </Text>
        <BackButton />
      </View>
    );
  }

  const categories = ["all", ...restaurant.categories];
  const filteredMenu = activeCategory === "all"
    ? restaurant.menu
    : restaurant.menu.filter((item) => item.category === activeCategory);

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>

        {/* ── Hero ── */}
        <View style={s.heroWrap}>
          <Image source={{ uri: restaurant.imageUrl }} style={s.heroImage} resizeMode="cover" />
          <View style={s.heroOverlay} />
          {/* Back button only — no ··· */}
          <View style={[s.heroButtons, { top: insets.top + Spacing.sm }]}>
            <BackButton
              tintColor={Colors.neutral.white}
              bgColor="rgba(0,0,0,0.4)"
            />
          </View>
        </View>

        {/* ── Info card (sticky) ── */}
        <View style={s.infoCard}>
          <Text style={s.restaurantName}>{restaurant.name}</Text>
          <Text style={s.tagline}>{restaurant.tagline}</Text>
          <View style={s.metaRow}>
            <Text style={s.star}>★</Text>
            <Text style={s.rating}>{restaurant.rating.toFixed(1)}</Text>
            <View style={s.dot} />
            <Text style={s.meta}>🛵 {restaurant.deliveryFee === 0 ? "Free" : formatPrice(restaurant.deliveryFee)}</Text>
            <View style={s.dot} />
            <Text style={s.meta}>⏱ {restaurant.deliveryTime}</Text>
          </View>

          {/* Category tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabsScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.tab, activeCategory === cat && s.tabActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[s.tabText, activeCategory === cat && s.tabTextActive]}>
                  {cat === "all" ? "All" : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Menu section ── */}
        <View style={s.menuSection}>
          <Text style={s.sectionTitle}>
            {activeCategory === "all" ? "All Items" : activeCategory}
            <Text style={s.sectionCount}> ({filteredMenu.length})</Text>
          </Text>

          {/* 2-column grid */}
          <View style={s.grid}>
            {filteredMenu.map((item) => (
              <View key={item.id} style={s.gridItem}>
                <TouchableOpacity
                  style={s.menuCard}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.88}
                >
                  <View style={s.menuImageWrap}>
                    <Image source={{ uri: item.imageUrl }} style={s.menuImage} resizeMode="cover" />
                    {item.isPopular && (
                      <View style={s.popularBadge}>
                        <Text style={s.popularText}>⭐ Popular</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.menuInfo}>
                    <Text style={s.menuName} numberOfLines={2}>{item.name}</Text>
                    <Text style={s.menuDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={s.menuFooter}>
                      <Text style={s.menuPrice}>{formatPrice(item.price)}</Text>
                      <TouchableOpacity
                        style={s.addBtn}
                        onPress={() => handleAdd(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={s.addBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.neutral.offWhite },

  // Hero
  heroWrap: { height: 260, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  heroButtons: {
    position: "absolute",
    left: Spacing.base,
  },

  // Info card (sticky)
  infoCard: {
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: 0,
    gap: Spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  restaurantName: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
    letterSpacing: -0.4,
  },
  tagline: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: 2 },
  star: { fontSize: 14, color: "#F59E0B" },
  rating: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.neutral.divider },
  meta: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },

  // Category tabs
  tabsScroll: {
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.white,
  },
  tabActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  tabText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.neutral.secondary,
  },
  tabTextActive: { color: Colors.neutral.white },

  // Menu section
  menuSection: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  sectionCount: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.regular,
    color: Colors.neutral.secondary,
  },

  // 2-column grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  gridItem: {
    width: "47.5%",
  },
  menuCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.card,
  },
  menuImageWrap: { position: "relative" },
  menuImage: { width: "100%", height: 130 },
  popularBadge: {
    position: "absolute",
    top: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  popularText: { fontSize: 9, color: Colors.neutral.white, fontWeight: Typography.weight.bold },
  menuInfo: { padding: Spacing.sm, gap: 4 },
  menuName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    lineHeight: 18,
  },
  menuDesc: {
    fontSize: 11,
    color: Colors.neutral.secondary,
    lineHeight: 15,
  },
  menuFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  menuPrice: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
  },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.brand.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    fontSize: 18,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
    lineHeight: 22,
  },
});
