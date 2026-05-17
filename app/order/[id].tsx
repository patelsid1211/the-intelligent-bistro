/**
 * app/order/[id].tsx
 * Order tracking screen — polls the local API server every 5 seconds.
 * Upgrades to Supabase real-time when EXPO_PUBLIC_SUPABASE_URL is set.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";


// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface StatusHistoryEntry {
  id: string;
  status: OrderStatus;
  message: string;
  created_at: string;
}

interface OrderDetail {
  id: string;
  status: OrderStatus;
  items: Array<{ name: string; quantity: number; lineTotal: number }>;
  pricing: {
    subtotal: number;
    serviceFee: number;
    deliveryFee: number;
    tax: number;
    tipAmount: number;
    promoDiscount: number;
    total: number;
  };
  estimated_delivery: string | null;
  created_at: string;
  statusHistory: StatusHistoryEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; emoji: string; color: string; description: string }
> = {
  pending:          { label: "Order Received",    emoji: "📋", color: "#FF9500", description: "We've received your order." },
  confirmed:        { label: "Confirmed",          emoji: "✅", color: "#007AFF", description: "The restaurant confirmed your order." },
  preparing:        { label: "Being Prepared",     emoji: "👨‍🍳", color: "#AF52DE", description: "The kitchen is cooking your food." },
  ready_for_pickup: { label: "Ready for Pickup",   emoji: "🛍️", color: "#34C759", description: "Your order is packed and waiting for a driver." },
  out_for_delivery: { label: "On the Way",         emoji: "🛵", color: "#007AFF", description: "Your driver is heading to you!" },
  delivered:        { label: "Delivered",          emoji: "🎉", color: "#34C759", description: "Your order has been delivered. Enjoy!" },
  cancelled:        { label: "Cancelled",          emoji: "❌", color: "#FF3B30", description: "This order was cancelled." },
};

const STATUS_ORDER: OrderStatus[] = [
  "pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "delivered",
];

import { formatPrice } from "@/utils/format";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS TRACKER
// ─────────────────────────────────────────────────────────────────────────────

function ProgressTracker({ currentStatus }: { currentStatus: OrderStatus }) {
  if (currentStatus === "cancelled") {
    return (
      <View style={trackerStyles.cancelled}>
        <Text style={trackerStyles.cancelledText}>❌ Order Cancelled</Text>
      </View>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <View style={trackerStyles.container}>
      {STATUS_ORDER.map((status, index) => {
        const cfg = STATUS_CONFIG[status];
        const isDone = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <View key={status} style={trackerStyles.step}>
            {/* Connector line */}
            {index > 0 && (
              <View style={[trackerStyles.line, isDone && trackerStyles.lineDone]} />
            )}
            {/* Step circle */}
            <View
              style={[
                trackerStyles.circle,
                isDone && { backgroundColor: cfg.color },
                isCurrent && trackerStyles.circleCurrent,
              ]}
            >
              {isDone ? (
                <Text style={trackerStyles.circleEmoji}>{cfg.emoji}</Text>
              ) : (
                <View style={trackerStyles.circleDot} />
              )}
            </View>
            {/* Label */}
            <Text
              style={[
                trackerStyles.label,
                isDone && { color: cfg.color, fontWeight: Typography.weight.bold },
              ]}
              numberOfLines={2}
            >
              {cfg.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const trackerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  step: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  line: {
    position: "absolute",
    top: 16,
    right: "50%",
    left: "-50%",
    height: 3,
    backgroundColor: Colors.neutral.border,
    zIndex: 0,
  },
  lineDone: {
    backgroundColor: Colors.semantic.success,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.neutral.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    marginBottom: Spacing.xs,
  },
  circleCurrent: {
    ...Shadow.sm,
  },
  circleEmoji: { fontSize: 16 },
  circleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.neutral.white,
  },
  label: {
    fontSize: 9,
    color: Colors.neutral.placeholder,
    textAlign: "center",
    lineHeight: 12,
  },
  cancelled: {
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: "#FFF0EF",
    borderRadius: Radius.md,
    margin: Spacing.base,
  },
  cancelledText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.semantic.error,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const token = ""; // TODO: pass real token from auth store
      const res = await fetch(`${API_URL}/api/orders/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        setOrder(json.data as OrderDetail);
      } else {
        setError("Order not found.");
      }
    } catch {
      setError("Could not load order. Is the server running?");
    }
    setLoading(false);
  }, [id]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchOrder();
    // Poll every 5 seconds for status updates
    pollRef.current = setInterval(fetchOrder, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>{error ?? "Order not found."}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const cfg = STATUS_CONFIG[order.status];
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
            tintColor={Colors.neutral.primary}
            size={20}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Status Hero */}
        <View style={[styles.statusHero, { backgroundColor: cfg.color + "18" }]}>
          <Text style={styles.statusEmoji}>{cfg.emoji}</Text>
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.statusDescription}>{cfg.description}</Text>
          {order.estimated_delivery && !isDelivered && !isCancelled && (
            <View style={styles.etaChip}>
              <SymbolView
                name={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
                tintColor={Colors.neutral.secondary}
                size={14}
              />
              <Text style={styles.etaText}>
                Est. delivery: {formatTime(order.estimated_delivery)}
              </Text>
            </View>
          )}
        </View>

        {/* Progress tracker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Progress</Text>
          <ProgressTracker currentStatus={order.status} />
        </View>

        {/* Status timeline */}
        {order.statusHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Timeline</Text>
            {order.statusHistory.map((entry, i) => (
              <View key={entry.id} style={[styles.timelineRow, i < order.statusHistory.length - 1 && styles.timelineRowBorder]}>
                <View style={[styles.timelineDot, { backgroundColor: STATUS_CONFIG[entry.status]?.color ?? Colors.neutral.secondary }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{STATUS_CONFIG[entry.status]?.label ?? entry.status}</Text>
                  <Text style={styles.timelineMessage}>{entry.message}</Text>
                </View>
                <Text style={styles.timelineTime}>{formatTime(entry.created_at)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Order items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Order</Text>
          {order.items.map((item, i) => (
            <View key={i} style={[styles.itemRow, i < order.items.length - 1 && styles.itemRowBorder]}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>{formatPrice(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          {[
            { label: "Subtotal", value: order.pricing.subtotal },
            { label: "Service fee", value: order.pricing.serviceFee },
            { label: "Delivery", value: order.pricing.deliveryFee },
            { label: "Tax", value: order.pricing.tax },
            ...(order.pricing.tipAmount > 0 ? [{ label: "Tip", value: order.pricing.tipAmount }] : []),
            ...(order.pricing.promoDiscount > 0 ? [{ label: "Promo discount", value: -order.pricing.promoDiscount }] : []),
          ].map(({ label, value }) => (
            <View key={label} style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>{label}</Text>
              <Text style={[styles.pricingValue, value < 0 && styles.pricingDiscount]}>
                {value < 0 ? `−${formatPrice(-value)}` : formatPrice(value)}
              </Text>
            </View>
          ))}
          <View style={styles.pricingDivider} />
          <View style={styles.pricingRow}>
            <Text style={styles.pricingTotal}>Total</Text>
            <Text style={styles.pricingTotalValue}>{formatPrice(order.pricing.total)}</Text>
          </View>
        </View>

        {/* Order ID */}
        <Text style={styles.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.orderDate}>Placed at {formatTime(order.created_at)}</Text>

        <View style={{ height: Spacing["3xl"] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.neutral.offWhite },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md, backgroundColor: Colors.neutral.white },
  loadingText: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
  errorEmoji: { fontSize: 48 },
  errorText: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
  backBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.brand.primary, borderRadius: Radius.lg },
  backBtnText: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.white },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  backIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },

  content: { padding: Spacing.base, gap: Spacing.md },

  statusHero: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
  },
  statusEmoji: { fontSize: 52 },
  statusLabel: { fontSize: Typography.size.xl, fontWeight: Typography.weight.heavy },
  statusDescription: { fontSize: Typography.size.base, color: Colors.neutral.secondary, textAlign: "center" },
  etaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.neutral.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
    ...Shadow.sm,
  },
  etaText: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },

  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary, marginBottom: Spacing.xs },

  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, paddingVertical: Spacing.sm },
  timelineRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  timelineContent: { flex: 1 },
  timelineStatus: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary },
  timelineMessage: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, marginTop: 2 },
  timelineTime: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder },

  itemRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.sm },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  itemQty: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.brand.primary, minWidth: 24 },
  itemName: { flex: 1, fontSize: Typography.size.base, color: Colors.neutral.primary },
  itemPrice: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary },

  pricingRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: Spacing.xs },
  pricingLabel: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
  pricingValue: { fontSize: Typography.size.base, color: Colors.neutral.primary, fontWeight: Typography.weight.medium },
  pricingDiscount: { color: Colors.semantic.success },
  pricingDivider: { height: 1, backgroundColor: Colors.neutral.border, marginVertical: Spacing.sm },
  pricingTotal: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  pricingTotalValue: { fontSize: Typography.size.md, fontWeight: Typography.weight.heavy, color: Colors.neutral.primary },

  orderId: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, textAlign: "center" },
  orderDate: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, textAlign: "center" },
});
