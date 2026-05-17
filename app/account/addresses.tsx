/**
 * app/account/addresses.tsx
 * Saved Addresses — add/edit/delete with full inline field validation.
 * Zip: US 5-digit or ZIP+4 (12345 or 12345-6789)
 * State: 2-letter US abbreviation
 * All required fields validated inline (no Alert popups).
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
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
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR","GU","VI","AS","MP",
]);

/** US ZIP: 5 digits, or ZIP+4 (12345-6789) */
function validateZip(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "ZIP code is required.";
  if (!/^\d{5}(-\d{4})?$/.test(trimmed)) return "Enter a valid ZIP (e.g. 94105 or 94105-1234).";
  return null;
}

function validateState(value: string): string | null {
  const upper = value.trim().toUpperCase();
  if (!upper) return "State is required.";
  if (upper.length !== 2) return "Use 2-letter state code (e.g. CA).";
  if (!US_STATES.has(upper)) return "Enter a valid US state abbreviation.";
  return null;
}

function validateStreet(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Street address is required.";
  if (trimmed.length < 5) return "Enter a complete street address.";
  // Must start with a number (house/building number)
  if (!/^\d/.test(trimmed)) return "Address should start with a street number.";
  return null;
}

function validateCity(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "City is required.";
  if (trimmed.length < 2) return "Enter a valid city name.";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD ERROR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string | null | undefined }) {
  if (!msg) return null;
  return (
    <Text style={fe.text}>{msg}</Text>
  );
}

