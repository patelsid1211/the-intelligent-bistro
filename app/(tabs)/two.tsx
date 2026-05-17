/**
 * app/(tabs)/two.tsx
 * Legacy template tab — redirects to home.
 * This tab is hidden in _layout.tsx via href: null.
 */
import { Redirect } from "expo-router";
export default function TwoScreen() {
  return <Redirect href="/(tabs)" />;
}
