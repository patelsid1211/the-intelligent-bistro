/**
 * components/BackButton.tsx
 * Consistent back button used across all screens.
 * Shows a gray circle with a left chevron — matches the reference UI.
 */

import { Colors } from "@/constants/Theme";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StyleSheet, TouchableOpacity } from "react-native";

interface BackButtonProps {
  onPress?: () => void;
  /** Icon color — defaults to neutral.primary (dark) */
  tintColor?: string;
  /** Background color — defaults to neutral.surface (light gray) */
  bgColor?: string;
}

export default function BackButton({
  onPress,
  tintColor = Colors.neutral.primary,
  bgColor = Colors.neutral.surface,
}: BackButtonProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bgColor }]}
      onPress={onPress ?? (() => router.back())}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <SymbolView
        name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
        tintColor={tintColor}
        size={18}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
