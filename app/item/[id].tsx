/**
 * app/item/[id].tsx
 * Item detail screen with full customization tray.
 * Features:
 *  - Hero image with parallax-style header
 *  - Sticky validation banner: "Make N required selections"
 *  - Per-group single/multi selectors with price deltas
 *  - Special instructions text input
 *  - Quantity stepper
 *  - Add to cart CTA with computed total
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useCart, useMenu } from "@/store";
import type { CustomizationGroup, SelectedCustomization } from "@shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

import { formatPrice } from "@/utils/format";

type SelectionMap = Record<string, Set<string>>;

function buildSelectedCustomizations(
  groups: CustomizationGroup[],
  selections: SelectionMap
): SelectedCustomization[] {
  const result: SelectedCustomization[] = [];
  for (const group of groups) {
    const chosen = selections[group.id];
    if (!chosen) continue;
    for (const optionId of chosen) {
      const option = group.options.find((o) => o.id === optionId);
      if (option) {
        result.push({
          groupId: group.id,
          groupLabel: group.label,
          optionId: option.id,
          optionLabel: option.label,
          priceDelta: option.priceDelta,
        });
      }
    }
  }
  return result;
}

function computeCustomizationDelta(
  groups: CustomizationGroup[],
  selections: SelectionMap
): number {
  let delta = 0;
  for (const group of groups) {
    const chosen = selections[group.id];
    if (!chosen) continue;
    for (const optionId of chosen) {
      const option = group.options.find((o) => o.id === optionId);
      if (option) delta += option.priceDelta;
    }
  }
  return delta;
}

function getValidationErrors(
  groups: CustomizationGroup[],
  selections: SelectionMap
): string[] {
  const errors: string[] = [];
  for (const group of groups) {
    const chosen = selections[group.id];
    const count = chosen?.size ?? 0;
    if (count < group.minSelections) {
      const remaining = group.minSelections - count;
      errors.push(
        `${group.label}: select ${remaining} more option${remaining !== 1 ? "s" : ""}`
      );
    }
  }
  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// STICKY VALIDATION BANNER
// ─────────────────────────────────────────────────────────────────────────────

function ValidationBanner({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  const label =
    errors.length === 1
      ? errors[0]
      : `Make ${errors.length} required selection${errors.length !== 1 ? "s" : ""}`;

  return (
    <View style={bannerStyles.container} accessibilityRole="alert">
      <SymbolView
        name={{ ios: "exclamationmark.circle.fill", android: "error", web: "error" }}
        tintColor={Colors.neutral.white}
        size={16}
      />
      <Text style={bannerStyles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.neutral.white,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMIZATION GROUP SECTION
// ─────────────────────────────────────────────────────────────────────────────

interface CustomizationSectionProps {
  group: CustomizationGroup;
  selections: Set<string>;
  onToggle: (groupId: string, optionId: string) => void;
  hasError: boolean;
}

function CustomizationSection({
  group,
  selections,
  onToggle,
  hasError,
}: CustomizationSectionProps) {
  const isSingle = group.type === "single";
  const isRequired = group.minSelections > 0;

  return (
    <View style={[sectionStyles.container, hasError && sectionStyles.containerError]}>
      {/* Header */}
      <View style={sectionStyles.header}>
        <View style={sectionStyles.headerLeft}>
          <Text style={sectionStyles.title}>{group.label}</Text>
          {isRequired && (
            <View style={sectionStyles.requiredBadge}>
              <Text style={sectionStyles.requiredText}>Required</Text>
            </View>
          )}
        </View>
        <Text style={sectionStyles.hint}>
          {isSingle
            ? "Choose 1"
            : group.maxSelections === group.options.length
            ? `Up to ${group.maxSelections}`
            : `${group.minSelections}–${group.maxSelections}`}
        </Text>
      </View>

      {/* Options */}
      {group.options.map((option) => {
        const isSelected = selections.has(option.id);
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              sectionStyles.option,
              isSelected && sectionStyles.optionSelected,
            ]}
            onPress={() => onToggle(group.id, option.id)}
            activeOpacity={0.75}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`${option.label}${option.priceDelta > 0 ? `, add ${formatPrice(option.priceDelta)}` : ""}`}
          >
            {/* Selector indicator */}
            <View
              style={[
                sectionStyles.indicator,
                isSingle ? sectionStyles.radio : sectionStyles.checkbox,
                isSelected && sectionStyles.indicatorSelected,
              ]}
            >
              {isSelected && (
                <View
                  style={[
                    sectionStyles.indicatorInner,
                    isSingle
                      ? sectionStyles.radioDot
                      : sectionStyles.checkmark,
                  ]}
                />
              )}
            </View>

            {/* Label */}
            <Text
              style={[
                sectionStyles.optionLabel,
                isSelected && sectionStyles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>

            {/* Price delta */}
            {option.priceDelta > 0 && (
              <Text style={sectionStyles.priceDelta}>
                +{formatPrice(option.priceDelta)}
              </Text>
            )}
            {option.isDefault && !isSelected && (
              <Text style={sectionStyles.defaultLabel}>Default</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadow.sm,
  },
  containerError: {
    borderWidth: 1.5,
    borderColor: Colors.brand.primary + "88",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
    backgroundColor: Colors.neutral.surface,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  requiredBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: Colors.brand.primary + "22",
    borderRadius: Radius.full,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
  },
  hint: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  optionSelected: {
    backgroundColor: "#FFF5F5",
  },
  indicator: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.neutral.divider,
    flexShrink: 0,
  },
  radio: { borderRadius: 11 },
  checkbox: { borderRadius: 5 },
  indicatorSelected: { borderColor: Colors.brand.primary },
  indicatorInner: { backgroundColor: Colors.brand.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  checkmark: { width: 12, height: 12, borderRadius: 2 },
  optionLabel: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
  },
  optionLabelSelected: { fontWeight: Typography.weight.semibold },
  priceDelta: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.neutral.secondary,
  },
  defaultLabel: {
    fontSize: 10,
    color: Colors.neutral.placeholder,
    fontStyle: "italic",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { menuItemMap } = useMenu();

  const item = menuItemMap.get(id ?? "");

  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  // Build initial selections: pre-select defaults
  const [selections, setSelections] = useState<SelectionMap>(() => {
    if (!item) return {};
    const initial: SelectionMap = {};
    for (const group of item.customizationGroups) {
      initial[group.id] = new Set(
        group.options.filter((o) => o.isDefault).map((o) => o.id)
      );
    }
    return initial;
  });

  const handleToggle = useCallback(
    (groupId: string, optionId: string) => {
      if (!item) return;
      const group = item.customizationGroups.find((g) => g.id === groupId);
      if (!group) return;

      setSelections((prev) => {
        const next = { ...prev };
        const current = new Set(next[groupId] ?? []);

        if (group.type === "single") {
          // Radio: replace selection
          next[groupId] = new Set([optionId]);
        } else {
          // Checkbox: toggle, respecting maxSelections
          if (current.has(optionId)) {
            current.delete(optionId);
            next[groupId] = current;
          } else if (current.size < group.maxSelections) {
            current.add(optionId);
            next[groupId] = current;
          }
        }
        return next;
      });
    },
    [item]
  );

  const validationErrors = useMemo(
    () => (item ? getValidationErrors(item.customizationGroups, selections) : []),
    [item, selections]
  );

  const customizationDelta = useMemo(
    () => (item ? computeCustomizationDelta(item.customizationGroups, selections) : 0),
    [item, selections]
  );

  const unitPrice = item ? item.basePrice + customizationDelta : 0;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = useCallback(() => {
    if (!item) return;
    if (validationErrors.length > 0) {
      setShowValidation(true);
      return;
    }
    const customizations = buildSelectedCustomizations(
      item.customizationGroups,
      selections
    );
    addItem(item.id, quantity, customizations, specialInstructions || undefined);
    router.back();
  }, [item, validationErrors, selections, quantity, specialInstructions, addItem, router]);

  if (!item) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Text style={styles.notFoundText}>Item not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const errorsToShow = showValidation ? validationErrors : [];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── Sticky validation banner ── */}
      <View style={[styles.stickyBanner, { paddingTop: insets.top }]}>
        <ValidationBanner errors={errorsToShow} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* ── Hero Image ── */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
            accessibilityLabel={item.name}
          />
          <View style={styles.heroOverlay} />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + Spacing.sm }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <SymbolView
              name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
              tintColor={Colors.neutral.white}
              size={20}
            />
          </TouchableOpacity>
        </View>

        {/* ── Item Info ── */}
        <View style={styles.infoSection}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription}>{item.description}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingChip}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>
                ({item.reviewCount.toLocaleString()})
              </Text>
            </View>
            {item.calories && (
              <Text style={styles.calories}>{item.calories} cal</Text>
            )}
            <Text style={styles.basePrice}>{formatPrice(item.basePrice)}</Text>
          </View>
        </View>

        {/* ── Customization Groups ── */}
        {item.customizationGroups.length > 0 && (
          <View style={styles.customizationsSection}>
            {item.customizationGroups.map((group) => {
              const hasError =
                showValidation &&
                (selections[group.id]?.size ?? 0) < group.minSelections;
              return (
                <CustomizationSection
                  key={group.id}
                  group={group}
                  selections={selections[group.id] ?? new Set()}
                  onToggle={handleToggle}
                  hasError={hasError}
                />
              );
            })}
          </View>
        )}

        {/* ── Special Instructions ── */}
        <View style={styles.instructionsSection}>
          <Text style={styles.instructionsLabel}>Special Instructions</Text>
          <TextInput
            style={styles.instructionsInput}
            placeholder="Allergies, preferences, or special requests..."
            placeholderTextColor={Colors.neutral.placeholder}
            value={specialInstructions}
            onChangeText={setSpecialInstructions}
            multiline
            maxLength={200}
            accessibilityLabel="Special instructions"
          />
          <Text style={styles.charCount}>
            {specialInstructions.length}/200
          </Text>
        </View>
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View
        style={[
          styles.ctaContainer,
          { paddingBottom: insets.bottom + Spacing.sm },
        ]}
      >
        {/* Quantity stepper */}
        <View style={styles.quantityStepper}>
          <TouchableOpacity
            style={[styles.stepBtn, quantity === 1 && styles.stepBtnDisabled]}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity === 1}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setQuantity((q) => Math.min(20, q + 1))}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
          >
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Add to cart */}
        <TouchableOpacity
          style={[
            styles.addBtn,
            !item.isAvailable && styles.addBtnDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={!item.isAvailable}
          accessibilityRole="button"
          accessibilityLabel={`Add ${quantity} to cart, ${formatPrice(totalPrice)}`}
        >
          <Text style={styles.addBtnText}>
            {item.isAvailable ? "Add to Cart" : "Unavailable"}
          </Text>
          {item.isAvailable && (
            <Text style={styles.addBtnPrice}>{formatPrice(totalPrice)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.offWhite },

  stickyBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing["2xl"] },

  // Hero
  heroContainer: { height: 320, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  backBtn: {
    position: "absolute",
    left: Spacing.base,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  // Info
  infoSection: {
    backgroundColor: Colors.neutral.white,
    padding: Spacing.base,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
  },
  itemName: {
    fontSize: Typography.size["2xl"],
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  itemDescription: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
    lineHeight: 23,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  star: { fontSize: 12, color: "#F59E0B" },
  rating: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: "#92400E",
  },
  reviewCount: { fontSize: Typography.size.xs, color: "#92400E" },
  calories: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.secondary,
    backgroundColor: Colors.neutral.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  basePrice: {
    marginLeft: "auto",
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
    letterSpacing: -0.4,
  },

  // Customizations
  customizationsSection: {
    padding: Spacing.base,
    gap: Spacing.md,
  },

  // Instructions
  instructionsSection: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  instructionsLabel: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  instructionsInput: {
    minHeight: 88,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.placeholder,
    alignSelf: "flex-end",
  },

  // CTA
  ctaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.neutral.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  quantityStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  stepBtnDisabled: {
    backgroundColor: Colors.neutral.divider,
    shadowOpacity: 0,
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
    lineHeight: 26,
  },
  quantityText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    minWidth: 30,
    textAlign: "center",
  },
  addBtn: {
    flex: 1,
    height: 58,
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
  addBtnDisabled: {
    backgroundColor: Colors.neutral.divider,
    shadowOpacity: 0,
  },
  addBtnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
  addBtnPrice: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: -0.2,
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  notFoundText: {
    fontSize: Typography.size.lg,
    color: Colors.neutral.primary,
  },
  backLink: {
    fontSize: Typography.size.base,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
  },
});