const fe = StyleSheet.create({
  text: {
    fontSize: Typography.size.xs,
    color: Colors.semantic.error,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xs,
    paddingTop: 2,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Address {
  id: string;
  label: string;
  street: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

type FormErrors = Partial<Record<"street" | "city" | "state" | "zip", string>>;

const INITIAL: Address[] = [
  {
    id: "addr_1",
    label: "Home",
    street: "123 Main Street",
    apt: "Apt 4B",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    isDefault: true,
  },
];

const LABEL_ICONS: Record<string, string> = {
  Home: "house.fill",
  Work: "briefcase.fill",
  Other: "mappin.circle.fill",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function AddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>(INITIAL);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);

  // Form state
  const [label, setLabel] = useState("Home");
  const [street, setStreet] = useState("");
  const [apt, setApt] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Refs for auto-advance
  const aptRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const zipRef = useRef<TextInput>(null);

  const setFE = (key: keyof FormErrors, msg: string | null) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });

  const resetForm = () => {
    setLabel("Home");
    setStreet(""); setApt(""); setCity(""); setStateVal(""); setZip("");
    setErrors({});
  };

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setShowAdd(true);
  };

  const openEdit = (addr: Address) => {
    setEditing(addr);
    setLabel(addr.label);
    setStreet(addr.street);
    setApt(addr.apt ?? "");
    setCity(addr.city);
    setStateVal(addr.state);
    setZip(addr.zip);
    setErrors({});
    setShowAdd(true);
  };

  // ── ZIP formatting: allow digits and one hyphen after 5 digits ──────────────
  const handleZipChange = (raw: string) => {
    // Strip everything except digits and hyphen
    let cleaned = raw.replace(/[^\d-]/g, "");
    // Auto-insert hyphen after 5 digits
    if (/^\d{5}[^-]/.test(cleaned)) {
      cleaned = cleaned.slice(0, 5) + "-" + cleaned.slice(5);
    }
    // Max length: 10 (12345-6789)
    setZip(cleaned.slice(0, 10));
    setFE("zip", null);
  };

  // ── State: uppercase, max 2 chars ───────────────────────────────────────────
  const handleStateChange = (raw: string) => {
    const upper = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    setStateVal(upper);
    setFE("state", null);
    // Auto-advance to ZIP when 2 chars entered
    if (upper.length === 2) zipRef.current?.focus();
  };

  // ── Full validation ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FormErrors = {};
    const streetErr = validateStreet(street);
    if (streetErr) errs.street = streetErr;
    const cityErr = validateCity(city);
    if (cityErr) errs.city = cityErr;
    const stateErr = validateState(stateVal);
    if (stateErr) errs.state = stateErr;
    const zipErr = validateZip(zip);
    if (zipErr) errs.zip = zipErr;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));

    const normalizedState = stateVal.trim().toUpperCase();

    if (editing) {
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? { ...a, label, street: street.trim(), apt: apt.trim() || undefined, city: city.trim(), state: normalizedState, zip: zip.trim() }
            : a
        )
      );
    } else {
      setAddresses((prev) => [
        ...prev,
        {
          id: `addr_${Date.now()}`,
          label,
          street: street.trim(),
          apt: apt.trim() || undefined,
          city: city.trim(),
          state: normalizedState,
          zip: zip.trim(),
          isDefault: prev.length === 0,
        },
      ]);
    }

    setSaving(false);
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    const addr = addresses.find((a) => a.id === id);
    if (addr?.isDefault) {
      Alert.alert("Cannot Remove", "Set another address as default first.");
      return;
    }
    Alert.alert("Remove Address", `Remove ${addr?.street}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setAddresses((prev) => prev.filter((a) => a.id !== id)),
      },
    ]);
  };

  const handleSetDefault = (id: string) =>
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>My Address</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Address list */}
        {addresses.length > 0 && (
          <View style={{ gap: Spacing.md }}>
            {addresses.map((addr) => (
              <View key={addr.id} style={s.card}>
                <View style={s.iconBox}>
                  <SymbolView
                    name={{ ios: (LABEL_ICONS[addr.label] ?? "mappin.circle.fill") as any, android: "location_on", web: "location_on" }}
                    tintColor={addr.label === "Home" ? Colors.brand.primary : addr.label === "Work" ? "#8B5CF6" : Colors.neutral.secondary}
                    size={22}
                  />
                </View>
                <View style={s.addrInfo}>
                  <View style={s.addrTop}>
                    <Text style={s.addrLabel}>{addr.label}</Text>
                    {addr.isDefault && (
                      <View style={s.defaultBadge}>
                        <Text style={s.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.addrStreet}>
                    {addr.street}{addr.apt ? `, ${addr.apt}` : ""}{"\n"}{addr.city}, {addr.state} {addr.zip}
                  </Text>
                </View>
                <View style={s.addrActions}>
                  <TouchableOpacity onPress={() => openEdit(addr)} style={s.actionBtn}>
                    <SymbolView
                      name={{ ios: "pencil", android: "edit", web: "edit" }}
                      tintColor={Colors.brand.primary}
                      size={18}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(addr.id)} style={s.actionBtn}>
                    <SymbolView
                      name={{ ios: "trash", android: "delete", web: "delete" }}
                      tintColor={Colors.semantic.error}
                      size={18}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Full-width orange ADD button at bottom */}
      <TouchableOpacity style={s.addAddrBtn} onPress={openAdd}>
        <Text style={s.addAddrText}>Add New Address</Text>
      </TouchableOpacity>

      {/* ── Add / Edit Modal ── */}
      <Modal
        visible={showAdd}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAdd(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <SafeAreaView style={s.root} edges={["top", "bottom"]}>

            {/* Modal header */}
            <View style={s.header}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={s.title}>{editing ? "Edit Address" : "New Address"}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving} style={s.cancelBtn}>
                {saving
                  ? <ActivityIndicator size="small" color={Colors.brand.primary} />
                  : <Text style={s.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={s.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Label picker */}
              <View style={s.labelRow}>
                {["Home", "Work", "Other"].map((l) => (
                  <TouchableOpacity
                    key={l}
                    style={[s.labelChip, label === l && s.labelChipActive]}
                    onPress={() => setLabel(l)}
                  >
                    <Text style={[s.labelChipText, label === l && s.labelChipTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Address 1 (Street) ── */}
              <View style={[s.inputCard, !!errors.street && s.inputCardError]}>
                <Text style={s.inputLabel}>Street</Text>
                <TextInput
                  style={s.inputField}
                  value={street}
                  onChangeText={(t) => { setStreet(t); setFE("street", null); }}
                  placeholder="123 Main Street"
                  placeholderTextColor={Colors.neutral.placeholder}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => aptRef.current?.focus()}
                  accessibilityLabel="Street address"
                />
              </View>
              <FieldError msg={errors.street} />

              {/* ── Address 2 (Apt / Suite) ── */}
              <View style={s.inputCard}>
                <Text style={s.inputLabel}>Address 2</Text>
                <TextInput
                  ref={aptRef}
                  style={s.inputField}
                  value={apt}
                  onChangeText={setApt}
                  placeholder="Apt, Suite, Floor (optional)"
                  placeholderTextColor={Colors.neutral.placeholder}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
                  accessibilityLabel="Apartment or suite number"
                />
              </View>

              {/* ── City ── */}
              <View style={[s.inputCard, !!errors.city && s.inputCardError]}>
                <Text style={s.inputLabel}>City</Text>
                <TextInput
                  ref={cityRef}
                  style={s.inputField}
                  value={city}
                  onChangeText={(t) => { setCity(t); setFE("city", null); }}
                  placeholder="San Francisco"
                  placeholderTextColor={Colors.neutral.placeholder}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => stateRef.current?.focus()}
                  accessibilityLabel="City"
                />
              </View>
              <FieldError msg={errors.city} />

              {/* ── State ── */}
              <View style={[s.inputCard, !!errors.state && s.inputCardError]}>
                <Text style={s.inputLabel}>State</Text>
                <TextInput
                  ref={stateRef}
                  style={s.inputField}
                  value={stateVal}
                  onChangeText={handleStateChange}
                  placeholder="CA"
                  placeholderTextColor={Colors.neutral.placeholder}
                  autoCapitalize="characters"
                  maxLength={2}
                  returnKeyType="next"
                  onSubmitEditing={() => zipRef.current?.focus()}
                  accessibilityLabel="State abbreviation"
                />
              </View>
              <FieldError msg={errors.state} />

              {/* ── ZIP Code ── */}
              <View style={[s.inputCard, !!errors.zip && s.inputCardError]}>
                <Text style={s.inputLabel}>ZIP Code</Text>
                <TextInput
                  ref={zipRef}
                  style={s.inputField}
                  value={zip}
                  onChangeText={handleZipChange}
                  placeholder="94105"
                  placeholderTextColor={Colors.neutral.placeholder}
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  accessibilityLabel="ZIP code"
                />
              </View>
              <FieldError msg={errors.zip} />

              {/* ZIP hint */}
              <Text style={s.hint}>
                ZIP accepts 5-digit (94105) or ZIP+4 format (94105-1234).
              </Text>

              <View style={{ height: 80 }} />
            </ScrollView>

            {/* ── Save button pinned to bottom ── */}
            <View style={s.footer}>
              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={Colors.neutral.white} />
                  : <Text style={s.saveBtnText}>SAVE LOCATION</Text>}
              </TouchableOpacity>
            </View>
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
  iconBtn: { minWidth: 44, height: 44, justifyContent: "center", alignItems: "flex-end" },
  title: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  cancelText: { fontSize: Typography.size.base, color: Colors.neutral.secondary },
  saveText: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  cancelBtn: { minWidth: 60, height: 44, justifyContent: "center" },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 100 },

  // Address cards — reference style
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.neutral.white,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.neutral.border,
  },
  addrInfo: { flex: 1 },
  addrTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  addrLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addrStreet: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, marginTop: 4, lineHeight: 20 },
  addrCity: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, marginTop: 1 },
  addrActions: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  actionBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  defaultBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    backgroundColor: Colors.brand.primary + "18", borderRadius: Radius.full,
  },
  defaultText: { fontSize: 10, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  setDefaultBtn: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  setDefaultText: { fontSize: Typography.size.xs, color: Colors.brand.primary, fontWeight: Typography.weight.medium },

  // Add button — full width orange (reference style)
  addAddrBtn: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    margin: Spacing.base,
    height: 56,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  addAddrText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Label chips
  labelRow: { flexDirection: "row", gap: Spacing.sm },
  labelChip: {
    flex: 1, paddingVertical: Spacing.sm, alignItems: "center",
    backgroundColor: Colors.neutral.white, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.neutral.border,
  },
  labelChipActive: { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primary },
  labelChipText: { fontSize: Typography.size.base, fontWeight: Typography.weight.medium, color: Colors.neutral.secondary },
  labelChipTextActive: { color: Colors.neutral.white, fontWeight: Typography.weight.bold },

  // Form fields — standalone card per field (matches Edit Profile style)
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    minHeight: 58,
  },
  inputCardError: {
    borderWidth: 1.5,
    borderColor: Colors.semantic.error,
    backgroundColor: "#FEF2F2",
  },
  inputLabel: {
    width: 90,
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
    fontWeight: Typography.weight.medium,
  },
  inputField: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
    textAlign: "right",
  },

  // Save button pinned to bottom
  footer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.neutral.border,
  },
  saveBtn: {
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
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Legacy (kept for list view)
  fieldRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.md,
  },
  fieldRowError: { backgroundColor: "#FEF2F2" },
  fieldLabel: { width: 56, fontSize: Typography.size.base, color: Colors.neutral.secondary },
  fieldInput: { flex: 1, fontSize: Typography.size.base, color: Colors.neutral.primary, textAlign: "right" },
  divider: { height: 1, backgroundColor: Colors.neutral.border, marginLeft: Spacing.base },
  colDivider: { width: 1, backgroundColor: Colors.neutral.border },
  twoCol: { flexDirection: "row" },
  hint: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, textAlign: "center", paddingHorizontal: Spacing.base },
});
