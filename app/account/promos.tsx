/**
 * app/account/promos.tsx
 * Promo Codes screen — apply codes, view active/expired promos.
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { validatePromoCode } from "@/data/menu";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
    ActivityIndicator, KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AppliedPromo {
  code: string;
  description: string;
  discount: string;
  expiresAt: string;
  isExpired: boolean;
}

const INITIAL_PROMOS: AppliedPromo[] = [
  { code: "WELCOME5", description: "$5 off your first order", discount: "$5.00 off", expiresAt: "Dec 31, 2026", isExpired: false },
];

export default function PromosScreen() {
  const router = useRouter();
  const [promos, setPromos] = useState<AppliedPromo[]>(INITIAL_PROMOS);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError("Enter a promo code."); return; }
    if (promos.some((p) => p.code === trimmed)) { setError("This code is already applied."); return; }

    setLoading(true); setError(null); setSuccess(null);
    await new Promise((r) => setTimeout(r, 600));

    const promo = validatePromoCode(trimmed);
    if (!promo) {
      setError("Invalid or expired promo code.");
      setLoading(false);
      return;
    }

    const discountStr = promo.type === "percentage"
      ? `${promo.value}% off`
      : promo.type === "flat"
      ? `$${(promo.value / 100).toFixed(2)} off`
      : promo.type === "free_delivery"
      ? "Free delivery"
      : `${promo.value}% off`;

    setPromos((prev) => [...prev, {
      code: promo.code,
      description: promo.description,
      discount: discountStr,
      expiresAt: new Date(promo.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      isExpired: false,
    }]);
    setSuccess(`"${promo.code}" applied! ${promo.description}`);
    setCode("");
    setLoading(false);
  };

  const handleRemove = (promoCode: string) => {
    setPromos((prev) => prev.filter((p) => p.code !== promoCode));
  };

  const active = promos.filter((p) => !p.isExpired);
  const expired = promos.filter((p) => p.isExpired);

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Promo Codes</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Input */}
          <View style={s.inputCard}>
            <Text style={s.inputTitle}>Have a promo code?</Text>
            <View style={s.inputRow}>
              <TextInput style={s.input} value={code} onChangeText={(t) => { setCode(t.toUpperCase()); setError(null); setSuccess(null); }}
                placeholder="Enter code (e.g. BISTRO10)" placeholderTextColor={Colors.neutral.placeholder}
                autoCapitalize="characters" returnKeyType="done" onSubmitEditing={handleApply} />
              <TouchableOpacity style={[s.applyBtn, (!code.trim() || loading) && s.applyBtnDisabled]}
                onPress={handleApply} disabled={!code.trim() || loading}>
                {loading ? <ActivityIndicator size="small" color={Colors.neutral.white} />
                  : <Text style={s.applyBtnText}>Apply</Text>}
              </TouchableOpacity>
            </View>
            {error && <Text style={s.errorText}>{error}</Text>}
            {success && <Text style={s.successText}>✓ {success}</Text>}
          </View>

          {/* Available codes hint */}
          <View style={s.hintCard}>
            <Text style={s.hintTitle}>Available codes to try:</Text>
            {["BISTRO10 — 10% off (min $20)", "FREESHIP — Free delivery (min $15)", "WELCOME5 — $5 off (min $10)", "LUNCH20 — 20% off lunch (min $15)"].map((hint) => (
              <TouchableOpacity key={hint} style={s.hintRow} onPress={() => setCode(hint.split(" ")[0])}>
                <Text style={s.hintCode}>{hint.split(" ")[0]}</Text>
                <Text style={s.hintDesc}>{hint.split("—")[1]?.trim()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active promos */}
          {active.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>ACTIVE CODES</Text>
              <View style={s.card}>
                {active.map((promo, i) => (
                  <View key={promo.code}>
                    {i > 0 && <View style={s.divider} />}
                    <View style={s.promoRow}>
                      <View style={s.promoIcon}>
                        <SymbolView name={{ ios: "tag.fill", android: "local_offer", web: "local_offer" }} tintColor={Colors.semantic.success} size={18} />
                      </View>
                      <View style={s.promoInfo}>
                        <View style={s.promoTop}>
                          <Text style={s.promoCode}>{promo.code}</Text>
                          <Text style={s.promoDiscount}>{promo.discount}</Text>
                        </View>
                        <Text style={s.promoDesc}>{promo.description}</Text>
                        <Text style={s.promoExpiry}>Expires {promo.expiresAt}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemove(promo.code)} style={s.removeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} tintColor={Colors.neutral.placeholder} size={14} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {active.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>🏷️</Text>
              <Text style={s.emptyTitle}>No active promo codes</Text>
              <Text style={s.emptySubtitle}>Enter a code above to save on your next order.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.neutral.offWhite },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.neutral.white, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  title: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  content: { padding: Spacing.base, gap: Spacing.md },
  inputCard: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm, ...Shadow.sm },
  inputTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  inputRow: { flexDirection: "row", gap: Spacing.sm, backgroundColor: Colors.neutral.surface, borderRadius: Radius.md, padding: 4 },
  input: { flex: 1, height: 44, paddingHorizontal: Spacing.md, fontSize: Typography.size.base, color: Colors.neutral.primary, fontWeight: Typography.weight.semibold, letterSpacing: 1 },
  applyBtn: { paddingHorizontal: Spacing.base, height: 44, backgroundColor: Colors.brand.primary, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center", minWidth: 80 },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.white },
  errorText: { fontSize: Typography.size.xs, color: Colors.semantic.error },
  successText: { fontSize: Typography.size.xs, color: Colors.semantic.success, fontWeight: Typography.weight.medium },
  hintCard: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm, ...Shadow.sm },
  hintTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.neutral.secondary },
  hintRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: 4 },
  hintCode: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.brand.primary, minWidth: 90 },
  hintDesc: { fontSize: Typography.size.xs, color: Colors.neutral.secondary },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.neutral.secondary, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: Spacing.xs },
  card: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, overflow: "hidden", ...Shadow.sm },
  divider: { height: 1, backgroundColor: Colors.neutral.border, marginLeft: Spacing.base },
  promoRow: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.base, gap: Spacing.md },
  promoIcon: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.semantic.success + "18", alignItems: "center", justifyContent: "center", marginTop: 2 },
  promoInfo: { flex: 1 },
  promoTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  promoCode: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  promoDiscount: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.semantic.success },
  promoDesc: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, marginTop: 2 },
  promoExpiry: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, marginTop: 2 },
  removeBtn: { padding: 4 },
  emptyBox: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: "center", gap: Spacing.sm, ...Shadow.sm },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  emptySubtitle: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, textAlign: "center" },
});
