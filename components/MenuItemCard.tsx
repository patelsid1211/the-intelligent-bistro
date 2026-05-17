/**
 * components/MenuItemCard.tsx
 * Premium menu item card — rich UI overhaul.
 * Larger image, gradient overlay, animated highlight ring, polished typography.
 */

import { Colors, Radius, Spacing, Typography } from "@/constants/Theme";
import type { MenuItem } from "@shared/types";
import { useEffect, useRef } from "react";
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { formatPrice } from "@/utils/format";

const DIETARY_BADGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  vegan:        { label: "🌿 Vegan",    color: "#1A7F37", bg: "#DCFCE7" },
  vegetarian:   { label: "🥦 Veggie",   color: "#15803D", bg: "#D1FAE5" },
  "gluten-free":{ label: "GF",          color: "#0369A1", bg: "#E0F2FE" },
  "dairy-free": { label: "DF",          color: "#0E7490", bg: "#CFFAFE" },
  spicy:        { label: "🌶️ Spicy",   color: "#B91C1C", bg: "#FEE2E2" },
  popular:      { label: "⭐ Popular",  color: "#92400E", bg: "#FEF3C7" },
  new:          { label: "✨ New",      color: "#6D28D9", bg: "#EDE9FE" },
  featured:     { label: "🔥 Featured", color: "#BE185D", bg: "#FCE7F3" },
};

interface MenuItemCardProps {
  item: MenuItem;
  isHighlighted?: boolean;
  onPress: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
}

export default function MenuItemCard({
  item,
  isHighlighted = false,
  onPress,
  onQuickAdd,
}: MenuItemCardProps) {
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.02, useNativeDriver: true, speed: 20 }),
        Animated.timing(highlightAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.delay(1400),
        Animated.parallel([
          Animated.timing(highlightAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
        ]),
      ]).start();
    }
  }, [isHighlighted]);

  const highlightBorderColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", Colors.brand.primary],
  });

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.neutral.white, "#FFF5F5"],
  });

  const visibleBadges = item.dietaryTags
    .filter((tag) => DIETARY_BADGE_CONFIG[tag])
    .slice(0, 2);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: highlightBorderColor,
          backgroundColor: highlightBg,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardInner}
        onPress={() => onPress(item)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${formatPrice(item.basePrice)}`}
      >
        {/* ── Image ── */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={item.name}
          />
          {/* Subtle gradient overlay at bottom of image */}
          <View style={styles.imageGradient} />

          {!item.isAvailable && (
            <View style={styles.unavailableOverlay}>
              <Text style={styles.unavailableText}>Unavailable</Text>
            </View>
          )}

          {/* Calories badge on image */}
          {item.calories && (
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieText}>{item.calories} cal</Text>
            </View>
          )}
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>
          {/* Dietary badges */}
          {visibleBadges.length > 0 && (
            <View style={styles.badgeRow}>
              {visibleBadges.map((tag) => {
                const cfg = DIETARY_BADGE_CONFIG[tag];
                return (
                  <View key={tag} style={[styles.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Name */}
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

          {/* Rating row */}
          <View style={styles.ratingRow}>
            <Text style={styles.star}>★</Text>
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount.toLocaleString()})</Text>
          </View>

          {/* Price + Add button */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>{formatPrice(item.basePrice)}</Text>
              {item.customizationGroups.some((g) => g.minSelections > 0) && (
                <Text style={styles.customizeHint}>Customizable</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.addBtn, !item.isAvailable && styles.addBtnDisabled]}
              onPress={() => item.isAvailable && onQuickAdd(item)}
              disabled={!item.isAvailable}
              accessibilityRole="button"
              accessibilityLabel={`Add ${item.name} to cart`}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: Spacing.md,
    overflow: "hidden",
    backgroundColor: Colors.neutral.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardInner: {
    flexDirection: "row",
  },

  // Image
  imageContainer: {
    width: 130,
    height: 130,
    position: "relative",
    flexShrink: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableText: {
    color: Colors.neutral.white,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
  calorieBadge: {
    position: "absolute",
    bottom: Spacing.xs,
    left: Spacing.xs,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  calorieText: {
    fontSize: 9,
    color: Colors.neutral.white,
    fontWeight: Typography.weight.semibold,
  },

  // Content
  content: {
    flex: 1,
    padding: Spacing.md,
    paddingLeft: Spacing.base,
    gap: 5,
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.1,
  },
  name: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  description: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    lineHeight: 16,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  star: {
    fontSize: 12,
    color: "#F59E0B",
  },
  rating: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  reviewCount: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  price: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
    letterSpacing: -0.3,
  },
  customizeHint: {
    fontSize: 9,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.medium,
    marginTop: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnDisabled: {
    backgroundColor: Colors.neutral.divider,
    shadowOpacity: 0,
  },
  addBtnText: {
    fontSize: 22,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
    lineHeight: 26,
    marginTop: -1,
  },
});
