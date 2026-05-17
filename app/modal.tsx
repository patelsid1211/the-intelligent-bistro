/**
 * app/modal.tsx
 * App info modal — version, credits, links.
 */

import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const INFO_ROWS = [
  { label: "Version", value: "1.0.0" },
  { label: "Build", value: "2026.05.16" },
  { label: "AI Engine", value: "GPT-4o mini" },
  { label: "Platform", value: "Expo SDK 55" },
];

export default function AppInfoModal() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>About The Bistro</Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <SymbolView
            name={{ ios: "xmark.circle.fill", android: "cancel", web: "cancel" }}
            tintColor={Colors.neutral.secondary}
            size={28}
          />
        </TouchableOpacity>
      </View>

      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🍽️</Text>
        </View>
        <Text style={styles.appName}>The Intelligent Bistro</Text>
        <Text style={styles.tagline}>
          Premium food, ordered your way — just say the word.
        </Text>
      </View>

      {/* Info rows */}
      <View style={styles.infoCard}>
        {INFO_ROWS.map(({ label, value }, i) => (
          <View
            key={label}
            style={[
              styles.infoRow,
              i < INFO_ROWS.length - 1 && styles.infoRowBorder,
            ]}
          >
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Links */}
      <View style={styles.linksRow}>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://expo.dev")}
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy"
        >
          <Text style={styles.link}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.linkDot}>·</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL("https://expo.dev")}
          accessibilityRole="link"
          accessibilityLabel="Terms of Service"
        >
          <Text style={styles.link}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.copyright}>
        © 2026 The Intelligent Bistro. All rights reserved.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    padding: Spacing.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  title: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  closeBtn: { padding: Spacing.xs },

  logoSection: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.sm,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.md,
  },
  logoEmoji: { fontSize: 40 },
  appName: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  tagline: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.secondary,
    textAlign: "center",
    paddingHorizontal: Spacing["2xl"],
  },

  infoCard: {
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    overflow: "hidden",
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  infoLabel: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
  },
  infoValue: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.neutral.primary,
  },

  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  link: {
    fontSize: Typography.size.sm,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.medium,
  },
  linkDot: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.placeholder,
  },
  copyright: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.placeholder,
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
