/**
 * app/(tabs)/ai-chat.tsx
 * Full-screen conversational AI ordering.
 * - SHOW_OPTIONS: interactive item cards inline in chat
 * - CustomizeModal: multi-select customization picker
 * - Delegates send/handle logic to useAIChat hook
 */

import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { TAB_BAR_HEIGHT } from "@/constants/layout";
import { useAIChat } from "@/hooks/useAIChat";
import { useAI, useBistroStore, useMenu } from "@/store";
import {
    buildDefaultSelections,
    computeSelectionDelta,
    expandSelections,
    getMissingGroups,
    toggleSelection,
} from "@/utils/customization";
import { formatPrice } from "@/utils/format";
import type {
    AIConversationTurn,
    AIMenuOption,
    CartItem,
    CartPricingBreakdown,
} from "@shared/types";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// QUICK SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  { label: "What's popular? 🌟", message: "What's popular?" },
  { label: "I want pizza 🍕",    message: "I want pizza" },
  { label: "Show me burgers 🍔", message: "Show me burgers" },
  { label: "I want sushi 🍣",    message: "I want sushi" },
  { label: "Show me tacos 🌮",   message: "I want tacos" },
  { label: "Show my cart 🛒",    message: "Show my cart" },
  { label: "I want dessert 🍫",  message: "I want dessert" },
  { label: "Show me drinks 🥤",  message: "I want a drink" },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMIZATION MODAL — multi-select (radio + checkbox)
// ─────────────────────────────────────────────────────────────────────────────

type SelectionMap = Record<string, Set<string>>;
interface CustomizeModalProps {
  visible: boolean;
  menuItemId: string;
  onClose: () => void;
  onConfirm: (menuItemId: string, qty: number, selections: SelectionMap) => void;
}

