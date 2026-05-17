/**
 * components/CategoryBadge.tsx
 * Rich category badge — larger icon, active glow, smooth press feedback.
 */

import { Colors, Radius, Spacing, Typography } from "@/constants/Theme";
import type { MenuCategory } from "@shared/types";
import { SymbolView } from "expo-symbols";
import { useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface CategoryBadgeProps {
  category: MenuCategory;
  isActive: boolean;
  onPress: (categoryId: string) => void;
}

export default function CategoryBadge({ category, isActive, onPress }: CategoryBadgeProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 40 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    onPress(category.id);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.badge, isActive && styles.badgeActive]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={category.label}
        accessibilityState={{ selected: isActive }}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isActive ? category.badgeColor : category.badgeColor + "20",
              shadowColor: isActive ? category.badgeColor : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isActive ? 0.45 : 0,
              shadowRadius: 8,
              elevation: isActive ? 4 : 0,
            },
          ]}
        >
          <SymbolView
            name={{ ios: category.iconName as any, android: "category", web: "category" }}
            tintColor={isActive ? Colors.neutral.white : category.badgeColor}
            size={22}
          />
        </View>
        <Text style={[styles.label, isActive && { color: category.badgeColor, fontWeight: Typography.weight.bold }]}>
          {category.label}
        </Text>
        {isActive && <View style={[styles.activeDot, { backgroundColor: category.badgeColor }]} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    minWidth: 68,
  },
  badgeActive: {
    backgroundColor: Colors.neutral.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.neutral.secondary,
    textAlign: "center",
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: Radius.full,
    marginTop: -2,
  },
});
