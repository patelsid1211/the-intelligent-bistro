/**
 * app/(tabs)/cart.tsx
 * Cart screen — rich UI overhaul.
 * Gradient checkout button, polished pricing card, animated empty state.
 */

import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import CartLineItem from "@/components/CartLineItem";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { TAB_BAR_HEIGHT } from "@/constants/layout";
import { computePromoDiscount, THE_BISTRO, validatePromoCode } from "@/data/menu";
import { useCart } from "@/store";
import { formatPrice } from "@/utils/format";
import type { TipPreset } from "@shared/types";

const TIP_PRESETS: { label: string; sublabel: string; value: TipPreset }[] = [
  { label: "No tip", sublabel: "", value: 0 as any },
  { label: "$1", sublabel: "10%", value: 100 },
  { label: "$2", sublabel: "15%", value: 200 },
  { label: "$3", sublabel: "20%", value: 300 },
  { label: "Custom", sublabel: "✏️", value: "custom" },
];

// ─────────────────────────────────────────────────────────────────────────────
// TIP SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

interface TipSelectorProps {
  currentTip: number;
  onSelectTip: (amount: number) => void;
}

function TipSelector({ currentTip, onSelectTip }: TipSelectorProps) {
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (value: TipPreset) => {
    if (value === "custom") { setShowCustom(true); return; }
    setShowCustom(false);
    onSelectTip(value as number);
  };

  const handleCustomSubmit = () => {
    const dollars = parseFloat(customValue);
    if (!isNaN(dollars) && dollars >= 0) {
      onSelectTip(Math.round(dollars * 100));
      setShowCustom(false);
    }
  };

  return (
    <View style={tipStyles.container}>
      <View style={tipStyles.header}>
        <SymbolView
          name={{ ios: "heart.fill", android: "favorite", web: "favorite" }}
          tintColor={Colors.brand.primary}
          size={16}
        />
        <View style={{ flex: 1 }}>
          <Text style={tipStyles.title}>Driver Tip</Text>
          <Text style={tipStyles.subtitle}>100% goes directly to your driver</Text>
        </View>
      </View>

      <View style={tipStyles.presetRow}>
        {TIP_PRESETS.map(({ label, sublabel, value }) => {
          const isNoTip = value === (0 as any);
          const isActive = isNoTip
            ? currentTip === 0 && !showCustom
            : value !== "custom" && currentTip === (value as number) && !showCustom;
          return (
            <TouchableOpacity
              key={label}
              style={[tipStyles.preset, isActive && tipStyles.presetActive]}
              onPress={() => handlePreset(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[tipStyles.presetLabel, isActive && tipStyles.presetLabelActive]}>{label}</Text>
              {sublabel ? <Text style={[tipStyles.presetSub, isActive && tipStyles.presetSubActive]}>{sublabel}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {showCustom && (
        <View style={tipStyles.customRow}>
          <Text style={tipStyles.customDollar}>$</Text>
          <TextInput
            style={tipStyles.customInput}
            placeholder="0.00"
            placeholderTextColor={Colors.neutral.placeholder}
            keyboardType="decimal-pad"
            value={customValue}
            onChangeText={setCustomValue}
            onSubmitEditing={handleCustomSubmit}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity style={tipStyles.customApply} onPress={handleCustomSubmit}>
            <Text style={tipStyles.customApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const tipStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  subtitle: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    marginTop: 1,
  },
  presetRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  preset: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.surface,
    alignItems: "center",
    gap: 2,
  },
  presetActive: {
    borderColor: Colors.brand.primary,
    backgroundColor: "#FFF0EF",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  presetLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.secondary,
  },
  presetLabelActive: { color: Colors.brand.primary },
  presetSub: {
    fontSize: 10,
    color: Colors.neutral.placeholder,
  },
  presetSubActive: { color: Colors.brand.primary + "AA" },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.brand.primary,
  },
  customDollar: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  customInput: {
    flex: 1,
    fontSize: Typography.size.md,
    color: Colors.neutral.primary,
  },
  customApply: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
  },
  customApplyText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PROMO INPUT
// ─────────────────────────────────────────────────────────────────────────────

interface PromoInputProps {
  appliedCode?: string;
  subtotal: number;
  onApply: (code: string, discount: number) => void;
  onRemove: () => void;
}

function PromoInput({ appliedCode, subtotal, onApply, onRemove }: PromoInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = useCallback(async () => {
    if (!code.trim()) return;
    setLoading(true); setError(null);
    await new Promise((r) => setTimeout(r, 400));
    const promo = validatePromoCode(code.trim());
    setLoading(false);
    if (!promo) { setError("Invalid or expired promo code."); return; }
    if (subtotal < promo.minimumOrderAmount) {
      setError(`Minimum order of ${formatPrice(promo.minimumOrderAmount)} required.`);
      return;
    }
    onApply(promo.code, computePromoDiscount(promo, subtotal));
    setCode("");
  }, [code, subtotal, onApply]);

  if (appliedCode) {
    return (
      <View style={promoStyles.applied}>
        <View style={promoStyles.appliedIcon}>
          <SymbolView
            name={{ ios: "tag.fill", android: "local_offer", web: "local_offer" }}
            tintColor={Colors.semantic.success}
            size={16}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={promoStyles.appliedCode}>{appliedCode}</Text>
          <Text style={promoStyles.appliedSub}>Promo applied successfully</Text>
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={promoStyles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={promoStyles.container}>
      <View style={[promoStyles.inputRow, error ? promoStyles.inputRowError : null]}>
        <SymbolView
          name={{ ios: "tag", android: "local_offer", web: "local_offer" }}
          tintColor={Colors.neutral.placeholder}
          size={16}
        />
        <TextInput
          style={promoStyles.input}
          placeholder="Enter promo code"
          placeholderTextColor={Colors.neutral.placeholder}
          value={code}
          onChangeText={(t) => { setCode(t.toUpperCase()); setError(null); }}
          autoCapitalize="characters"
          returnKeyType="done"
          onSubmitEditing={handleApply}
        />
        <TouchableOpacity
          style={[promoStyles.applyBtn, !code.trim() && promoStyles.applyBtnDisabled]}
          onPress={handleApply}
          disabled={!code.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={Colors.neutral.white} />
            : <Text style={promoStyles.applyBtnText}>Apply</Text>}
        </TouchableOpacity>
      </View>
      {error && (
        <View style={promoStyles.errorRow}>
          <SymbolView
            name={{ ios: "exclamationmark.circle.fill", android: "error", web: "error" }}
            tintColor={Colors.semantic.error}
            size={13}
          />
          <Text style={promoStyles.error}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const promoStyles = StyleSheet.create({
  container: { gap: Spacing.xs },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
  },
  inputRowError: { borderColor: Colors.semantic.error },
  input: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 1.5,
  },
  applyBtn: {
    paddingHorizontal: Spacing.base,
    height: 36,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  applyBtnDisabled: { opacity: 0.45 },
  applyBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.xs,
  },
  error: {
    fontSize: Typography.size.xs,
    color: Colors.semantic.error,
  },
  applied: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: "#F0FFF4",
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.semantic.success + "55",
  },
  appliedIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.semantic.success + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  appliedCode: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.semantic.success,
  },
  appliedSub: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    marginTop: 1,
  },
  removeText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.semantic.error,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PRICING ROW
// ─────────────────────────────────────────────────────────────────────────────

function PricingRow({ label, value, isTotal = false, isDiscount = false, isFree = false }: {
  label: string; value: number; isTotal?: boolean; isDiscount?: boolean; isFree?: boolean;
}) {
  return (
    <View style={pricingStyles.row}>
      <Text style={[pricingStyles.label, isTotal && pricingStyles.totalLabel]}>{label}</Text>
      <Text style={[
        pricingStyles.value,
        isTotal && pricingStyles.totalValue,
        isDiscount && pricingStyles.discountValue,
        isFree && pricingStyles.freeValue,
      ]}>
        {isFree ? "Free" : isDiscount ? `−${formatPrice(value)}` : formatPrice(value)}
      </Text>
    </View>
  );
}

const pricingStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  label: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
  value: { fontSize: Typography.size.base, color: Colors.neutral.primary, fontWeight: Typography.weight.medium },
  totalLabel: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  totalValue: { fontSize: Typography.size.md, fontWeight: Typography.weight.heavy, color: Colors.neutral.primary },
  discountValue: { color: Colors.semantic.success, fontWeight: Typography.weight.bold },
  freeValue: { color: Colors.semantic.success, fontWeight: Typography.weight.bold },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CART SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function CartScreen() {
  const router = useRouter();
  const { cart, pricing, recentlyUpdatedLineItemIds, updateQuantity, removeItem, setTip, applyPromo, removePromo, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const insets = useSafeAreaInsets();

  // Height the checkout button needs to clear: tab bar + device home indicator
  const checkoutBottomPad = TAB_BAR_HEIGHT + Math.max(insets.bottom - 20, 0);

  const handleCheckout = useCallback(async () => {
    if (cart.items.length === 0) return;
    setIsCheckingOut(true);

    // Simulate API call — place the order
    await new Promise((r) => setTimeout(r, 1200));

    const orderId = `#${Math.floor(100000 + Math.random() * 900000)}`;
    const total = pricing.total;

    // Clear cart before navigating so back button doesn't show stale cart
    clearCart();
    setIsCheckingOut(false);

    // Navigate to success screen with order details
    router.replace({
      pathname: "/order-success",
      params: {
        total: String(total),
        orderId,
        deliveryTime: THE_BISTRO.deliveryTimeRange,
      },
    });
  }, [cart.items.length, pricing.total, clearCart, router]);

  const isEmpty = cart.items.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your Cart</Text>
          {!isEmpty && (
            <Text style={styles.headerSub}>
              {cart.items.reduce((s, i) => s + i.quantity, 0)} items · {THE_BISTRO.name}
            </Text>
          )}
        </View>
        {!isEmpty && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => Alert.alert("Clear Cart", "Remove all items?", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: clearCart },
            ])}
          >
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyEmoji}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add some delicious items from the menu to get started.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push("/(tabs)")}>
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        >
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Line items */}
            <View style={styles.itemsCard}>
              <View style={styles.itemsHeader}>
                <SymbolView
                  name={{ ios: "bag.fill", android: "shopping_bag", web: "shopping_bag" }}
                  tintColor={Colors.brand.primary}
                  size={16}
                />
                <Text style={styles.itemsHeaderText}>{THE_BISTRO.name}</Text>
              </View>
              {cart.items.map((item) => (
                <CartLineItem
                  key={item.lineItemId}
                  item={item}
                  isHighlighted={recentlyUpdatedLineItemIds.includes(item.lineItemId)}
                  onIncrement={(id) => updateQuantity(id, item.quantity + 1)}
                  onDecrement={(id) => updateQuantity(id, item.quantity - 1)}
                  onRemove={removeItem}
                />
              ))}
            </View>

            {/* Promo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Promo Code</Text>
              <PromoInput
                appliedCode={cart.promoCode}
                subtotal={pricing.subtotal}
                onApply={applyPromo}
                onRemove={removePromo}
              />
            </View>

            {/* Tip */}
            <TipSelector currentTip={cart.tipAmount} onSelectTip={setTip} />

            {/* Pricing breakdown */}
            <View style={styles.pricingCard}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <PricingRow label="Subtotal" value={pricing.subtotal} />
              <PricingRow label="Service fee (5%)" value={pricing.serviceFee} />
              <PricingRow label="Delivery fee" value={pricing.deliveryFee} isFree={pricing.deliveryFee === 0} />
              <PricingRow label="Tax (8.75%)" value={pricing.tax} />
              {cart.tipAmount > 0 && <PricingRow label="Driver tip" value={cart.tipAmount} />}
              {pricing.promoDiscount > 0 && (
                <PricingRow label={`Promo (${cart.promoCode})`} value={pricing.promoDiscount} isDiscount />
              )}
              <View style={styles.totalDivider} />
              <PricingRow label="Total" value={pricing.total} isTotal />
            </View>

            {/* Delivery info */}
            <View style={styles.deliveryInfo}>
              <SymbolView
                name={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
                tintColor={Colors.neutral.secondary}
                size={14}
              />
              <Text style={styles.deliveryText}>
                Estimated delivery: {THE_BISTRO.deliveryTimeRange}
              </Text>
            </View>

            <View style={{ height: TAB_BAR_HEIGHT + 80 }} />
          </ScrollView>

          {/* Checkout button — sits above the tab bar */}
          <View style={[styles.checkoutContainer, { bottom: checkoutBottomPad }]}>
            <TouchableOpacity
              style={[styles.checkoutBtn, isCheckingOut && styles.checkoutBtnLoading]}
              onPress={handleCheckout}
              disabled={isCheckingOut}
              accessibilityRole="button"
              accessibilityLabel={`Place order, total ${formatPrice(pricing.total)}`}
            >
              {isCheckingOut ? (
                <ActivityIndicator color={Colors.neutral.white} />
              ) : (
                <>
                  <View style={styles.checkoutLeft}>
                    <View style={styles.checkoutBadge}>
                      <Text style={styles.checkoutBadgeText}>
                        {cart.items.reduce((s, i) => s + i.quantity, 0)}
                      </Text>
                    </View>
                    <Text style={styles.checkoutBtnText}>Place Order</Text>
                  </View>
                  <Text style={styles.checkoutBtnPrice}>{formatPrice(pricing.total)}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.neutral.offWhite },
  flex: { flex: 1 },
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
  headerTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.semantic.error + "12",
    borderRadius: Radius.full,
  },
  clearText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.semantic.error,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base, gap: Spacing.md },
  itemsCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.sm,
  },
  itemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.surface,
  },
  itemsHeaderText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  section: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    marginBottom: Spacing.xs,
  },
  pricingCard: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  totalDivider: {
    height: 1.5,
    backgroundColor: Colors.neutral.border,
    marginVertical: Spacing.sm,
  },
  deliveryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  deliveryText: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.secondary,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing["2xl"],
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  emptySubtitle: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
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
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
  checkoutContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.neutral.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  checkoutBtn: {
    height: 60,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  checkoutBtnLoading: { justifyContent: "center" },
  checkoutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  checkoutBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBadgeText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
  },
  checkoutBtnText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
  checkoutBtnPrice: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: -0.3,
  },
});
