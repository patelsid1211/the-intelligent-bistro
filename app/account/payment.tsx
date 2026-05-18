/**
 * app/account/payment.tsx
 * Payment Methods — proper card formatting, Luhn validation,
 * real-time brand detection, visual card preview, expiry validation.
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// CARD BRAND DETECTION
// ─────────────────────────────────────────────────────────────────────────────

type CardBrand = "Visa" | "Mastercard" | "Amex" | "Discover" | "Unknown";

interface BrandConfig {
  name: CardBrand;
  color: string;
  gradient: [string, string];
  cvvLength: number;
  numberLength: number;
  pattern: RegExp;
  format: number[]; // digit groups e.g. [4,4,4,4]
  abbr: string;
}

const BRANDS: BrandConfig[] = [
  { name: "Amex",       color: "#007BC1", gradient: ["#007BC1","#00A3E0"], cvvLength: 4, numberLength: 15, pattern: /^3[47]/,          format: [4,6,5], abbr: "AMEX" },
  { name: "Discover",   color: "#FF6600", gradient: ["#FF6600","#FF8C00"], cvvLength: 3, numberLength: 16, pattern: /^6(?:011|5)/,      format: [4,4,4,4], abbr: "DISC" },
  { name: "Mastercard", color: "#EB001B", gradient: ["#EB001B","#F79E1B"], cvvLength: 3, numberLength: 16, pattern: /^5[1-5]|^2[2-7]/, format: [4,4,4,4], abbr: "MC" },
  { name: "Visa",       color: "#1A1F71", gradient: ["#1A1F71","#2D3A8C"], cvvLength: 3, numberLength: 16, pattern: /^4/,              format: [4,4,4,4], abbr: "VISA" },
];

function detectBrand(digits: string): BrandConfig | null {
  return BRANDS.find((b) => b.pattern.test(digits)) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LUHN ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────

function luhn(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function formatNumber(raw: string, brand: BrandConfig | null): string {
  const maxLen = brand?.numberLength ?? 16;
  const digits = raw.replace(/\D/g, "").slice(0, maxLen);
  const groups = brand?.format ?? [4, 4, 4, 4];
  const parts: string[] = [];
  let pos = 0;
  for (const len of groups) {
    if (pos >= digits.length) break;
    parts.push(digits.slice(pos, pos + len));
    pos += len;
  }
  return parts.join(" ");
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function validateExpiry(value: string): string | null {
  if (value.length < 5) return "Enter expiry as MM/YY.";
  const [mm, yy] = value.split("/");
  const month = parseInt(mm, 10);
  const year = parseInt(`20${yy}`, 10);
  if (month < 1 || month > 12) return "Invalid month (01–12).";
  const now = new Date();
  const expDate = new Date(year, month - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (expDate < thisMonth) return "This card has expired.";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD PREVIEW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function CardPreview({ number, name, expiry, brand }: {
  number: string; name: string; expiry: string; brand: BrandConfig | null;
}) {
  const bg = brand ? brand.gradient[0] : "#8E8E93";
  const digits = number.replace(/\s/g, "");
  const maxLen = brand?.numberLength ?? 16;

  // Build masked display: filled digits + dots for remaining
  const groups = brand?.format ?? [4, 4, 4, 4];
  let pos = 0;
  const displayParts = groups.map((len) => {
    const chunk = digits.slice(pos, pos + len);
    const dots = "•".repeat(Math.max(0, len - chunk.length));
    pos += len;
    return chunk + dots;
  });

  return (
    <View style={[cp.card, { backgroundColor: bg }]}>
      {/* Chip */}
      <View style={cp.chip}>
        <View style={cp.chipInner} />
      </View>

      {/* Number */}
      <View style={cp.numberRow}>
        {displayParts.map((part, i) => (
          <Text key={i} style={cp.numberGroup}>{part}</Text>
        ))}
      </View>

      {/* Bottom row */}
      <View style={cp.bottomRow}>
        <View>
          <Text style={cp.label}>CARD HOLDER</Text>
          <Text style={cp.value} numberOfLines={1}>
            {name.trim() || "YOUR NAME"}
          </Text>
        </View>
        <View>
          <Text style={cp.label}>EXPIRES</Text>
          <Text style={cp.value}>{expiry || "MM/YY"}</Text>
        </View>
        {brand && (
          <View style={cp.brandBox}>
            <Text style={cp.brandText}>{brand.abbr}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const cp = StyleSheet.create({
  card: {
    height: 190,
    borderRadius: 16,
    padding: Spacing.base,
    justifyContent: "space-between",
    ...Shadow.lg,
  },
  chip: {
    width: 44,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: 4,
    justifyContent: "center",
  },
  chipInner: {
    height: 12,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  numberRow: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
  },
  numberGroup: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
    fontWeight: "600",
  },
  value: {
    fontSize: Typography.size.sm,
    color: "#FFFFFF",
    fontWeight: Typography.weight.semibold,
    marginTop: 2,
    maxWidth: 140,
  },
  brandBox: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 6,
  },
  brandText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// FIELD ERROR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <Text style={{ fontSize: Typography.size.xs, color: Colors.semantic.error, paddingHorizontal: Spacing.base, paddingBottom: Spacing.xs }}>{msg}</Text>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD LIST ITEM
// ─────────────────────────────────────────────────────────────────────────────

interface SavedCard {
  id: string;
  brand: CardBrand;
  last4: string;
  expiry: string;
  holderName: string;
  isDefault: boolean;
}

const INITIAL_CARDS: SavedCard[] = [
  { id: "card_1", brand: "Visa",       last4: "4242", expiry: "12/26", holderName: "John Doe",  isDefault: true  },
  { id: "card_2", brand: "Mastercard", last4: "5555", expiry: "08/25", holderName: "John Doe",  isDefault: false },
];

function SavedCardRow({ card, onSetDefault, onDelete }: {
  card: SavedCard;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = BRANDS.find((b) => b.name === card.brand);
  const color = cfg?.color ?? "#8E8E93";

  return (
    <View style={cr.row}>
      {/* Mini card chip */}
      <View style={[cr.chip, { backgroundColor: color + "18" }]}>
        <Text style={[cr.chipText, { color }]}>{cfg?.abbr ?? "CARD"}</Text>
      </View>

      <View style={cr.info}>
        <View style={cr.top}>
          <Text style={cr.brand}>{card.brand} ••••{card.last4}</Text>
          {card.isDefault && (
            <View style={cr.badge}><Text style={cr.badgeText}>Default</Text></View>
          )}
        </View>
        <Text style={cr.sub}>{card.holderName} · Expires {card.expiry}</Text>
      </View>

      <View style={cr.actions}>
        {!card.isDefault && (
          <TouchableOpacity style={cr.setBtn} onPress={() => onSetDefault(card.id)}>
            <Text style={cr.setBtnText}>Set default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onDelete(card.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <SymbolView name={{ ios: "trash", android: "delete", web: "delete" }} tintColor={Colors.semantic.error} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", padding: Spacing.base, gap: Spacing.md },
  chip: { width: 52, height: 34, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  info: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  brand: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary },
  sub: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, backgroundColor: Colors.brand.primary + "18", borderRadius: Radius.full },
  badgeText: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  actions: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  setBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.neutral.surface, borderRadius: Radius.sm },
  setBtnText: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, fontWeight: Typography.weight.medium },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function PaymentScreen() {
  const router = useRouter();
  const [cards, setCards] = useState<SavedCard[]>(INITIAL_CARDS);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [rawNumber, setRawNumber] = useState("");
  const [rawExpiry, setRawExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holderName, setHolderName] = useState("");
  const [saving, setSaving] = useState(false);

  // Per-field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const expiryRef = useRef<TextInput>(null);
  const cvvRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  const digits = rawNumber.replace(/\s/g, "");
  const brand = detectBrand(digits);
  const displayNumber = formatNumber(rawNumber, brand);
  const displayExpiry = formatExpiry(rawExpiry);

  const setFE = (key: string, msg: string | null) =>
    setErrors((prev) => { const n = { ...prev }; if (msg) n[key] = msg; else delete n[key]; return n; });

  // ── Number input ────────────────────────────────────────────────────────────

  const handleNumberChange = useCallback((raw: string) => {
    const d = raw.replace(/\D/g, "");
    const b = detectBrand(d);
    const maxLen = b?.numberLength ?? 16;
    const clamped = d.slice(0, maxLen);
    setRawNumber(formatNumber(clamped, b));
    setFE("number", null);

    // Auto-advance to expiry when full
    if (clamped.length === maxLen) {
      expiryRef.current?.focus();
    }
  }, []);

  // ── Expiry input ────────────────────────────────────────────────────────────

  const handleExpiryChange = useCallback((raw: string) => {
    // Handle backspace over slash
    if (raw.length < rawExpiry.length && rawExpiry.endsWith("/")) {
      setRawExpiry(raw.slice(0, -1));
      return;
    }
    const d = raw.replace(/\D/g, "").slice(0, 4);
    setRawExpiry(d);
    setFE("expiry", null);

    // Auto-advance to CVV when full
    if (d.length === 4) {
      cvvRef.current?.focus();
    }
  }, [rawExpiry]);

  // ── CVV input ───────────────────────────────────────────────────────────────

  const handleCvvChange = useCallback((raw: string) => {
    const maxCvv = brand?.cvvLength ?? 3;
    const d = raw.replace(/\D/g, "").slice(0, maxCvv);
    setCvv(d);
    setFE("cvv", null);
    if (d.length === maxCvv) nameRef.current?.focus();
  }, [brand]);

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const maxLen = brand?.numberLength ?? 16;

    if (digits.length < maxLen) {
      errs.number = `Enter a valid ${maxLen}-digit card number.`;
    } else if (!luhn(digits)) {
      errs.number = "This card number is invalid.";
    }

    const expiryErr = validateExpiry(displayExpiry);
    if (expiryErr) errs.expiry = expiryErr;

    const maxCvv = brand?.cvvLength ?? 3;
    if (cvv.length < maxCvv) errs.cvv = `CVV must be ${maxCvv} digits.`;

    if (!holderName.trim()) errs.name = "Cardholder name is required.";
    else if (holderName.trim().length < 2) errs.name = "Enter the full name on the card.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));

    setCards((prev) => [...prev, {
      id: `card_${Date.now()}`,
      brand: brand?.name ?? "Unknown",
      last4: digits.slice(-4),
      expiry: displayExpiry,
      holderName: holderName.trim(),
      isDefault: prev.length === 0,
    }]);

    // Reset form
    setRawNumber(""); setRawExpiry(""); setCvv(""); setHolderName(""); setErrors({});
    setSaving(false);
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (card?.isDefault) {
      Alert.alert("Cannot Remove", "Set another card as default first.");
      return;
    }
    Alert.alert("Remove Card", `Remove ${card?.brand} ••••${card?.last4}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setCards((p) => p.filter((c) => c.id !== id)) },
    ]);
  };

  const handleSetDefault = (id: string) =>
    setCards((p) => p.map((c) => ({ ...c, isDefault: c.id === id })));

  const openAdd = () => {
    setRawNumber(""); setRawExpiry(""); setCvv(""); setHolderName(""); setErrors({});
    setShowAdd(true);
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Payment Methods</Text>
        <TouchableOpacity onPress={openAdd} style={s.headerBtn}>
          <SymbolView name={{ ios: "plus", android: "add", web: "add" }} tintColor={Colors.brand.primary} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Saved cards */}
        {cards.length > 0 && (
          <View style={s.card}>
            {cards.map((card, i) => (
              <View key={card.id}>
                {i > 0 && <View style={s.divider} />}
                <SavedCardRow card={card} onSetDefault={handleSetDefault} onDelete={handleDelete} />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={s.mainAddBtn} onPress={openAdd}>
          <Text style={s.mainAddBtnText}>ADD NEW CARD</Text>
        </TouchableOpacity>

        <Text style={s.secure}>🔒 Payments are encrypted and processed securely.</Text>
      </ScrollView>

      {/* ── Add Card Modal ── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <SafeAreaView style={s.root} edges={["top", "bottom"]}>

            {/* Modal header */}
            <View style={s.header}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={s.headerBtn}>
                <Text style={{ fontSize: 18, color: Colors.neutral.primary }}>✕</Text>
              </TouchableOpacity>
              <Text style={s.title}>Add Card</Text>
              <View style={{ width: 38 }} />
            </View>

            <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Live card preview */}
              <CardPreview number={displayNumber} name={holderName} expiry={displayExpiry} brand={brand} />

              {/* Brand indicator */}
              {brand ? (
                <View style={s.brandRow}>
                  <View style={[s.brandDot, { backgroundColor: brand.color }]} />
                  <Text style={s.brandName}>{brand.name} detected</Text>
                  <Text style={s.brandCvv}>CVV: {brand.cvvLength} digits</Text>
                </View>
              ) : digits.length > 0 ? (
                <View style={s.brandRow}>
                  <View style={[s.brandDot, { backgroundColor: Colors.neutral.placeholder }]} />
                  <Text style={[s.brandName, { color: Colors.neutral.placeholder }]}>Unrecognized card</Text>
                </View>
              ) : null}

              {/* CARD HOLDER NAME */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Card Holder Name</Text>
                <TextInput
                  ref={nameRef}
                  style={[s.fieldInput, errors.name && s.fieldInputError]}
                  value={holderName}
                  onChangeText={(t) => { setHolderName(t); setFE("name", null); }}
                  placeholder="Vishal Khadok"
                  placeholderTextColor={Colors.neutral.placeholder}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => expiryRef.current?.focus()}
                  accessibilityLabel="Cardholder name"
                />
                <FieldError msg={errors.name ?? null} />
              </View>

              {/* CARD NUMBER */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Card Number</Text>
                <TextInput
                  style={[s.fieldInput, errors.number && s.fieldInputError]}
                  value={displayNumber}
                  onChangeText={handleNumberChange}
                  placeholder="2134 |___ ____"
                  placeholderTextColor={Colors.neutral.placeholder}
                  keyboardType="number-pad"
                  maxLength={brand?.numberLength === 15 ? 17 : 19}
                  returnKeyType="next"
                  onSubmitEditing={() => expiryRef.current?.focus()}
                  accessibilityLabel="Card number"
                />
                <FieldError msg={errors.number ?? null} />
              </View>

              {/* EXPIRE DATE + CVC */}
              <View style={s.twoCol}>
                <View style={s.colField}>
                  <Text style={s.fieldLabel}>Expire Date</Text>
                  <TextInput
                    ref={expiryRef}
                    style={[s.fieldInput, errors.expiry && s.fieldInputError]}
                    value={displayExpiry}
                    onChangeText={handleExpiryChange}
                    placeholder="mm/yyyy"
                    placeholderTextColor={Colors.neutral.placeholder}
                    keyboardType="number-pad"
                    maxLength={5}
                    returnKeyType="next"
                    onSubmitEditing={() => cvvRef.current?.focus()}
                    accessibilityLabel="Expiry date"
                  />
                  <FieldError msg={errors.expiry ?? null} />
                </View>

                <View style={s.colField}>
                  <Text style={s.fieldLabel}>CVC</Text>
                  <TextInput
                    ref={cvvRef}
                    style={[s.fieldInput, errors.cvv && s.fieldInputError]}
                    value={cvv}
                    onChangeText={handleCvvChange}
                    placeholder={brand?.cvvLength === 4 ? "····" : "···"}
                    placeholderTextColor={Colors.neutral.placeholder}
                    keyboardType="number-pad"
                    maxLength={brand?.cvvLength ?? 3}
                    secureTextEntry
                    returnKeyType="next"
                    onSubmitEditing={() => nameRef.current?.focus()}
                    accessibilityLabel="CVV security code"
                  />
                  <FieldError msg={errors.cvv ?? null} />
                </View>
              </View>

              <View style={{ height: 80 }} />
            </ScrollView>

            {/* ADD & MAKE PAYMENT button */}
            <TouchableOpacity
              style={s.addBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={Colors.neutral.white} />
                : <Text style={s.addBtnText}>Add &amp; Make Payment</Text>}
            </TouchableOpacity>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.neutral.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.neutral.white,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.neutral.surface,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  cancelText: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
  saveText: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.brand.primary, textAlign: "right" },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: 100 },

  // Field groups — label above input (reference style)
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.secondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  fieldInput: {
    height: 54,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
  },
  fieldInputError: {
    borderWidth: 1.5,
    borderColor: Colors.semantic.error,
  },

  // Two-column row
  twoCol: { flexDirection: "row", gap: Spacing.md },
  colField: { flex: 1, gap: Spacing.xs },

  // Legacy (kept for card preview)
  card: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, overflow: "hidden", ...Shadow.sm },
  divider: { height: 1, backgroundColor: Colors.neutral.border, marginLeft: Spacing.base },
  colDivider: { width: 1, backgroundColor: Colors.neutral.border },
  fieldRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.md },
  fieldRowError: { backgroundColor: "#FEF2F2" },

  // Add button — full width orange (main screen)
  mainAddBtn: {
    height: 56,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  mainAddBtnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
  },

  // Add button — modal (absolute positioned)
  addBtn: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    margin: Spacing.base,
    height: 56,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  addBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  secure: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, textAlign: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  brandName: { flex: 1, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium, color: Colors.neutral.primary },
  brandCvv: { fontSize: Typography.size.xs, color: Colors.neutral.secondary },
});
