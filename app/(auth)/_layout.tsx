/**
 * app/(auth)/_layout.tsx
 * Auth group layout — no header, no tab bar, plain stack.
 */
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
