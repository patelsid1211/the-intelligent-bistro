/**
 * app/account/notifications.tsx
 * Notifications screen — two tabs: Notifications | Messages
 * Matches the reference UI with avatar + action + food image rows.
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

interface NotifItem {
  id: string;
  avatarUrl: string;
  name: string;
  action: string;
  time: string;
  foodImageUrl: string;
  read: boolean;
}

const NOTIFICATIONS: NotifItem[] = [
  {
    id: "n1",
    avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Your order",
    action: "has been confirmed and is being prepared 🍳",
    time: "Just now",
    foodImageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200",
    read: false,
  },
  {
    id: "n2",
    avatarUrl: "https://randomuser.me/api/portraits/men/45.jpg",
    name: "Delivery update",
    action: "Your order is out for delivery 🛵",
    time: "5 min ago",
    foodImageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200",
    read: false,
  },
  {
    id: "n3",
    avatarUrl: "https://randomuser.me/api/portraits/women/22.jpg",
    name: "Promo alert",
    action: "Use code BISTRO20 for 20% off your next order 🎉",
    time: "1 hr ago",
    foodImageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=200",
    read: true,
  },
  {
    id: "n4",
    avatarUrl: "https://randomuser.me/api/portraits/men/67.jpg",
    name: "Order delivered",
    action: "Your Bistro Classic Burger was delivered. Enjoy! 🍔",
    time: "2 hrs ago",
    foodImageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=200",
    read: true,
  },
  {
    id: "n5",
    avatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "New items",
    action: "Check out our new seasonal menu items 🌟",
    time: "Yesterday",
    foodImageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200",
    read: true,
  },
];

const MESSAGES: NotifItem[] = [
  {
    id: "m1",
    avatarUrl: "https://randomuser.me/api/portraits/men/11.jpg",
    name: "Support Team",
    action: "Hi! How can we help you today?",
    time: "10 min ago",
    foodImageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200",
    read: false,
  },
  {
    id: "m2",
    avatarUrl: "https://randomuser.me/api/portraits/women/33.jpg",
    name: "Bistro Team",
    action: "Your feedback has been received. Thank you! ⭐",
    time: "1 day ago",
    foodImageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200",
    read: true,
  },
  {
    id: "m3",
    avatarUrl: "https://randomuser.me/api/portraits/men/55.jpg",
    name: "Delivery Partner",
    action: "I'm at your door. Please come down 🚪",
    time: "2 days ago",
    foodImageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200",
    read: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION ROW
// ─────────────────────────────────────────────────────────────────────────────

function NotifRow({ item, onPress }: { item: NotifItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[nr.row, !item.read && nr.rowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Unread dot */}
      {!item.read && <View style={nr.unreadDot} />}

      {/* Avatar */}
      <Image source={{ uri: item.avatarUrl }} style={nr.avatar} />

      {/* Text */}
      <View style={nr.info}>
        <Text style={nr.text} numberOfLines={2}>
          <Text style={nr.name}>{item.name} </Text>
          {item.action}
        </Text>
        <Text style={nr.time}>{item.time}</Text>
      </View>

      {/* Food thumbnail */}
      <Image source={{ uri: item.foodImageUrl }} style={nr.thumb} />
    </TouchableOpacity>
  );
}

const nr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
    position: "relative",
  },
  rowUnread: {
    backgroundColor: Colors.brand.primary + "06",
  },
  unreadDot: {
    position: "absolute",
    left: 6,
    top: "50%",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.brand.primary,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.neutral.surface,
    flexShrink: 0,
  },
  info: { flex: 1, gap: 3 },
  text: { fontSize: Typography.size.sm, color: Colors.neutral.primary, lineHeight: 19 },
  name: { fontWeight: Typography.weight.bold },
  time: { fontSize: Typography.size.xs, color: Colors.neutral.secondary },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.neutral.surface,
    flexShrink: 0,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "notifications" | "messages";

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("notifications");
  const [items, setItems] = useState(NOTIFICATIONS);
  const [msgs, setMsgs] = useState(MESSAGES);

  const unreadMsgs = msgs.filter((m) => !m.read).length;
  const data = activeTab === "notifications" ? items : msgs;

  const markRead = (id: string) => {
    if (activeTab === "notifications") {
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } else {
      setMsgs((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
    }
  };

  const markAllRead = () => {
    if (activeTab === "notifications") setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    else setMsgs((prev) => prev.map((m) => ({ ...m, read: true })));
  };

  const unreadCount = data.filter((d) => !d.read).length;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={s.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, activeTab === "notifications" && s.tabActive]}
          onPress={() => setActiveTab("notifications")}
        >
          <Text style={[s.tabText, activeTab === "notifications" && s.tabTextActive]}>
            Notifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === "messages" && s.tabActive]}
          onPress={() => setActiveTab("messages")}
        >
          <Text style={[s.tabText, activeTab === "messages" && s.tabTextActive]}>
            Messages{unreadMsgs > 0 ? ` (${unreadMsgs})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {data.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>{activeTab === "notifications" ? "🔔" : "💬"}</Text>
            <Text style={s.emptyTitle}>No {activeTab} yet</Text>
          </View>
        ) : (
          <View style={s.card}>
            {data.map((item) => (
              <NotifRow key={item.id} item={item} onPress={() => markRead(item.id)} />
            ))}
          </View>
        )}
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
  markAll: { fontSize: Typography.size.sm, color: Colors.brand.primary, fontWeight: Typography.weight.semibold },

  // Tabs — underline style matching reference
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.brand.primary,
  },
  tabText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
    color: Colors.neutral.secondary,
  },
  tabTextActive: {
    color: Colors.brand.primary,
    fontWeight: Typography.weight.bold,
  },

  scroll: { flex: 1 },
  content: { padding: Spacing.base },
  card: {
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.xl,
    overflow: "hidden",
    ...Shadow.sm,
  },

  // Empty
  empty: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.neutral.secondary },
});
