/**
 * app/(tabs)/_layout.tsx
 * Bottom tab navigator matching the reference UI:
 * - 5 tabs: Home | Orders | [+AI] | Notifications | Profile
 * - Center tab is a raised orange circle with + icon
 * - Orange active tint, gray inactive
 * - Clean white tab bar with top shadow
 */

import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import AIBubble from "@/components/AIBubble";
import { Colors, Spacing, Typography } from "@/constants/Theme";
import { useCartItemCount } from "@/store";

// ─────────────────────────────────────────────────────────────────────────────
// CART BADGE
// ─────────────────────────────────────────────────────────────────────────────

function CartTabIcon({ color }: { color: string }) {
  const count = useCartItemCount();
  return (
    <View style={styles.iconWrap}>
      <SymbolView
        name={{ ios: "bag", android: "shopping_bag", web: "shopping_bag" }}
        tintColor={color}
        size={24}
      />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTER AI BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function CenterTabButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.centerBtn}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="AI Order"
    >
      <Text style={styles.centerBtnText}>+</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.brand.primary,
          tabBarInactiveTintColor: Colors.neutral.secondary,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, styles.tabBarBg]} />
          ),
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        {/* Home */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: "square.grid.2x2", android: "grid_view", web: "grid_view" }}
                tintColor={color}
                size={24}
              />
            ),
          }}
        />

        {/* Orders / Cart */}
        <Tabs.Screen
          name="cart"
          options={{
            title: "Orders",
            tabBarIcon: ({ color }) => <CartTabIcon color={color} />,
          }}
        />

        {/* Center AI Chat — raised button */}
        <Tabs.Screen
          name="ai-chat"
          options={{
            title: "",
            tabBarIcon: () => null,
            tabBarLabel: () => null,
            tabBarButton: (props) => (
              <CenterTabButton onPress={props.onPress as () => void} />
            ),
          }}
        />

        {/* Notifications — navigates to account/notifications */}
        <Tabs.Screen
          name="two"
          options={{
            title: "Alerts",
            href: "/account/notifications" as any,
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: "bell", android: "notifications", web: "notifications" }}
                tintColor={color}
                size={24}
              />
            ),
          }}
        />

        {/* Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <SymbolView
                name={{ ios: "person", android: "person", web: "person" }}
                tintColor={color}
                size={24}
              />
            ),
          }}
        />
      </Tabs>

      {/* Floating AI bubble */}
      <AIBubble />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 0,
    elevation: 0,
    height: Platform.OS === "ios" ? 88 : 68,
    backgroundColor: "transparent",
  },
  tabBarBg: {
    backgroundColor: Colors.neutral.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.neutral.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.medium,
    marginBottom: Platform.OS === "ios" ? 0 : Spacing.xs,
  },
  tabItem: {
    paddingTop: Spacing.xs,
  },
  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.neutral.white,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    lineHeight: 12,
  },
  // Center raised button
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "ios" ? 20 : 12,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  centerBtnText: {
    fontSize: 28,
    fontWeight: Typography.weight.regular,
    color: Colors.neutral.white,
    lineHeight: 32,
    marginTop: -2,
  },
});
