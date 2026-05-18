/**
 * app/_layout.tsx
 * Root layout for The Intelligent Bistro.
 * Handles font loading, splash screen, auth gating, and navigation shell.
 */

import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useBistroStore } from "@/store";
import { clearSession, loadSession } from "@/store/authClient";


export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const setAuth = useBistroStore((s) => s.setAuth);
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Restore session from AsyncStorage on launch
  useEffect(() => {
    loadSession().then((session) => {
      if (!session) return;
      try {
        const payload = JSON.parse(atob(session.accessToken.split(".")[1]));
        if (payload.exp * 1000 > Date.now()) {
          setAuth(session.user as any, session.accessToken);
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      }
    });
  }, [setAuth]);

  // Load menu from API on launch (falls back to hardcoded data if server unreachable)
  useEffect(() => {
    useBistroStore.getState().loadMenu();
  }, []);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const isAuthenticated = useBistroStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  // Derive a stable string — avoids the array reference changing every render
  const firstSegment = segments[0] as string | undefined;

  useEffect(() => {
    const inAuthGroup = firstSegment === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, firstSegment]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="item/[id]"
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="order/[id]"
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="search"
            options={{ headerShown: false, presentation: "card", animation: "fade" }}
          />
          <Stack.Screen name="account/payment"       options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="account/addresses"     options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="account/promos"        options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="account/help"          options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="account/terms"         options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="account/favourites"    options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="account/notifications" options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="account/settings"      options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="restaurants/index"     options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="restaurants/[id]"      options={{ headerShown: false, presentation: "card" }} />
          <Stack.Screen name="order-success"         options={{ headerShown: false, presentation: "fullScreenModal" }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", headerShown: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