function CustomizeModal({ visible, menuItemId, onClose, onConfirm }: CustomizeModalProps) {
  const { menuItemMap } = useMenu();
  const item = menuItemMap.get(menuItemId);
  const [qty, setQty] = useState(1);
  const [selections, setSelections] = useState<SelectionMap>({});

  useEffect(() => {
    if (!item || !visible) return;
    setSelections(buildDefaultSelections(item));
    setQty(1);
  }, [item, visible]);

  if (!item) return null;

  const missingGroups = getMissingGroups(item, selections);
  const missingRequired = missingGroups.length > 0;
  const totalDelta = computeSelectionDelta(item, selections);
  const unitPrice = item.basePrice + totalDelta;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={cm.root}>
        {/* Header */}
        <View style={cm.header}>
          <TouchableOpacity onPress={onClose} style={cm.headerBtn}>
            <Text style={cm.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={cm.title} numberOfLines={1}>{item.name}</Text>
          <View style={cm.headerBtn} />
        </View>

        <ScrollView
          contentContainerStyle={cm.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Item hero card */}
          <View style={cm.itemCard}>
            <Image source={{ uri: item.imageUrl }} style={cm.itemImage} resizeMode="cover" />
            <View style={cm.itemInfo}>
              <Text style={cm.itemName}>{item.name}</Text>
              <Text style={cm.itemDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={cm.itemPrice}>{formatPrice(unitPrice)}</Text>
            </View>
          </View>

          {/* Customization groups */}
          {item.customizationGroups.map((group) => {
            const chosen = selections[group.id] ?? new Set<string>();
            const count = chosen.size;
            const isRequired = group.minSelections > 0;
            const isDone = count >= group.minSelections;
            const isSingle = group.type === "single";

            return (
              <View key={group.id} style={cm.groupCard}>
                {/* Group header */}
                <View style={cm.groupHeader}>
                  <View style={cm.groupHeaderLeft}>
                    <Text style={cm.groupLabel}>{group.label}</Text>
                    {!isSingle && group.maxSelections > 1 && (
                      <Text style={cm.groupHint}>
                        {isSingle ? "Choose 1" : `Up to ${group.maxSelections}`}
                      </Text>
                    )}
                  </View>
                  {isRequired ? (
                    <View style={[cm.reqBadge, isDone && cm.reqBadgeDone]}>
                      <Text style={[cm.reqText, isDone && cm.reqTextDone]}>
                        {isDone ? "✓ Done" : `Required · ${group.minSelections - count} more`}
                      </Text>
                    </View>
                  ) : count > 0 ? (
                    <View style={cm.optBadge}>
                      <Text style={cm.optBadgeText}>{count} selected</Text>
                    </View>
                  ) : (
                    <Text style={cm.groupHintRight}>Optional</Text>
                  )}
                </View>

                {/* Options */}
                {group.options.map((option, idx) => {
                  const isSelected = chosen.has(option.id);
                  const isAtMax = !isSelected && !isSingle && count >= group.maxSelections;

                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        cm.option,
                        isSelected && cm.optionSelected,
                        isAtMax && cm.optionDimmed,
                        idx === group.options.length - 1 && cm.optionLast,
                      ]}
                      onPress={() => !isAtMax && setSelections((prev) => toggleSelection(prev, group, option.id))}
                      activeOpacity={isAtMax ? 1 : 0.72}
                    >
                      {/* Indicator: radio for single, checkbox for multi */}
                      <View style={[
                        cm.indicator,
                        isSingle ? cm.radio : cm.checkbox,
                        isSelected && cm.indicatorActive,
                        isAtMax && cm.indicatorDimmed,
                      ]}>
                        {isSelected && (
                          isSingle
                            ? <View style={cm.radioDot} />
                            : <Text style={cm.checkmark}>✓</Text>
                        )}
                      </View>

                      {/* Label */}
                      <Text style={[
                        cm.optionLabel,
                        isSelected && cm.optionLabelActive,
                        isAtMax && cm.optionLabelDimmed,
                      ]}>
                        {option.label}
                      </Text>

                      {/* Price delta */}
                      {option.priceDelta > 0 && (
                        <Text style={[cm.priceDelta, isSelected && cm.priceDeltaActive]}>
                          +{formatPrice(option.priceDelta)}
                        </Text>
                      )}
                      {option.isDefault && !isSelected && (
                        <Text style={cm.defaultTag}>Default</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          {/* Quantity stepper */}
          <View style={cm.qtyRow}>
            <Text style={cm.qtyLabel}>Quantity</Text>
            <View style={cm.stepper}>
              <TouchableOpacity
                style={[cm.stepBtn, qty === 1 && cm.stepBtnDim]}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty === 1}
              >
                <Text style={cm.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={cm.qtyNum}>{qty}</Text>
              <TouchableOpacity
                style={cm.stepBtn}
                onPress={() => setQty((q) => Math.min(20, q + 1))}
              >
                <Text style={cm.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Missing selections hint */}
          {missingRequired && (
            <View style={cm.missingHint}>
              <Text style={cm.missingHintText}>
                Still needed: {missingGroups.map((g) => g.label).join(", ")}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add to cart footer */}
        <View style={cm.footer}>
          <TouchableOpacity
            style={[cm.addBtn, missingRequired && cm.addBtnDim]}
            onPress={() => {
              if (missingRequired) return;
              onConfirm(menuItemId, qty, selections);
              onClose();
            }}
            disabled={missingRequired}
          >
            <Text style={cm.addBtnText}>
              {missingRequired
                ? `Make required selections`
                : `Add to Cart · ${formatPrice(unitPrice * qty)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const cm = StyleSheet.create({
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
  headerBtn: { minWidth: 60 },
  cancelText: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
  title: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary, flex: 1, textAlign: "center" },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 130 },

  // Item hero
  itemCard: { flexDirection: "row", backgroundColor: Colors.neutral.white, borderRadius: Radius.xl, overflow: "hidden", ...Shadow.sm },
  itemImage: { width: 110, height: 110 },
  itemInfo: { flex: 1, padding: Spacing.md, gap: 4, justifyContent: "center" },
  itemName: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  itemDesc: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, lineHeight: 16 },
  itemPrice: { fontSize: Typography.size.md, fontWeight: Typography.weight.heavy, color: Colors.brand.primary },

  // Group card
  groupCard: { backgroundColor: Colors.neutral.white, borderRadius: Radius.xl, overflow: "hidden", ...Shadow.sm },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
  },
  groupHeaderLeft: { flex: 1, gap: 2 },
  groupLabel: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  groupHint: { fontSize: Typography.size.xs, color: Colors.neutral.secondary },
  groupHintRight: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, fontStyle: "italic" },

  // Badges
  reqBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    backgroundColor: Colors.brand.primary + "18",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.brand.primary + "30",
  },
  reqBadgeDone: {
    backgroundColor: Colors.semantic.success + "18",
    borderColor: Colors.semantic.success + "30",
  },
  reqText: { fontSize: 11, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  reqTextDone: { color: Colors.semantic.success },
  optBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  optBadgeText: { fontSize: 11, fontWeight: Typography.weight.semibold, color: Colors.neutral.secondary },

  // Options
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
  },
  optionLast: { borderBottomWidth: 0 },
  optionSelected: { backgroundColor: "#FFF5F5" },
  optionDimmed: { opacity: 0.4 },

  // Indicators
  indicator: {
    width: 24, height: 24,
    borderWidth: 2,
    borderColor: Colors.neutral.divider,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radio: { borderRadius: 12 },
  checkbox: { borderRadius: 6 },
  indicatorActive: { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primary + "10" },
  indicatorDimmed: { borderColor: Colors.neutral.border },
  radioDot: {
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: Colors.brand.primary,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
    lineHeight: 16,
  },

  // Labels
  optionLabel: { flex: 1, fontSize: Typography.size.base, color: Colors.neutral.primary },
  optionLabelActive: { fontWeight: Typography.weight.semibold },
  optionLabelDimmed: { color: Colors.neutral.placeholder },
  priceDelta: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, fontWeight: Typography.weight.medium },
  priceDeltaActive: { color: Colors.brand.primary, fontWeight: Typography.weight.bold },
  defaultTag: { fontSize: 10, color: Colors.neutral.placeholder, fontStyle: "italic" },

  // Missing hint
  missingHint: {
    backgroundColor: "#FFF8F0",
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.brand.accent,
  },
  missingHintText: {
    fontSize: Typography.size.xs,
    color: Colors.brand.accent,
    fontWeight: Typography.weight.semibold,
  },

  // Quantity
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  qtyLabel: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  stepper: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  stepBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.brand.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepBtnDim: { backgroundColor: Colors.neutral.divider, shadowOpacity: 0 },
  stepBtnText: { fontSize: 20, fontWeight: Typography.weight.bold, color: Colors.neutral.white, lineHeight: 24 },
  qtyNum: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary, minWidth: 28, textAlign: "center" },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: Spacing.base, paddingBottom: Spacing.lg,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.neutral.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtn: {
    height: 58, backgroundColor: Colors.brand.primary,
    borderRadius: Radius.xl,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  addBtnDim: { backgroundColor: Colors.neutral.divider, shadowOpacity: 0 },
  addBtnText: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.white },
});

// ─────────────────────────────────────────────────────────────────────────────
// MENU OPTION CARD (inline in chat)
// ─────────────────────────────────────────────────────────────────────────────

const DIETARY_COLORS: Record<string, { bg: string; text: string }> = {
  vegan:        { bg: "#DCFCE7", text: "#15803D" },
  vegetarian:   { bg: "#D1FAE5", text: "#065F46" },
  "gluten-free":{ bg: "#E0F2FE", text: "#0369A1" },
  spicy:        { bg: "#FEE2E2", text: "#B91C1C" },
  popular:      { bg: "#FEF3C7", text: "#92400E" },
  featured:     { bg: "#FCE7F3", text: "#BE185D" },
  new:          { bg: "#EDE9FE", text: "#6D28D9" },
};

interface OptionCardProps {
  option: AIMenuOption;
  onSelect: (menuItemId: string) => void;
  onCustomize: (menuItemId: string) => void;
}

function OptionCard({ option, onSelect, onCustomize }: OptionCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    if (option.hasCustomizations) {
      onCustomize(option.menuItemId);
    } else {
      onSelect(option.menuItemId);
    }
  };

  const visibleTags = option.dietaryTags
    .filter((t) => DIETARY_COLORS[t])
    .slice(0, 2);

  return (
    <Animated.View style={[oc.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity style={oc.inner} onPress={handlePress} activeOpacity={0.88}>
        <Image source={{ uri: option.imageUrl }} style={oc.image} resizeMode="cover" />
        <View style={oc.content}>
          {visibleTags.length > 0 && (
            <View style={oc.tagRow}>
              {visibleTags.map((t) => (
                <View key={t} style={[oc.tag, { backgroundColor: DIETARY_COLORS[t].bg }]}>
                  <Text style={[oc.tagText, { color: DIETARY_COLORS[t].text }]}>{t}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={oc.name} numberOfLines={1}>{option.name}</Text>
          <Text style={oc.desc} numberOfLines={2}>{option.description}</Text>
          <View style={oc.footer}>
            <View>
              <Text style={oc.price}>{formatPrice(option.basePrice)}</Text>
              <View style={oc.ratingRow}>
                <Text style={oc.star}>★</Text>
                <Text style={oc.rating}>{option.rating.toFixed(1)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={oc.addBtn}
              onPress={handlePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {option.hasCustomizations ? (
                <Text style={oc.addBtnText}>Customize</Text>
              ) : (
                <Text style={oc.addBtnTextIcon}>+</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const oc = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    marginRight: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  inner: { flex: 1 },
  image: { width: "100%", height: 120 },
  content: { padding: Spacing.sm, gap: 4 },
  tagRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  tagText: { fontSize: 9, fontWeight: Typography.weight.bold },
  name: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  desc: { fontSize: 10, color: Colors.neutral.secondary, lineHeight: 14 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  price: { fontSize: Typography.size.sm, fontWeight: Typography.weight.heavy, color: Colors.neutral.primary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  star: { fontSize: 10, color: "#F59E0B" },
  rating: { fontSize: 10, fontWeight: Typography.weight.semibold, color: Colors.neutral.secondary },
  addBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.full,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.neutral.white },
  addBtnTextIcon: { fontSize: 16, fontWeight: Typography.weight.bold, color: Colors.neutral.white, lineHeight: 20 },
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(480),
        ])
      ).start();
    });
  }, []);
  return (
    <View style={bs.row}>
      <View style={bs.avatar}><Text style={bs.avatarText}>🤖</Text></View>
      <View style={[bs.bubble, bs.aiBubble, bs.typingBubble]}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[bs.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  turn: AIConversationTurn;
  isLatest: boolean;
  onSelectOption: (menuItemId: string) => void;
  onCustomizeOption: (menuItemId: string) => void;
  onChipPress: (message: string) => void;
  onPlaceOrder: () => void;
  onKeepOrdering: () => void;
  cartItems: CartItem[];
  cartPricing: CartPricingBreakdown | null;
}

function MessageBubble({ turn, isLatest, onSelectOption, onCustomizeOption, onChipPress, onPlaceOrder, onKeepOrdering, cartItems, cartPricing }: MessageBubbleProps) {
  const isUser = turn.role === "user";
  const opacity = useRef(new Animated.Value(isLatest ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(isLatest ? 12 : 0)).current;

  useEffect(() => {
    if (!isLatest) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [isLatest]);

  const time = new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const hasOptions = !isUser && turn.menuOptions && turn.menuOptions.length > 0;
  const hasAddOns = !isUser && turn.addOnSuggestions && turn.addOnSuggestions.length > 0;
  const showSummary = !isUser && turn.showOrderSummary && cartItems.length > 0;
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }]}>
      <View style={[bs.row, isUser ? bs.userRow : bs.aiRow]}>
        {!isUser && <View style={bs.avatar}><Text style={bs.avatarText}>🤖</Text></View>}
        <View style={[bs.bubble, isUser ? bs.userBubble : bs.aiBubble]}>
          <Text style={[bs.text, isUser ? bs.userText : bs.aiText]}>{turn.content}</Text>
          <Text style={[bs.time, isUser ? bs.userTime : bs.aiTime]}>{time}</Text>
        </View>
        {isUser && <View style={bs.userSpacer} />}
      </View>

      {/* Inline option cards */}
      {hasOptions && (
        <View style={bs.optionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bs.optionsList}>
            {turn.menuOptions!.map((opt) => (
              <OptionCard key={opt.menuItemId} option={opt} onSelect={onSelectOption} onCustomize={onCustomizeOption} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Order summary card */}
      {showSummary && cartPricing && (
        <View style={bs.summaryCard}>
          <Text style={bs.summaryTitle}>🛒 Order Summary</Text>
          {cartItems.map((item) => (
            <View key={item.lineItemId} style={bs.summaryRow}>
              <Text style={bs.summaryItemName} numberOfLines={1}>{item.quantity}× {item.name}</Text>
              <Text style={bs.summaryItemPrice}>{formatPrice(item.lineTotal)}</Text>
            </View>
          ))}
          <View style={bs.summaryDivider} />
          <View style={bs.summaryRow}>
            <Text style={bs.summarySubLabel}>Subtotal</Text>
            <Text style={bs.summarySubValue}>{formatPrice(cartPricing.subtotal)}</Text>
          </View>
          <View style={bs.summaryRow}>
            <Text style={bs.summarySubLabel}>Delivery + Fees</Text>
            <Text style={bs.summarySubValue}>{formatPrice(cartPricing.deliveryFee + cartPricing.serviceFee)}</Text>
          </View>
          <View style={bs.summaryRow}>
            <Text style={bs.summaryTotalLabel}>Total</Text>
            <Text style={bs.summaryTotalValue}>{formatPrice(cartPricing.total)}</Text>
          </View>
          <View style={bs.summaryActions}>
            <TouchableOpacity style={bs.keepOrderingBtn} onPress={onKeepOrdering}>
              <Text style={bs.keepOrderingText}>Keep Ordering</Text>
            </TouchableOpacity>
            <TouchableOpacity style={bs.placeOrderBtn} onPress={onPlaceOrder}>
              <Text style={bs.placeOrderText}>Place Order 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add-on suggestion chips */}
      {hasAddOns && (
        <View style={bs.addOnsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bs.addOnsList}>
            {turn.addOnSuggestions!.map((chip) => (
              <TouchableOpacity key={chip.message} style={bs.addOnChip} onPress={() => onChipPress(chip.message)}>
                <Text style={bs.addOnChipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
}

const bs = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", marginBottom: Spacing.sm, paddingHorizontal: Spacing.base },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.brand.primary + "18",
    alignItems: "center", justifyContent: "center",
    marginRight: Spacing.sm, flexShrink: 0, marginBottom: 2,
    borderWidth: 1.5, borderColor: Colors.brand.primary + "25",
  },
  avatarText: { fontSize: 19 },
  userSpacer: { width: 36 + Spacing.sm },
  bubble: { maxWidth: "78%", paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderRadius: 22 },
  userBubble: {
    backgroundColor: Colors.brand.primary,
    borderBottomRightRadius: 6,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  aiBubble: {
    backgroundColor: Colors.neutral.white,
    borderBottomLeftRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  text: { fontSize: Typography.size.base, lineHeight: 23 },
  userText: { color: Colors.neutral.white, fontWeight: Typography.weight.medium },
  aiText: { color: Colors.neutral.primary },
  time: { fontSize: 10, marginTop: 5, alignSelf: "flex-end" },
  userTime: { color: "rgba(255,255,255,0.6)" },
  aiTime: { color: Colors.neutral.placeholder },
  typingBubble: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: Spacing.md, paddingHorizontal: Spacing.base },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.neutral.divider },
  // Options
  optionsContainer: { marginLeft: 36 + Spacing.sm + Spacing.base, marginBottom: Spacing.md, marginTop: 4 },
  optionsList: { paddingRight: Spacing.base },

  // Order summary card
  summaryCard: {
    marginLeft: 36 + Spacing.sm,
    marginRight: Spacing.base,
    marginBottom: Spacing.md,
    marginTop: 4,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: Colors.brand.primary + "22",
  },
  summaryTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  summaryItemName: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.neutral.primary,
    fontWeight: Typography.weight.medium,
  },
  summaryItemPrice: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.primary,
    fontWeight: Typography.weight.semibold,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.neutral.border,
    marginVertical: Spacing.sm,
  },
  summarySubLabel: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  summarySubValue: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  summaryTotalLabel: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  summaryTotalValue: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.brand.primary,
  },
  summaryActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  keepOrderingBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  keepOrderingText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
  },
  placeOrderBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.xl,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  placeOrderText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },

  // Add-on suggestion chips
  addOnsContainer: {
    marginLeft: 36 + Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: 4,
  },
  addOnsList: { paddingRight: Spacing.base, gap: Spacing.sm },
  addOnChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.brand.primary + "55",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  addOnChipText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.brand.primary,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function AIChatScreen() {
  const { conversationHistory, isProcessing, clearConversation } = useAI();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cartItems = useBistroStore((s) => s.cart.items);
  const cartPricing = useBistroStore((s) => s.pricing);

  const [input, setInput] = useState("");
  const [customizeItemId, setCustomizeItemId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 100);
  }, []);

  useEffect(() => {
    if (conversationHistory.length > 0) scrollToBottom();
  }, [conversationHistory.length]);

  const { sendMessage } = useAIChat({ onResponse: scrollToBottom });

  const handleSend = useCallback((text: string) => {
    Keyboard.dismiss();
    setInput("");
    sendMessage(text);
  }, [sendMessage]);

  // ── Option card: quick-add with defaults ──────────────────────────────────
  const handleSelectOption = useCallback((menuItemId: string) => {
    const item = useBistroStore.getState().menuItemMap.get(menuItemId);
    if (!item) return;
    if (item.customizationGroups.some((g) => g.minSelections > 0)) {
      setCustomizeItemId(menuItemId);
      return;
    }
    const defaultSelections = buildDefaultSelections(item);
    const customizations = expandSelections(item, defaultSelections);
    const { addItem: storeAdd, addConversationTurn: storeAddTurn } = useBistroStore.getState();
    storeAdd(menuItemId, 1, customizations);

    // Build add-on suggestions based on category
    const addOnMap: Record<string, Array<{ label: string; message: string }>> = {
      burgers:  [{ label: "🍟 Add Fries", message: "add fries" }, { label: "🥤 Add Drink", message: "show me drinks" }, { label: "🍰 Dessert", message: "show me desserts" }, { label: "🛒 Order Summary", message: "show order summary" }],
      pizza:    [{ label: "🥗 Add Salad", message: "show me salads" }, { label: "🥤 Add Drink", message: "show me drinks" }, { label: "🍰 Dessert", message: "show me desserts" }, { label: "🛒 Order Summary", message: "show order summary" }],
      sushi:    [{ label: "🍣 More Rolls", message: "show me sushi" }, { label: "🥤 Add Drink", message: "show me drinks" }, { label: "🍰 Dessert", message: "show me desserts" }, { label: "🛒 Order Summary", message: "show order summary" }],
      tacos:    [{ label: "🥤 Add Drink", message: "show me drinks" }, { label: "🍰 Dessert", message: "show me desserts" }, { label: "🛒 Order Summary", message: "show order summary" }],
      bowls:    [{ label: "🥤 Add Drink", message: "show me drinks" }, { label: "🍰 Dessert", message: "show me desserts" }, { label: "🛒 Order Summary", message: "show order summary" }],
      pasta:    [{ label: "🥗 Add Salad", message: "show me salads" }, { label: "🥤 Add Drink", message: "show me drinks" }, { label: "🛒 Order Summary", message: "show order summary" }],
      desserts: [{ label: "☕ Add Coffee", message: "add cold brew" }, { label: "🛒 Order Summary", message: "show order summary" }],
      drinks:   [{ label: "🍔 Add Burger", message: "show me burgers" }, { label: "🍕 Add Pizza", message: "show me pizza" }, { label: "🛒 Order Summary", message: "show order summary" }],
    };
    const addOnSuggestions = addOnMap[item.categoryId] ?? [{ label: "🛒 Order Summary", message: "show order summary" }, { label: "🥤 Add Drink", message: "show me drinks" }];

    storeAddTurn({
      role: "assistant",
      content: `Added ${item.name} to your cart! 🛒 Anything else?`,
      timestamp: Date.now(),
      addOnSuggestions,
    });
    scrollToBottom();
  }, [scrollToBottom]);

  // ── Option card: open customization modal ──────────────────────────────────
  const handleCustomizeOption = useCallback((menuItemId: string) => {
    setCustomizeItemId(menuItemId);
  }, []);

  // ── Customization modal confirm ─────────────────────────────────────────────
  const handleCustomizeConfirm = useCallback((menuItemId: string, qty: number, selectionMap: SelectionMap) => {
    const item = useBistroStore.getState().menuItemMap.get(menuItemId);
    if (!item) return;
    const { addItem: storeAdd, addConversationTurn: storeAddTurn } = useBistroStore.getState();
    const selectedCustomizations = expandSelections(item, selectionMap);
    storeAdd(menuItemId, qty, selectedCustomizations);
    const summary = selectedCustomizations.slice(0, 4).map((c) => c.optionLabel).join(", ");
    storeAddTurn({
      role: "assistant",
      content: `Added ${qty > 1 ? `${qty}× ` : ""}${item.name}${summary ? ` (${summary})` : ""} to your cart! 🛒 Anything else?`,
      timestamp: Date.now(),
      addOnSuggestions: [
        { label: "🛒 Order Summary", message: "show order summary" },
        { label: "🥤 Add Drink", message: "show me drinks" },
        { label: "🍰 Add Dessert", message: "show me desserts" },
      ],
    });
    scrollToBottom();
  }, [scrollToBottom]);

  // ── Chip press ────────────────────────────────────────────────────────────
  const handleChipPress = useCallback((message: string) => {
    sendMessage(message);
  }, [sendMessage]);

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = useCallback(() => {
    router.push("/(tabs)/cart" as any);
  }, [router]);

  const handleKeepOrdering = useCallback(() => {
    // Show recommended add-on items as cards based on what's in the cart
    const store = useBistroStore.getState();
    const cartCategoryIds = new Set(
      store.cart.items.map((item) => {
        const menuItem = store.menuItemMap.get(item.menuItemId);
        return menuItem?.categoryId ?? "";
      })
    );

    // Recommend items from complementary categories
    const complementary: Record<string, string[]> = {
      burgers: ["drinks", "desserts"],
      pizza: ["drinks", "salads", "desserts"],
      sushi: ["drinks", "desserts"],
      tacos: ["drinks", "desserts"],
      bowls: ["drinks", "desserts"],
      pasta: ["drinks", "salads"],
      salads: ["drinks", "pasta"],
      desserts: ["drinks"],
      drinks: ["burgers", "pizza", "desserts"],
    };

    const suggestCategories = new Set<string>();
    for (const catId of cartCategoryIds) {
      const comps = complementary[catId] ?? ["drinks", "desserts"];
      comps.forEach((c) => suggestCategories.add(c));
    }

    // Get top-rated items from suggested categories (max 5)
    const suggestions = store.menuItems
      .filter((m) => suggestCategories.has(m.categoryId) && m.isAvailable)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    if (suggestions.length > 0) {
      const { addConversationTurn } = useBistroStore.getState();
      addConversationTurn({
        role: "assistant",
        content: "Here are some great add-ons to go with your order! 🌟",
        timestamp: Date.now(),
        menuOptions: suggestions.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          description: item.description,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          dietaryTags: item.dietaryTags as string[],
          rating: item.rating,
          hasCustomizations: item.customizationGroups.length > 0,
        })),
        optionCategory: "recommendations",
      });
      scrollToBottom();
    } else {
      sendMessage("What else do you recommend?");
    }
  }, [scrollToBottom, sendMessage]);

  const isEmpty = conversationHistory.length === 0;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarEmoji}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Order Assistant</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isProcessing && styles.statusDotThinking]} />
              <Text style={styles.headerSubtitle}>
                {isProcessing ? "Thinking..." : "Online · Ready to order"}
              </Text>
            </View>
          </View>
        </View>
        {!isEmpty && (
          <TouchableOpacity onPress={clearConversation} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={[styles.flex, { marginBottom: TAB_BAR_HEIGHT }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {isEmpty ? (
          <View style={[styles.emptyState, { paddingBottom: 80 }]}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>What are you craving?</Text>
            <Text style={styles.emptySubtitle}>
              Tell me what you'd like and I'll show you options or add it to your cart instantly.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={conversationHistory}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <MessageBubble
                turn={item}
                isLatest={index === conversationHistory.length - 1 && !isProcessing}
                onSelectOption={handleSelectOption}
                onCustomizeOption={handleCustomizeOption}
                onChipPress={handleChipPress}
                onPlaceOrder={handlePlaceOrder}
                onKeepOrdering={handleKeepOrdering}
                cartItems={cartItems}
                cartPricing={cartPricing}
              />
            )}
            contentContainerStyle={{ paddingTop: Spacing.base, paddingBottom: Spacing.md }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={isProcessing ? (
              <View style={{ paddingHorizontal: Spacing.base, marginBottom: Spacing.sm }}>
                <TypingIndicator />
              </View>
            ) : null}
            onContentSizeChange={() => scrollToBottom(false)}
          />
        )}

        {/* Quick suggestion chips */}
        {isEmpty && (
          <View style={styles.chipsWrapper}>
            <FlatList
              data={QUICK_SUGGESTIONS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(s) => s.message}
              contentContainerStyle={styles.chipsList}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.chip} onPress={() => sendMessage(item.message)}>
                  <Text style={styles.chipText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Message AI assistant..."
            placeholderTextColor={Colors.neutral.placeholder}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={300}
            returnKeyType="send"
            enablesReturnKeyAutomatically
            onSubmitEditing={() => handleSend(input)}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isProcessing) && styles.sendBtnOff]}
            onPress={() => handleSend(input)}
            disabled={!input.trim() || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={Colors.neutral.white} />
            ) : (
              <SymbolView
                name={{ ios: "arrow.up", android: "send", web: "send" }}
                tintColor={Colors.neutral.white}
                size={18}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Customization modal */}
      <CustomizeModal
        visible={customizeItemId !== null}
        menuItemId={customizeItemId ?? ""}
        onClose={() => setCustomizeItemId(null)}
        onConfirm={handleCustomizeConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F2F7" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.neutral.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  headerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.brand.primary + "18",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.brand.primary + "30",
  },
  headerAvatarEmoji: { fontSize: 24 },
  headerTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary, letterSpacing: -0.2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  statusDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.semantic.success,
    shadowColor: Colors.semantic.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3,
  },
  statusDotThinking: { backgroundColor: Colors.brand.accent, shadowColor: Colors.brand.accent },
  headerSubtitle: { fontSize: Typography.size.xs, color: Colors.neutral.secondary },
  clearBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    backgroundColor: Colors.neutral.surface, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.neutral.border,
  },
  clearText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, color: Colors.neutral.secondary },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing["2xl"], gap: Spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.heavy, color: Colors.neutral.primary, textAlign: "center", letterSpacing: -0.4 },
  emptySubtitle: { fontSize: Typography.size.base, color: Colors.neutral.secondary, textAlign: "center", lineHeight: 22 },
  chipsWrapper: { paddingBottom: Spacing.sm },
  chipsList: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.neutral.white, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.neutral.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  chipText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.neutral.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8,
  },
  input: {
    flex: 1, minHeight: 46, maxHeight: 120,
    backgroundColor: Colors.neutral.surface, borderRadius: 23,
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === "ios" ? 12 : Spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 12 : Spacing.sm,
    fontSize: Typography.size.base, color: Colors.neutral.primary,
    borderWidth: 1.5, borderColor: Colors.neutral.border,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.brand.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  sendBtnOff: { backgroundColor: Colors.neutral.divider, shadowOpacity: 0 },
});
