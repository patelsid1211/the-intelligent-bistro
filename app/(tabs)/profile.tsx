/**
 * app/(tabs)/profile.tsx
 * Dynamic profile screen.
 * - Real user data from auth store
 * - Real order history from API
 * - Editable display name + phone with keyboard-aware sheet
 * - Session persists across app restarts
 */

import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useAuth, useBistroStore } from "@/store";
import { clearSession } from "@/store/authClient";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ApiOrder {
  id: string;
  status: string;
  items: Array<{ name: string; quantity: number; lineTotal: number }>;
  pricing: { total: number; subtotal: number };
  created_at: string;
  estimated_delivery: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

import { formatPrice } from "@/utils/format";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:          { label: "Pending",       color: "#FF9500" },
  confirmed:        { label: "Confirmed",     color: "#007AFF" },
  preparing:        { label: "Preparing",     color: "#AF52DE" },
  ready_for_pickup: { label: "Ready",         color: "#34C759" },
  out_for_delivery: { label: "On the way",    color: "#007AFF" },
  delivered:        { label: "Delivered",     color: "#34C759" },
  cancelled:        { label: "Cancelled",     color: "#FF3B30" },
};

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CARD
// ─────────────────────────────────────────────────────────────────────────────

function OrderCard({ order, onPress }: { order: ApiOrder; onPress: () => void }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.delivered;
  const summary = order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ");
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <TouchableOpacity style={oc.card} onPress={onPress} activeOpacity={0.8}
      accessibilityRole="button" accessibilityLabel={`Order ${order.id.slice(0,8)}`}>
      <View style={oc.header}>
        <View>
          <Text style={oc.id}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={oc.date}>{formatDate(order.created_at)}</Text>
        </View>
        <View style={[oc.badge, { backgroundColor: cfg.color + "22" }]}>
          <Text style={[oc.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={oc.summary} numberOfLines={2}>{summary}</Text>
      <View style={oc.footer}>
        <Text style={oc.qty}>{totalQty} item{totalQty !== 1 ? "s" : ""}</Text>
        <Text style={oc.total}>{formatPrice(order.pricing.total)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const oc = StyleSheet.create({
  card: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm, ...Shadow.sm },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  id: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  date: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, marginTop: 2 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  summary: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, lineHeight: 18 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.neutral.border },
  qty: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  total: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS ROW
// ─────────────────────────────────────────────────────────────────────────────

function SettingsRow({ icon, label, value, onPress, isToggle, toggleValue, onToggle, destructive, iconColor }: {
  icon: string; label: string; value?: string; onPress?: () => void;
  isToggle?: boolean; toggleValue?: boolean; onToggle?: (v: boolean) => void;
  destructive?: boolean; iconColor?: string;
}) {
  const color = destructive ? Colors.semantic.error : (iconColor ?? Colors.brand.primary);
  return (
    <TouchableOpacity style={sr.row} onPress={onPress} disabled={isToggle || !onPress}
      activeOpacity={0.7} accessibilityRole={isToggle ? "switch" : "button"} accessibilityLabel={label}>
      <View style={[sr.iconBox, { backgroundColor: color + "18" }]}>
        <SymbolView name={{ ios: icon as any, android: "settings", web: "settings" }}
          tintColor={color} size={18} />
      </View>
      <Text style={[sr.label, destructive && sr.labelDest]}>{label}</Text>
      {isToggle ? (
        <Switch value={toggleValue} onValueChange={onToggle}
          trackColor={{ false: Colors.neutral.divider, true: Colors.brand.primary }}
          thumbColor={Colors.neutral.white} />
      ) : (
        <View style={sr.right}>
          {value && <Text style={sr.value}>{value}</Text>}
          {onPress && <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
            tintColor={Colors.neutral.placeholder} size={14} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  iconBox: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.brand.primary + "18", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconBoxDest: { backgroundColor: Colors.semantic.error + "18" },
  label: { flex: 1, fontSize: Typography.size.base, color: Colors.neutral.primary, fontWeight: Typography.weight.medium },
  labelDest: { color: Colors.semantic.error },
  right: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  value: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
});

// ─────────────────────────────────────────────────────────────────────────────
// EDIT PROFILE SHEET
// ─────────────────────────────────────────────────────────────────────────────

function EditProfileSheet({ visible, user, onClose, onSave }: {
  visible: boolean;
  user: { displayName: string; email?: string; phone?: string } | null;
  onClose: () => void;
  onSave: (displayName: string, phone: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.displayName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName(user?.displayName ?? "");
      setPhone(user?.phone ?? "");
      setError(null);
    }
  }, [visible, user]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Full name is required."); return; }
    if (name.trim().length < 2) { setError("Name must be at least 2 characters."); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), phone.trim());
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initial = name[0]?.toUpperCase() ?? "?";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView style={ep.root} edges={["top", "bottom"]}>

          {/* ── Header ── */}
          <View style={ep.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={ep.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={ep.title}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.brand.primary} />
                : <Text style={ep.save}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={ep.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Avatar ── */}
            <View style={ep.avatarSection}>
              <View style={ep.avatarWrap}>
                <View style={ep.avatar}>
                  <Text style={ep.avatarText}>{initial}</Text>
                </View>
                <TouchableOpacity style={ep.editBtn}>
                  <Text style={ep.editBtnIcon}>✏️</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity>
                <Text style={ep.changePhoto}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            {/* ── Error ── */}
            {error && (
              <View style={ep.errorBanner}>
                <Text style={ep.errorText}>{error}</Text>
              </View>
            )}

            {/* ── Fields ── */}
            <View style={ep.fieldGroup}>
              <Text style={ep.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={ep.input}
                value={name}
                onChangeText={(t) => { setName(t); setError(null); }}
                placeholder="Vishal Khadok"
                placeholderTextColor={Colors.neutral.placeholder}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                accessibilityLabel="Full name"
              />
            </View>

            <View style={ep.fieldGroup}>
              <Text style={ep.fieldLabel}>EMAIL</Text>
              <View style={ep.inputReadonly}>
                <Text style={ep.inputReadonlyText}>{user?.email ?? "—"}</Text>
              </View>
            </View>

            <View style={ep.fieldGroup}>
              <Text style={ep.fieldLabel}>PHONE NUMBER</Text>
              <TextInput
                ref={phoneRef}
                style={ep.input}
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(null); }}
                placeholder="408-841-0926"
                placeholderTextColor={Colors.neutral.placeholder}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => bioRef.current?.focus()}
                accessibilityLabel="Phone number"
              />
            </View>

            <View style={ep.fieldGroup}>
              <Text style={ep.fieldLabel}>BIO</Text>
              <TextInput
                ref={bioRef}
                style={[ep.input, ep.inputMultiline]}
                value={bio}
                onChangeText={setBio}
                placeholder="I love fast food"
                placeholderTextColor={Colors.neutral.placeholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                onSubmitEditing={handleSave}
                accessibilityLabel="Bio"
              />
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>

          {/* ── Save button pinned to bottom ── */}
          <View style={[ep.footer, { paddingBottom: Math.max(insets.bottom, Spacing.base) }]}>
            <TouchableOpacity
              style={[ep.saveBtn, saving && ep.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save profile"
            >
              {saving
                ? <ActivityIndicator color={Colors.neutral.white} />
                : <Text style={ep.saveBtnText}>SAVE</Text>}
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ep = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.neutral.offWhite },

  // Header — matches reference: Cancel | Edit Profile | Save
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
  title: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  cancel: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
  },
  save: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.brand.primary,
  },

  // Scroll content
  content: {
    padding: Spacing.base,
    gap: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },

  // Avatar section — centered, orange circle, edit overlay
  avatarSection: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
  editBtn: {
    position: "absolute",
    bottom: 0,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },
  editBtnIcon: { fontSize: 13 },
  changePhoto: {
    fontSize: Typography.size.base,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
  },

  // Error banner
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.semantic.error,
  },
  errorText: {
    fontSize: Typography.size.sm,
    color: Colors.semantic.error,
    fontWeight: Typography.weight.medium,
  },

  // Field groups — label above input (reference style)
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.secondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    height: 54,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
  },
  inputMultiline: {
    height: 90,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  inputReadonly: {
    height: 54,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    justifyContent: "center",
  },
  inputReadonlyText: {
    fontSize: Typography.size.base,
    color: Colors.neutral.placeholder,
  },

  // Footer with full-width orange SAVE button
  footer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
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

  // Legacy keys kept for compatibility
  headerBtn: { minWidth: 60 },
  avatarRing: {},
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.neutral.secondary, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: Spacing.xs },
  card: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, overflow: "hidden" },
  fieldRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.md },
  fieldInput: { flex: 1, fontSize: Typography.size.base, color: Colors.neutral.primary, textAlign: "right" },
  fieldReadonlyText2: { flex: 1, fontSize: Typography.size.base, color: Colors.neutral.placeholder, textAlign: "right" },
  divider: { height: 1, backgroundColor: Colors.neutral.border, marginLeft: Spacing.base + 90 + Spacing.md },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setAuth, clearAuth } = useAuth();
  const accessToken = useBistroStore((s) => s.accessToken);
  const clearConversation = useBistroStore((s) => s.clearConversation);
  const clearCart = useBistroStore((s) => s.clearCart);

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // ── Fetch orders ────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(async (silent = false) => {
    if (!accessToken) return;
    if (!silent) setOrdersLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (json.success) setOrders(json.data ?? []);
    } catch {
      // silently fail — show empty state
    } finally {
      setOrdersLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  // ── Edit profile ────────────────────────────────────────────────────────────

  const handleSaveProfile = useCallback(async (displayName: string, phone: string) => {
    if (!user || !accessToken) return;
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ displayName, phone: phone || null }),
    });
    const json = await res.json();
    if (json.success) {
      setAuth({ ...user, displayName: json.data.displayName, phone: json.data.phone }, accessToken);
    } else {
      throw new Error(json.error?.message ?? "Failed to save profile.");
    }
  }, [user, accessToken, setAuth]);

  // ── Sign out ────────────────────────────────────────────────────────────────

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          clearCart();
          clearConversation();
          await clearSession();
          clearAuth();
        },
      },
    ]);
  }, [clearAuth, clearCart, clearConversation]);

  const handleClearHistory = useCallback(() => {
    Alert.alert("Clear AI History", "This will clear your entire conversation history.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearConversation },
    ]);
  }, [clearConversation]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const totalSpent = orders.reduce((s, o) => s + o.pricing.total, 0);
  const initials = user?.displayName
    ? user.displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <SafeAreaView style={s.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.brand.primary} />
        }
      >
        {/* ── User hero ── */}
        <View style={s.userHero}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <TouchableOpacity style={s.editAvatarBtn} onPress={() => setShowEdit(true)}>
              <Text style={s.editAvatarIcon}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.displayName}>{user?.displayName ?? "Guest"}</Text>
          <Text style={s.userBio}>{user?.email ?? user?.phone ?? "No contact info"}</Text>
        </View>

        {/* ── Group 1: Personal ── */}
        <View style={s.menuGroup}>
          <SettingsRow icon="person.fill" label="Personal Info" onPress={() => setShowEdit(true)} iconColor="#F97316" />
          <SettingsRow icon="map.fill" label="Addresses" onPress={() => router.push("/account/addresses" as any)} iconColor="#8B5CF6" />
        </View>

        {/* ── Group 2: Activity ── */}
        <View style={s.menuGroup}>
          <SettingsRow icon="bag.fill" label="Cart" onPress={() => router.push("/(tabs)/cart" as any)} iconColor="#3B82F6" />
          <SettingsRow icon="heart.fill" label="Favourite" onPress={() => router.push("/account/favourites" as any)} iconColor="#EC4899" />
          <SettingsRow icon="bell.fill" label="Notifications" onPress={() => router.push("/account/notifications" as any)} iconColor="#F59E0B" />
          <SettingsRow icon="creditcard.fill" label="Payment Method" onPress={() => router.push("/account/payment" as any)} iconColor="#6366F1" />
        </View>

        {/* ── Group 3: Support ── */}
        <View style={s.menuGroup}>
          <SettingsRow icon="questionmark.circle.fill" label="FAQs" onPress={() => router.push("/account/help" as any)} iconColor="#F97316" />
          <SettingsRow icon="gearshape.fill" label="Settings" onPress={() => router.push("/account/settings" as any)} iconColor="#6B7280" />
        </View>

        {/* ── Group 4: Logout ── */}
        <View style={s.menuGroup}>
          <SettingsRow icon="rectangle.portrait.and.arrow.right" label="Log Out" onPress={handleSignOut} destructive iconColor="#EF4444" />
        </View>

        <Text style={s.version}>The Intelligent Bistro v1.0.0</Text>
        <View style={{ height: Spacing["3xl"] }} />
      </ScrollView>

      {/* ── Edit Profile Sheet ── */}
      <EditProfileSheet
        visible={showEdit}
        user={user}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveProfile}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.neutral.white },

  // Header
  header: {
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
    letterSpacing: -0.3,
    textAlign: "center",
  },
  editHeaderBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.brand.primary + "15",
    alignItems: "center", justifyContent: "center",
  },

  scroll: { flex: 1, backgroundColor: Colors.neutral.offWhite },
  content: { padding: Spacing.base, gap: Spacing.md },

  // User hero
  userHero: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    ...Shadow.sm,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#FDDCB5",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  editAvatarBtn: {
    position: "absolute",
    bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.brand.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.neutral.white,
  },
  editAvatarIcon: { fontSize: 12 },
  displayName: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  userBio: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },

  // Menu groups
  menuGroup: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.sm,
  },

  // Legacy (kept for compatibility)
  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.neutral.white, borderRadius: Radius.xl, padding: Spacing.base, gap: Spacing.md, ...Shadow.sm },
  avatarRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: Colors.brand.primary + "40", padding: 3, flexShrink: 0 },
  userInfo: { flex: 1 },
  userContact: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, marginTop: 2 },
  userPhone: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, marginTop: 1 },
  editChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4, backgroundColor: Colors.brand.primary + "12", borderRadius: Radius.full, marginTop: Spacing.xs, alignSelf: "flex-start" },
  editChipText: { fontSize: 11, color: Colors.brand.primary, fontWeight: Typography.weight.semibold },
  statsRow: { flexDirection: "row", backgroundColor: Colors.neutral.white, borderRadius: Radius.xl, padding: Spacing.base, ...Shadow.sm },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: Typography.size.lg, fontWeight: Typography.weight.heavy, color: Colors.neutral.primary },
  statLabel: { fontSize: Typography.size.xs, color: Colors.neutral.secondary },
  statDivider: { width: 1, backgroundColor: Colors.neutral.border, marginVertical: Spacing.xs },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.neutral.secondary, textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: Spacing.xs },
  settingsCard: { backgroundColor: Colors.neutral.white, borderRadius: Radius.xl, overflow: "hidden", ...Shadow.sm },
  orderList: { gap: Spacing.sm },
  loadingBox: { backgroundColor: Colors.neutral.white, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: "center", gap: Spacing.sm, ...Shadow.sm },
  loadingText: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  emptyBox: { backgroundColor: Colors.neutral.white, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: "center", gap: Spacing.sm, ...Shadow.sm },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  emptySubtitle: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, textAlign: "center" },
  viewAllBtn: { backgroundColor: Colors.neutral.white, borderRadius: Radius.xl, padding: Spacing.md, alignItems: "center", ...Shadow.sm },
  viewAllText: { fontSize: Typography.size.base, color: Colors.brand.primary, fontWeight: Typography.weight.semibold },
  version: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, textAlign: "center", marginTop: Spacing.md },
});
