/**
 * app/order-success.tsx
 * Order success screen — shown after Place Order is tapped.
 * Matches the reference UI: celebration illustration, order details,
 * "TRACK ORDER" button → home, "Back to Menu" link.
 */

import { Colors, Radius, Spacing, Typography } from "@/constants/Theme";
import { formatPrice } from "@/utils/format";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI DOTS — simple animated celebration
// ─────────────────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  Colors.brand.primary, "#8B5CF6", "#3B82F6", "#22C55E",
  "#F59E0B", "#EC4899", "#06B6D4",
];

function ConfettiDot({ color, delay, x, y }: { color: string; delay: number; x: number; y: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }),
    ]).start();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });

  return (
    <Animated.View
      style={[
        confetti.dot,
        {
          backgroundColor: color,
          left: x,
          top: y,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

const confetti = StyleSheet.create({
  dot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

const DOTS = [
  { color: CONFETTI_COLORS[0], delay: 100, x: 40,  y: 60  },
  { color: CONFETTI_COLORS[1], delay: 150, x: 280, y: 40  },
  { color: CONFETTI_COLORS[2], delay: 200, x: 60,  y: 140 },
  { color: CONFETTI_COLORS[3], delay: 120, x: 300, y: 120 },
  { color: CONFETTI_COLORS[4], delay: 180, x: 160, y: 30  },
  { color: CONFETTI_COLORS[5], delay: 250, x: 20,  y: 200 },
  { color: CONFETTI_COLORS[6], delay: 130, x: 320, y: 200 },
  { color: CONFETTI_COLORS[0], delay: 220, x: 100, y: 180 },
  { color: CONFETTI_COLORS[1], delay: 170, x: 240, y: 170 },
  { color: CONFETTI_COLORS[2], delay: 300, x: 80,  y: 80  },
  { color: CONFETTI_COLORS[3], delay: 140, x: 260, y: 80  },
  { color: CONFETTI_COLORS[4], delay: 260, x: 180, y: 160 },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ total?: string; orderId?: string; deliveryTime?: string }>();

  const total = params.total ? parseInt(params.total, 10) : 0;
  const orderId = params.orderId ?? `#${Math.floor(100000 + Math.random() * 900000)}`;
  const deliveryTime = params.deliveryTime ?? "15–25 min";

  // Entrance animation for the card
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 8 }),
    ]).start();
  }, []);

  const handleTrackOrder = () => {
    // Navigate to home and reset the stack so back doesn't return to success
    router.replace("/(tabs)");
  };

  const handleBackToMenu = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Confetti dots */}
      <View style={s.confettiLayer} pointerEvents="none">
        {DOTS.map((d, i) => (
          <ConfettiDot key={i} {...d} />
        ))}
      </View>

      <Animated.View
        style={[
          s.content,
          { opacity: cardAnim, transform: [{ scale: cardScale }] },
        ]}
      >
        {/* Illustration */}
        <View style={s.illustrationWrap}>
          {/* Wallet emoji as illustration */}
          <View style={s.walletCircle}>
            <Text style={s.walletEmoji}>💰</Text>
          </View>
          {/* Star decorations */}
          <Text style={[s.star, { top: 10, left: 30 }]}>✦</Text>
          <Text style={[s.star, { top: 20, right: 20 }]}>✦</Text>
          <Text style={[s.star, { bottom: 20, left: 20 }]}>·</Text>
          <Text style={[s.star, { bottom: 10, right: 40 }]}>✦</Text>
        </View>

        {/* Text */}
        <Text style={s.title}>Congratulations!</Text>
        <Text style={s.subtitle}>
          You successfully placed a payment,{"\n"}enjoy our service!
        </Text>

        {/* Order details card */}
        <View style={s.detailsCard}>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Order ID</Text>
            <Text style={s.detailValue}>{orderId}</Text>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Total Paid</Text>
            <Text style={[s.detailValue, s.detailValueBold]}>
              {total > 0 ? formatPrice(total) : "—"}
            </Text>
          </View>
          <View style={s.detailDivider} />
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Estimated Delivery</Text>
            <Text style={[s.detailValue, { color: Colors.semantic.success }]}>
              ⏱ {deliveryTime}
            </Text>
          </View>
        </View>

        {/* CTA buttons */}
        <TouchableOpacity
          style={s.trackBtn}
          onPress={handleTrackOrder}
          activeOpacity={0.88}
        >
          <Text style={s.trackBtnText}>TRACK ORDER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.menuLink}
          onPress={handleBackToMenu}
        >
          <Text style={s.menuLinkText}>Back to Menu</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.lg,
    zIndex: 1,
  },

  // Illustration
  illustrationWrap: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: Spacing.sm,
  },
  walletCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  walletEmoji: { fontSize: 72 },
  star: {
    position: "absolute",
    fontSize: 18,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.bold,
  },

  // Text
  title: {
    fontSize: Typography.size["2xl"],
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
    textAlign: "center",
    lineHeight: 24,
  },

  // Details card
  detailsCard: {
    width: "100%",
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: 0,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.neutral.border,
  },
  detailLabel: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.secondary,
  },
  detailValue: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.primary,
    fontWeight: Typography.weight.medium,
  },
  detailValueBold: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
  },

  // Buttons
  trackBtn: {
    width: "100%",
    height: 58,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
    marginTop: Spacing.sm,
  },
  trackBtnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: 1.5,
  },
  menuLink: {
    paddingVertical: Spacing.sm,
  },
  menuLinkText: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
    fontWeight: Typography.weight.medium,
    textAlign: "center",
  },
});
