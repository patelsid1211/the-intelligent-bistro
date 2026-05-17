/**
 * app/restaurants/index.tsx
 * All Restaurants list screen.
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { RESTAURANTS } from "@/data/restaurants";
import { formatPrice } from "@/utils/format";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AllRestaurantsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = RESTAURANTS.filter((r) =>
    search.trim() === "" ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisines.some((c) => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Open Restaurants</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            tintColor={Colors.neutral.placeholder}
            size={16}
          />
          <TextInput
            style={s.searchInput}
            placeholder="Search restaurants or cuisine..."
            placeholderTextColor={Colors.neutral.placeholder}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.count}>{filtered.length} restaurant{filtered.length !== 1 ? "s" : ""}</Text>

        {filtered.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={s.card}
            onPress={() => router.push(`/restaurants/${r.id}` as any)}
            activeOpacity={0.88}
          >
            <Image source={{ uri: r.imageUrl }} style={s.image} resizeMode="cover" />
            <View style={s.info}>
              <Text style={s.name}>{r.name}</Text>
              <Text style={s.cuisines}>{r.cuisines.join(" · ")}</Text>
              <View style={s.metaRow}>
                <Text style={s.star}>★</Text>
                <Text style={s.rating}>{r.rating.toFixed(1)}</Text>
                <Text style={s.reviews}>({r.reviewCount.toLocaleString()})</Text>
                <View style={s.dot} />
                <Text style={s.meta}>🛵 {r.deliveryFee === 0 ? "Free" : formatPrice(r.deliveryFee)}</Text>
                <View style={s.dot} />
                <Text style={s.meta}>⏱ {r.deliveryTime}</Text>
              </View>
              {r.minOrder > 0 && (
                <Text style={s.minOrder}>Min. order {formatPrice(r.minOrder)}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🍽️</Text>
            <Text style={s.emptyTitle}>No restaurants found</Text>
            <Text style={s.emptySub}>Try a different search term</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  searchWrap: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.neutral.white },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: Typography.size.base, color: Colors.neutral.primary },
  content: { padding: Spacing.base, gap: Spacing.md },
  count: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, fontWeight: Typography.weight.medium },
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.card,
  },
  image: { width: "100%", height: 180 },
  info: { padding: Spacing.base, gap: Spacing.xs },
  name: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  cuisines: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flexWrap: "wrap" },
  star: { fontSize: 13, color: "#F59E0B" },
  rating: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  reviews: { fontSize: Typography.size.xs, color: Colors.neutral.secondary },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.neutral.divider },
  meta: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  minOrder: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, marginTop: 2 },
  empty: { paddingVertical: Spacing["4xl"], alignItems: "center", gap: Spacing.md },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  emptySub: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
});
