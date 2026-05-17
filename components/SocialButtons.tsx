/**
 * components/SocialButtons.tsx
 * Brand-compliant social login buttons using expo-image for logos.
 * Works in Expo Go — no native SVG module required.
 *
 * Logos loaded from official CDN URLs (SVG rendered as raster by expo-image).
 */

import { Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// LOGO SOURCES
// Official brand assets via Google's CDN and well-known public URLs
// ─────────────────────────────────────────────────────────────────────────────

// Google's official G logo (SVG served as PNG-compatible by Google)
const GOOGLE_LOGO = "https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg";

// Facebook official logo (white F on transparent — we set bg color on button)
const FACEBOOK_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/240px-2023_Facebook_icon.svg.png";

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

interface SocialBtnProps {
  onPress: () => void;
  disabled?: boolean;
}

export function AppleButton({ onPress, disabled }: SocialBtnProps) {
  return (
    <TouchableOpacity
      style={[btn.base, btn.apple, disabled && btn.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
    >
      {/* expo-symbols has the real Apple logo on iOS */}
      {Platform.OS === "ios" ? (
        <SymbolView
          name={{ ios: "apple.logo", android: "android", web: "android" }}
          tintColor="#FFFFFF"
          size={20}
        />
      ) : (
        <Text style={btn.appleFallback}></Text>
      )}
      <Text style={[btn.label, btn.appleLabel]}>Continue with Apple</Text>
    </TouchableOpacity>
  );
}

export function GoogleButton({ onPress, disabled }: SocialBtnProps) {
  return (
    <TouchableOpacity
      style={[btn.base, btn.google, disabled && btn.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      <Image
        source={GOOGLE_LOGO}
        style={btn.logo}
        contentFit="contain"
        accessibilityLabel="Google logo"
      />
      <Text style={[btn.label, btn.googleLabel]}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

export function FacebookButton({ onPress, disabled }: SocialBtnProps) {
  return (
    <TouchableOpacity
      style={[btn.base, btn.facebook, disabled && btn.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Continue with Facebook"
    >
      <Image
        source={FACEBOOK_LOGO}
        style={btn.logo}
        contentFit="contain"
        tintColor="#FFFFFF"
        accessibilityLabel="Facebook logo"
      />
      <Text style={[btn.label, btn.facebookLabel]}>Continue with Facebook</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const btn = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    width: "100%",
  },
  disabled: { opacity: 0.5 },

  logo: {
    width: 22,
    height: 22,
  },

  // Apple — black background, white text (official Apple guideline)
  apple: {
    backgroundColor: "#000000",
    ...Shadow.sm,
  },
  appleLabel: { color: "#FFFFFF" },
  appleFallback: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Google — white background, subtle border, dark text (official Google guideline)
  google: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#DADCE0",
    ...Shadow.sm,
  },
  googleLabel: {
    color: "#3C4043",
  },

  // Facebook — #1877F2 brand blue, white text (official Meta guideline)
  facebook: {
    backgroundColor: "#1877F2",
    ...Shadow.sm,
  },
  facebookLabel: { color: "#FFFFFF" },

  label: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 0.1,
  },
});
