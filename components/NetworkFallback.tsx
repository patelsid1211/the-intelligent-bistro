/**
 * components/NetworkFallback.tsx
 * Reusable error/offline fallback screen component.
 * Shown when AI requests fail or connectivity drops.
 */

import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type FallbackVariant = "network" | "ai" | "generic";

const VARIANT_CONFIG: Record<
  FallbackVariant,
  { emoji: string; title: string; subtitle: string }
> = {
  network: {
    emoji: "📡",
    title: "No Connection",
    subtitle:
      "Check your internet connection and try again. Your cart is safely saved.",
  },
  ai: {
    emoji: "🤖",
    title: "AI Unavailable",
    subtitle:
      "The AI ordering assistant is temporarily unavailable. You can still browse the menu and add items manually.",
  },
  generic: {
    emoji: "⚠️",
    title: "Something Went Wrong",
    subtitle:
      "An unexpected error occurred. Please try again or restart the app.",
  },
};

interface NetworkFallbackProps {
  variant?: FallbackVariant;
  onRetry?: () => void;
  onDismiss?: () => void;
  /** If true, renders as an inline banner rather than a full-screen overlay */
  inline?: boolean;
}

export default function NetworkFallback({
  variant = "generic",
  onRetry,
  onDismiss,
  inline = false,
}: NetworkFallbackProps) {
  const cfg = VARIANT_CONFIG[variant];
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  if (inline) {
    return (
      <View style={inlineStyles.container} accessibilityRole="alert">
        <Text style={inlineStyles.emoji}>{cfg.emoji}</Text>
        <View style={inlineStyles.textBlock}>
          <Text style={inlineStyles.title}>{cfg.title}</Text>
          <Text style={inlineStyles.subtitle} numberOfLines={2}>
            {cfg.subtitle}
          </Text>
        </View>
        {onRetry && (
          <TouchableOpacity
            style={inlineStyles.retryBtn}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={inlineStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close", web: "close" }}
              tintColor={Colors.neutral.secondary}
              size={16}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Animated.Text
        style={[styles.emoji, { transform: [{ translateX: shakeAnim }] }]}
      >
        {cfg.emoji}
      </Animated.Text>
      <Text style={styles.title}>{cfg.title}</Text>
      <Text style={styles.subtitle}>{cfg.subtitle}</Text>

      <View style={styles.btnRow}>
        {onRetry && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <SymbolView
              name={{ ios: "arrow.clockwise", android: "refresh", web: "refresh" }}
              tintColor={Colors.neutral.white}
              size={16}
            />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Text style={styles.dismissBtnText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    gap: Spacing.md,
    backgroundColor: Colors.neutral.white,
  },
  emoji: { fontSize: 64 },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  btnRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    ...Shadow.md,
  },
  retryBtnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
  dismissBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  dismissBtnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.neutral.secondary,
  },
});

const inlineStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "#FFF8E7",
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.semantic.warning + "44",
    margin: Spacing.base,
  },
  emoji: { fontSize: 20 },
  textBlock: { flex: 1 },
  title: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  subtitle: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    marginTop: 2,
  },
  retryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.sm,
  },
  retryText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
});
