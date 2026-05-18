/**
 * components/CartLineItem.tsx
 * Rich cart line item — image thumbnail, polished stepper, animated highlight.
 */

import { Colors, Radius, Spacing, Typography } from "@/constants/Theme";
import { useBistroStore } from "@/store";
import type { CartItem } from "@shared/types";
import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { formatPrice } from "@/utils/format";

interface CartLineItemProps {
  item: CartItem;
  isHighlighted?: boolean;
  onIncrement: (lineItemId: string) => void;
  onDecrement: (lineItemId: string) => void;
  onRemove: (lineItemId: string) => void;
}

export default function CartLineItem({
  item,
  isHighlighted = false,
  onIncrement,
  onDecrement,
  onRemove,
}: CartLineItemProps) {
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const menuItem = useBistroStore.getState().menuItemMap.get(item.menuItemId);

  useEffect(() => {
    if (isHighlighted) {
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.delay(1200),
        Animated.timing(highlightAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start();
    }
  }, [isHighlighted]);

  const bgColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.neutral.white, "#FFF0EF"],
  });

  const customizationSummary = item.selectedCustomizations
    .slice(0, 3)
    .map((c) => c.optionLabel)
    .join(", ");

  return (
    <Animated.View style={[styles.row, { backgroundColor: bgColor }]}>
      {/* Thumbnail */}
      {menuItem?.imageUrl ? (
        <View style={styles.thumbContainer}>
          <Image
            source={{ uri: menuItem.imageUrl }}
            style={styles.thumb}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={[styles.thumbContainer, styles.thumbPlaceholder]}>
          <Text style={styles.thumbEmoji}>🍽️</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        {customizationSummary.length > 0 && (
          <Text style={styles.customizations} numberOfLines={1}>{customizationSummary}</Text>
        )}
        {item.specialInstructions && (
          <Text style={styles.instructions} numberOfLines={1}>📝 {item.specialInstructions}</Text>
        )}
        <Text style={styles.unitPrice}>{formatPrice(item.unitPrice)} each</Text>
      </View>

      {/* Right: price + stepper */}
      <View style={styles.right}>
        <Text style={styles.lineTotal}>{formatPrice(item.lineTotal)}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepBtn, item.quantity === 1 && styles.stepBtnRemove]}
            onPress={() => item.quantity === 1 ? onRemove(item.lineItemId) : onDecrement(item.lineItemId)}
            accessibilityRole="button"
            accessibilityLabel={item.quantity === 1 ? `Remove ${item.name}` : `Decrease quantity`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.stepBtnText, item.quantity === 1 && styles.stepBtnTextRemove]}>
              {item.quantity === 1 ? "🗑" : "−"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.quantity}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => onIncrement(item.lineItemId)}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
  },

  // Thumbnail
  thumbContainer: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    overflow: "hidden",
    flexShrink: 0,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    backgroundColor: Colors.neutral.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbEmoji: { fontSize: 24 },

  // Info
  info: { flex: 1, gap: 3 },
  name: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    lineHeight: 20,
  },
  customizations: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
  },
  instructions: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    fontStyle: "italic",
  },
  unitPrice: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.placeholder,
    marginTop: 2,
  },

  // Right
  right: {
    alignItems: "flex-end",
    gap: Spacing.sm,
    flexShrink: 0,
  },
  lineTotal: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
    letterSpacing: -0.3,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  stepBtnRemove: {
    backgroundColor: "#FEE2E2",
    shadowOpacity: 0,
  },
  stepBtnText: {
    fontSize: 17,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
    lineHeight: 21,
  },
  stepBtnTextRemove: {
    fontSize: 13,
    lineHeight: 17,
  },
  quantity: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    minWidth: 22,
    textAlign: "center",
  },
});
