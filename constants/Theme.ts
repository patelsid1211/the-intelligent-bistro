/**
 * constants/Theme.ts
 * Design tokens for The Intelligent Bistro.
 * Matches the reference UI: orange primary, dark navy auth, clean white cards.
 */

export const Colors = {
  brand: {
    primary: "#F97316",       // Orange — CTAs, active states (matches reference)
    primaryLight: "#FB923C",
    primaryDark: "#EA6C0A",
    accent: "#F97316",
    gold: "#F59E0B",          // Stars, ratings
  },
  neutral: {
    white: "#FFFFFF",
    offWhite: "#F9FAFB",
    surface: "#F3F4F6",       // Light gray inputs (matches reference)
    border: "#E5E7EB",
    divider: "#D1D5DB",
    placeholder: "#9CA3AF",
    secondary: "#6B7280",
    primary: "#111827",       // Near-black text
  },
  auth: {
    bg: "#1A1A2E",            // Dark navy for auth screens
    bgSecondary: "#16213E",
    card: "#FFFFFF",
  },
  semantic: {
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  overlay: {
    dark: "rgba(0,0,0,0.5)",
    light: "rgba(255,255,255,0.85)",
    scrim: "rgba(0,0,0,0.3)",
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

export const Typography = {
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    "2xl": 28,
    "3xl": 34,
  },
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

export const Shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
