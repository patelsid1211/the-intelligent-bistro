/**
 * app/search.tsx
 * Full-text product search screen.
 * Debounced input → API search → results with MenuItemCard.
 */

import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MenuItemCard from "@/components/MenuItemCard";
import { Colors, Radius, Spacing, Typography } from "@/constants/Theme";
import { useCart } from "@/store";
import type { MenuItem } from "@shared/types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

// ─────────────────────────────────────────────────────────────────────────────
// RECENT SEARCHES (in-memory for session)
// ─────────────────────────────────────────────────────────────────────────────

const recentSearches: string[] = [];

function addRecentSearch(query: string) {
  const idx = recentSearches.indexOf(query);
  if (idx !== -1) recentSearches.splice(idx, 1);
  recentSearches.unshift(query);
  if (recentSearches.length > 8) recentSearches.pop();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recents, setRecents] = useState<string[]>([...recentSearches]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(
        `${API_URL}/api/products/search?q=${encodeURIComponent(trimmed)}`
      );
      const json = await res.json();
      if (json.success) {
        setResults(json.data.results ?? []);
        addRecentSearch(trimmed);
        setRecents([...recentSearches]);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(text), 400);
    },
    [doSearch]
  );

  const handleQuickAdd = useCallback(
    (item: MenuItem) => {
      const hasRequired = item.customizationGroups.some((g) => g.minSelections > 0);
      if (hasRequired) {
        router.push(`/item/${item.id}` as any);
        return;
      }
      addItem(item.id, 1, []);
    },
    [addItem, router]
  );

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
            tintColor={Colors.neutral.primary}
            size={20}
          />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            tintColor={Colors.neutral.secondary}
            size={18}
          />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search menu items..."
            placeholderTextColor={Colors.neutral.placeholder}
            value={query}
            onChangeText={handleChange}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
            clearButtonMode="never"
            accessibilityLabel="Search input"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <SymbolView
                name={{ ios: "xmark.circle.fill", android: "cancel", web: "cancel" }}
                tintColor={Colors.neutral.placeholder}
                size={18}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No results for "{query}"</Text>
          <Text style={styles.emptySubtitle}>Try a different search term.</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MenuItemCard
              item={item}
              isHighlighted={false}
              onPress={(i) => router.push(`/item/${i.id}` as any)}
              onQuickAdd={handleQuickAdd}
            />
          )}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsHeader}>
              {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
            </Text>
          }
        />
      ) : (
        /* Recent searches + suggestions */
        <View style={styles.suggestions}>
          {recents.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Recent Searches</Text>
              {recents.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.recentRow}
                  onPress={() => { setQuery(r); doSearch(r); }}
                >
                  <SymbolView
                    name={{ ios: "clock", android: "history", web: "history" }}
                    tintColor={Colors.neutral.secondary}
                    size={16}
                  />
                  <Text style={styles.recentText}>{r}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <Text style={styles.sectionLabel}>Popular Searches</Text>
          <View style={styles.chipRow}>
            {["Burger", "Sushi", "Pizza", "Poke Bowl", "Tacos", "Pasta", "Dessert", "Matcha"].map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                onPress={() => { setQuery(s); doSearch(s); }}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.neutral.white },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md, padding: Spacing["2xl"] },
  loadingText: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.neutral.primary, textAlign: "center" },
  emptySubtitle: { fontSize: Typography.size.base, color: Colors.neutral.secondary, textAlign: "center" },

  resultsList: { padding: Spacing.base },
  resultsHeader: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.secondary,
    marginBottom: Spacing.md,
  },

  suggestions: { padding: Spacing.base, gap: Spacing.sm },
  sectionLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  recentText: { fontSize: Typography.size.base, color: Colors.neutral.primary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  chipText: { fontSize: Typography.size.sm, color: Colors.neutral.primary, fontWeight: Typography.weight.medium },
});
