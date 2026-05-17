/**
 * app/account/settings.tsx
 * App Settings screen — notifications, privacy, appearance, account actions.
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// SETTING ROW
// ─────────────────────────────────────────────────────────────────────────────

interface SettingRowProps {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  value?: string;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  isLast?: boolean;
  destructive?: boolean;
}

function SettingRow({
  icon, iconColor, label, sublabel, value,
  isToggle, toggleValue, onToggle,
  onPress, isLast, destructive,
}: SettingRowProps) {
  const textColor = destructive ? Colors.semantic.error : Colors.neutral.primary;
  return (
    <TouchableOpacity
      style={[sr.row, isLast && sr.rowLast]}
      onPress={onPress}
      disabled={isToggle || !onPress}
      activeOpacity={0.7}
    >
      <View style={[sr.iconBox, { backgroundColor: iconColor + "18" }]}>
        <SymbolView
          name={{ ios: icon as any, android: "settings", web: "settings" }}
          tintColor={destructive ? Colors.semantic.error : iconColor}
          size={18}
        />
      </View>
      <View style={sr.info}>
        <Text style={[sr.label, { color: textColor }]}>{label}</Text>
        {sublabel && <Text style={sr.sublabel}>{sublabel}</Text>}
      </View>
      {isToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: Colors.neutral.divider, true: Colors.brand.primary }}
          thumbColor={Colors.neutral.white}
        />
      ) : (
        <View style={sr.right}>
          {value && <Text style={sr.value}>{value}</Text>}
          {onPress && (
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
              tintColor={Colors.neutral.placeholder}
              size={14}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
  },
  rowLast: { borderBottomWidth: 0 },
  iconBox: {
    width: 38, height: 38, borderRadius: Radius.md,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  info: { flex: 1 },
  label: { fontSize: Typography.size.base, fontWeight: Typography.weight.medium },
  sublabel: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, marginTop: 2 },
  right: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  value: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{title}</Text>
      <View style={sec.card}>{children}</View>
    </View>
  );
}

const sec = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  title: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.sm,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();

  // Notification toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promoAlerts, setPromoAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  // Privacy toggles
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  // Appearance
  const [darkMode, setDarkMode] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => Alert.alert("Account Deletion", "Your request has been submitted. You'll receive a confirmation email within 24 hours."),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            icon="bell.fill" iconColor="#F59E0B"
            label="Push Notifications"
            sublabel="Receive alerts on your device"
            isToggle toggleValue={pushEnabled} onToggle={setPushEnabled}
          />
          <SettingRow
            icon="bag.fill" iconColor="#3B82F6"
            label="Order Updates"
            sublabel="Status changes, delivery alerts"
            isToggle toggleValue={orderUpdates} onToggle={setOrderUpdates}
          />
          <SettingRow
            icon="tag.fill" iconColor="#F97316"
            label="Promo Alerts"
            sublabel="Deals, discounts, new offers"
            isToggle toggleValue={promoAlerts} onToggle={setPromoAlerts}
          />
          <SettingRow
            icon="envelope.fill" iconColor="#6366F1"
            label="Email Digest"
            sublabel="Weekly summary of your orders"
            isToggle toggleValue={emailDigest} onToggle={setEmailDigest}
            isLast
          />
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <SettingRow
            icon="location.fill" iconColor="#22C55E"
            label="Location Services"
            sublabel="Used for delivery address suggestions"
            isToggle toggleValue={locationEnabled} onToggle={setLocationEnabled}
          />
          <SettingRow
            icon="chart.bar.fill" iconColor="#8B5CF6"
            label="Analytics"
            sublabel="Help us improve the app"
            isToggle toggleValue={analyticsEnabled} onToggle={setAnalyticsEnabled}
          />
          <SettingRow
            icon="hand.raised.fill" iconColor="#6B7280"
            label="Privacy Policy"
            onPress={() => router.push("/account/terms" as any)}
            isLast
          />
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow
            icon="moon.fill" iconColor="#6366F1"
            label="Dark Mode"
            sublabel="Coming soon"
            isToggle toggleValue={darkMode} onToggle={setDarkMode}
          />
          <SettingRow
            icon="textformat.size" iconColor="#F97316"
            label="Language"
            value="English"
            onPress={() => Alert.alert("Language", "More languages coming soon.")}
            isLast
          />
        </Section>

        {/* Account */}
        <Section title="Account">
          <SettingRow
            icon="lock.fill" iconColor="#6B7280"
            label="Change Password"
            onPress={() => Alert.alert("Change Password", "A password reset link will be sent to your email.")}
          />
          <SettingRow
            icon="trash.fill" iconColor="#EF4444"
            label="Delete Account"
            sublabel="Permanently remove your data"
            onPress={handleDeleteAccount}
            destructive
            isLast
          />
        </Section>

        <Text style={s.version}>The Intelligent Bistro v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
  title: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  content: { padding: Spacing.base, gap: Spacing.lg },
  version: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.placeholder,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
