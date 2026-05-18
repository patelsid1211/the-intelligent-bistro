/**
 * app/account/favourites.tsx
 * Favourite items screen — saved menu items with quick-add to cart.
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useBistroStore, useCart, useMenu } from "@/store";
import { fetchFavourites, removeFavourite } from "@/store/apiClient";
import { formatPrice } from "@/utils/format";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULT_FAVOURITES = ["burger-01", "pizza-01", "sushi-01", "bowl-01", "dessert-01"];

// ─────────────────────────────────────────────────────────────────────────────
// FAVOURITE CARD
// ─────────────────────────────────────────────────────────────────────────────

interface FavCardProps {
  menuItemId: string;
  onRemove: (id: string) => void;
  onAdd: (id: string) => void;
}

function FavCard({ menuItemId, onRemove, onAdd }: FavCardProps) {
  const { menuItemMap, categories } = useMenu();
  const item = menuItemMap.get(menuItemId);
  if (!item) return null;

  const category = categories.find((c) => c.id === item.categoryId);

  return (
    <View style={fc.card}>
      <Image source={{ uri: item.imageUrl }} style={fc.image} resizeMode="cover" />
      <View style={fc.info}>
        {/* Category badge */}
        {category && (
          <View style={[fc.badge, { backgroundColor: category.badgeColor + "20" }]}>
            <Text style={[fc.badgeText, { color: category.badgeColor }]}>{category.label}</Text>
          </View>
        )}
        <Text style={fc.name} numberOfLines={1}>{item.name}</Text>
        <Text style={fc.desc} numberOfLines={2}>{item.description}</Text>
        <View style={fc.metaRow}>
          <Text style={fc.star}>★</Text>
          <Text style={fc.rating}>{item.rating.toFixed(1)}</Text>
          <Text style={fc.reviews}>({item.reviewCount.toLocaleString()})</Text>
        </View>
        <View style={fc.footer}>
          <Text style={fc.price}>{formatPrice(item.basePrice)}</Text>
          <TouchableOpacity
            style={fc.addBtn}
            onPress={() => onAdd(menuItemId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={fc.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Remove heart */}
      <TouchableOpacity
        style={fc.heartBtn}
        onPress={() => onRemove(menuItemId)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <SymbolView
          name={{ ios: "heart.fill", android: "favorite", web: "favorite" }}
          tintColor={Colors.brand.primary}
          size={20}
        />
      </TouchableOpacity>
    </View>
  );
}

const fc = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.card,
    position: "relative",
  },
  image: { width: 110, height: 110, flexShrink: 0 },
  info: { flex: 1, padding: Spacing.md, gap: 4 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: { fontSize: 10, fontWeight: Typography.weight.bold },
  name: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  desc: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    lineHeight: 16,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  star: { fontSize: 11, color: "#F59E0B" },
  rating: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  reviews: { fontSize: Typography.size.xs, color: Colors.neutral.secondary },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  price: { fontSize: Typography.size.md, fontWeight: Typography.weight.heavy, color: Colors.neutral.primary },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.brand.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: { fontSize: 20, fontWeight: Typography.weight.bold, color: Colors.neutral.white, lineHeight: 24 },
  heartBtn: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.brand.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function FavouritesScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const accessToken = useBistroStore((s) => s.accessToken);
  const [favourites, setFavourites] = useState<string[]>(DEFAULT_FAVOURITES);
  const [loading, setLoading] = useState(true);

  // Load from DB on mount
  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    fetchFavourites(accessToken).then((ids) => {
      if (ids && ids.length > 0) setFavourites(ids);
      setLoading(false);
    });
  }, [accessToken]);

  const handleRemove = useCallback(async (id: string) => {
    setFavourites((prev) => prev.filter((f) => f !== id));
    if (accessToken) await removeFavourite(id, accessToken);
  }, [accessToken]);

  const handleAdd = useCallback((menuItemId: string) => {
    const item = useBistroStore.getState().menuItemMap.get(menuItemId);
    if (!item) return;
    const hasRequired = item.customizationGroups.some((g) => g.minSelections > 0);
    if (hasRequired) {
      router.push(`/item/${menuItemId}` as any);
    } else {
      addItem(menuItemId, 1, []);
    }
  }, [addItem, router]);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Favourites</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={s.empty}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : favourites.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyEmoji}>🤍</Text>
          <Text style={s.emptyTitle}>No favourites yet</Text>
          <Text style={s.emptySub}>
            Tap the heart on any item to save it here for quick ordering.
          </Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push("/(tabs)" as any)}>
            <Text style={s.browseBtnText}>BROWSE MENU</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.count}>{favourites.length} saved item{favourites.length !== 1 ? "s" : ""}</Text>
          {favourites.map((id) => (
            <FavCard
              key={id}
              menuItemId={id}
              onRemove={handleRemove}
              onAdd={handleAdd}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.neutral.offWhite },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
  },
  title: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  content: { padding: Spacing.base, gap: Spacing.md },
  count: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.secondary,
    fontWeight: Typography.weight.medium,
    paddingHorizontal: Spacing.xs,
  },
  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing["2xl"],
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  emptySub: { fontSize: Typography.size.base, color: Colors.neutral.secondary, textAlign: "center", lineHeight: 22 },
  browseBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.xl,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  browseBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: 1.5,
  },
});
