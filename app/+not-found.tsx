/**
 * app/+not-found.tsx
 * 404 fallback screen — Bistro-branded.
 */

import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { Link, Stack } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found", headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <Text style={styles.emoji}>🍽️</Text>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.subtitle}>
          This screen doesn't exist. Let's get you back to the menu.
        </Text>
        <Link href="/(tabs)" asChild>
          <TouchableOpacity
            style={styles.btn}
            accessibilityRole="button"
            accessibilityLabel="Go to home screen"
          >
            <Text style={styles.btnText}>Back to Menu</Text>
          </TouchableOpacity>
        </Link>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    gap: Spacing.md,
  },
  emoji: { fontSize: 64 },
  title: {
    fontSize: Typography.size["2xl"],
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.lg,
    ...Shadow.md,
  },
  btnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.white,
  },
});
