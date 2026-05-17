/**
 * components/AIBubble.tsx
 * Floating AI ordering bubble — lives above the tab bar on all screens.
 *
 * Behaviour:
 * - Draggable pill that snaps to left/right edge
 * - Tap → expands into a mini chat panel (slide-up sheet)
 * - Mini panel has full conversational AI: text input, message history,
 *   quick chips, typing indicator, option cards
 * - "Open full chat" shortcut navigates to the AI Chat tab
 * - Collapses back to bubble on dismiss / outside tap
 */

import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { SCREEN_H, SCREEN_W, SNAP_MARGIN, TAB_BAR_HEIGHT } from "@/constants/layout";
import { MENU_ITEM_MAP } from "@/data/menu";
import { useAIChat } from "@/hooks/useAIChat";
import { useAI, useBistroStore } from "@/store";
import { buildDefaultSelections, expandSelections } from "@/utils/customization";
import { formatPrice } from "@/utils/format";
import type { AIMenuOption } from "@shared/types";
import { useRouter, useSegments } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BUBBLE_SIZE = 58;
const TAB_BAR_H = TAB_BAR_HEIGHT;
const PANEL_H = SCREEN_H * 0.62;

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MINI OPTION CARD (compact version for the bubble panel)
// ─────────────────────────────────────────────────────────────────────────────

const DIETARY_COLORS: Record<string, { bg: string; text: string }> = {
  vegan:        { bg: "#DCFCE7", text: "#15803D" },
  vegetarian:   { bg: "#D1FAE5", text: "#065F46" },
  "gluten-free":{ bg: "#E0F2FE", text: "#0369A1" },
  spicy:        { bg: "#FEE2E2", text: "#B91C1C" },
  popular:      { bg: "#FEF3C7", text: "#92400E" },
  featured:     { bg: "#FCE7F3", text: "#BE185D" },
};

interface MiniOptionCardProps {
  option: AIMenuOption;
  onAdd: (menuItemId: string) => void;
}

function MiniOptionCard({ option, onAdd }: MiniOptionCardProps) {
  const tag = option.dietaryTags.find((t) => DIETARY_COLORS[t]);
  const tagCfg = tag ? DIETARY_COLORS[tag] : null;
  return (
    <TouchableOpacity style={moc.card} onPress={() => onAdd(option.menuItemId)} activeOpacity={0.85}>
      <Image source={{ uri: option.imageUrl }} style={moc.image} resizeMode="cover" />
      <View style={moc.info}>
        <Text style={moc.name} numberOfLines={1}>{option.name}</Text>
        <View style={moc.row}>
          <Text style={moc.price}>{formatPrice(option.basePrice)}</Text>
          <Text style={moc.star}>★ {option.rating.toFixed(1)}</Text>
          {tagCfg && (
            <View style={[moc.tag, { backgroundColor: tagCfg.bg }]}>
              <Text style={[moc.tagText, { color: tagCfg.text }]}>{tag}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={moc.addBtn}>
        <Text style={moc.addBtnText}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

const moc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: "hidden",
    ...Shadow.sm,
  },
  image: { width: 64, height: 64, flexShrink: 0 },
  info: { flex: 1, paddingHorizontal: Spacing.sm, gap: 3 },
  name: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  price: { fontSize: Typography.size.sm, fontWeight: Typography.weight.heavy, color: Colors.neutral.primary },
  star: { fontSize: 11, color: "#F59E0B", fontWeight: Typography.weight.semibold },
  tag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: Radius.full },
  tagText: { fontSize: 9, fontWeight: Typography.weight.bold },
  addBtn: {
    width: 34, height: 34, borderRadius: Radius.full,
    backgroundColor: Colors.brand.primary,
    alignItems: "center", justifyContent: "center",
    marginRight: Spacing.sm,
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: { fontSize: 20, fontWeight: Typography.weight.bold, color: Colors.neutral.white, lineHeight: 24 },
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -4, duration: 260, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.delay(500),
        ])
      ).start();
    });
  }, []);
  return (
    <View style={td.row}>
      <View style={td.avatar}><Text style={td.avatarText}>🤖</Text></View>
      <View style={td.bubble}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[td.dot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}

const td = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", marginBottom: Spacing.sm },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand.primary + "18", alignItems: "center", justifyContent: "center", marginRight: Spacing.xs, borderWidth: 1, borderColor: Colors.brand.primary + "25" },
  avatarText: { fontSize: 14 },
  bubble: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.neutral.white, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Shadow.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.neutral.divider },
});

// ─────────────────────────────────────────────────────────────────────────────
// MINI CHAT PANEL
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { label: "🍕 Pizza", msg: "I want pizza" },
  { label: "🍔 Burgers", msg: "Show me burgers" },
  { label: "🍣 Sushi", msg: "I want sushi" },
  { label: "🌮 Tacos", msg: "I want tacos" },
  { label: "🛒 My cart", msg: "Show my cart" },
  { label: "⭐ Popular", msg: "What's popular?" },
];

interface MiniChatPanelProps {
  onClose: () => void;
  onOpenFull: () => void;
  panelAnim: Animated.Value;
}

function MiniChatPanel({ onClose, onOpenFull, panelAnim }: MiniChatPanelProps) {
  const { conversationHistory, isProcessing } = useAI();
  const insets = useSafeAreaInsets();

  const [input, setInput] = useState("");
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  useEffect(() => {
    if (conversationHistory.length > 0) scrollToBottom();
  }, [conversationHistory.length]);

  const { sendMessage } = useAIChat({
    onResponse: scrollToBottom,
    onNavigate: onClose,
  });

  const handleSend = useCallback((text: string) => {
    Keyboard.dismiss();
    setInput("");
    sendMessage(text);
  }, [sendMessage]);

  const handleAddOption = useCallback((menuItemId: string) => {
    const item = MENU_ITEM_MAP.get(menuItemId);
    if (!item) return;
    const defaultSelections = buildDefaultSelections(item);
    const customizations = expandSelections(item, defaultSelections);
    const { addItem, addConversationTurn } = useBistroStore.getState();
    addItem(menuItemId, 1, customizations);
    addConversationTurn({
      role: "assistant",
      content: `Added ${item.name} to your cart! 🛒 Anything else?`,
      timestamp: Date.now(),
    });
    scrollToBottom();
  }, [scrollToBottom]);

  const isEmpty = conversationHistory.length === 0;

  const translateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_H + 40, 0],
  });

  return (
    <Animated.View style={[panel.container, { transform: [{ translateY }] }]}>
      {/* Handle bar */}
      <View style={panel.handle} />

      {/* Header */}
      <View style={panel.header}>
        <View style={panel.headerLeft}>
          <View style={panel.headerAvatar}><Text style={panel.headerEmoji}>🤖</Text></View>
          <View>
            <Text style={panel.headerTitle}>AI Order Assistant</Text>
            <View style={panel.statusRow}>
              <View style={[panel.statusDot, isProcessing && panel.statusDotThinking]} />
              <Text style={panel.headerSub}>{isProcessing ? "Thinking..." : "Online"}</Text>
            </View>
          </View>
        </View>
        <View style={panel.headerRight}>
          <TouchableOpacity style={panel.fullBtn} onPress={onOpenFull}>
            <SymbolView name={{ ios: "arrow.up.left.and.arrow.down.right", android: "open_in_full", web: "open_in_full" }} tintColor={Colors.brand.primary} size={14} />
            <Text style={panel.fullBtnText}>Full chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={panel.closeBtn} onPress={onClose}>
            <SymbolView name={{ ios: "xmark", android: "close", web: "close" }} tintColor={Colors.neutral.secondary} size={16} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        {isEmpty ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={panel.emptyState}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Welcome illustration */}
            <View style={panel.emptyHero}>
              <View style={panel.emptyAvatarBig}>
                <Text style={panel.emptyAvatarEmoji}>🤖</Text>
              </View>
              <Text style={panel.emptyTitle}>What are you craving?</Text>
              <Text style={panel.emptySubtitle}>Tap a category or type anything below</Text>
            </View>

            {/* 2-column chip grid */}
            <View style={panel.chipGrid}>
              {QUICK_CHIPS.map((c) => (
                <TouchableOpacity
                  key={c.msg}
                  style={panel.chip}
                  onPress={() => handleSend(c.msg)}
                  activeOpacity={0.75}
                >
                  <Text style={panel.chipEmoji}>{c.label.split(" ")[0]}</Text>
                  <Text style={panel.chipText}>{c.label.split(" ").slice(1).join(" ")}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={conversationHistory}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={panel.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollToBottom()}
            renderItem={({ item: turn }) => {
              const isUser = turn.role === "user";
              const hasOptions = !isUser && turn.menuOptions && turn.menuOptions.length > 0;
              return (
                <View>
                  <View style={[panel.msgRow, isUser ? panel.msgRowUser : panel.msgRowAI]}>
                    {!isUser && <View style={panel.msgAvatar}><Text style={panel.msgAvatarText}>🤖</Text></View>}
                    <View style={[panel.bubble, isUser ? panel.bubbleUser : panel.bubbleAI]}>
                      <Text style={[panel.bubbleText, isUser ? panel.bubbleTextUser : panel.bubbleTextAI]}>{turn.content}</Text>
                    </View>
                    {isUser && <View style={{ width: 28 + Spacing.xs }} />}
                  </View>
                  {hasOptions && (
                    <View style={panel.optionsList}>
                      {turn.menuOptions!.slice(0, 4).map((opt: AIMenuOption) => (
                        <MiniOptionCard key={opt.menuItemId} option={opt} onAdd={handleAddOption} />
                      ))}
                      {turn.menuOptions!.length > 4 && (
                        <TouchableOpacity style={panel.seeMoreBtn} onPress={onOpenFull}>
                          <Text style={panel.seeMoreText}>See all {turn.menuOptions!.length} options in full chat →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
            ListFooterComponent={isProcessing ? <TypingDots /> : null}
          />
        )}

        {/* Input */}
        <View style={[panel.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <TextInput
            ref={inputRef}
            style={panel.input}
            placeholder="Ask me anything..."
            placeholderTextColor={Colors.neutral.placeholder}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            enablesReturnKeyAutomatically
            onSubmitEditing={() => handleSend(input)}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[panel.sendBtn, (!input.trim() || isProcessing) && panel.sendBtnOff]}
            onPress={() => handleSend(input)}
            disabled={!input.trim() || isProcessing}
          >
            {isProcessing
              ? <ActivityIndicator size="small" color={Colors.neutral.white} />
              : <SymbolView name={{ ios: "arrow.up", android: "send", web: "send" }} tintColor={Colors.neutral.white} size={16} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const panel = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_H,
    backgroundColor: Colors.neutral.offWhite,
    borderTopLeftRadius: Radius["2xl"],
    borderTopRightRadius: Radius["2xl"],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
    overflow: "hidden",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.neutral.divider,
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.neutral.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.brand.primary + "18",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: Colors.brand.primary + "30",
  },
  headerEmoji: { fontSize: 20 },
  headerTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.semantic.success },
  statusDotThinking: { backgroundColor: Colors.brand.accent },
  headerSub: { fontSize: 11, color: Colors.neutral.secondary },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  fullBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    backgroundColor: Colors.brand.primary + "12",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.brand.primary + "30",
  },
  fullBtnText: { fontSize: 11, fontWeight: Typography.weight.bold, color: Colors.brand.primary },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.neutral.surface,
    alignItems: "center", justifyContent: "center",
  },
  emptyState: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  emptyHero: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyAvatarBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brand.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.brand.primary + "25",
    marginBottom: Spacing.xs,
  },
  emptyAvatarEmoji: { fontSize: 32 },
  emptyTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    textAlign: "center",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chipEmoji: { fontSize: 16 },
  chipText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.neutral.primary,
  },
  chipsList: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  messageList: { padding: Spacing.base, gap: 4, paddingBottom: Spacing.sm },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: Spacing.xs },
  msgRowUser: { justifyContent: "flex-end" },
  msgRowAI: { justifyContent: "flex-start" },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand.primary + "18", alignItems: "center", justifyContent: "center", marginRight: Spacing.xs, borderWidth: 1, borderColor: Colors.brand.primary + "25" },
  msgAvatarText: { fontSize: 14 },
  bubble: { maxWidth: "80%", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 18 },
  bubbleUser: { backgroundColor: Colors.brand.primary, borderBottomRightRadius: 4, shadowColor: Colors.brand.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  bubbleAI: { backgroundColor: Colors.neutral.white, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleText: { fontSize: Typography.size.sm, lineHeight: 20 },
  bubbleTextUser: { color: Colors.neutral.white, fontWeight: Typography.weight.medium },
  bubbleTextAI: { color: Colors.neutral.primary },
  optionsList: { marginLeft: 28 + Spacing.xs, marginBottom: Spacing.sm, marginTop: 4 },
  seeMoreBtn: { paddingVertical: Spacing.sm, alignItems: "center" },
  seeMoreText: { fontSize: Typography.size.xs, color: Colors.brand.primary, fontWeight: Typography.weight.semibold },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.neutral.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.neutral.border,
  },
  input: {
    flex: 1, height: 42,
    backgroundColor: Colors.neutral.surface,
    borderRadius: 21,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.size.sm,
    color: Colors.neutral.primary,
    borderWidth: 1.5,
    borderColor: Colors.neutral.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.brand.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnOff: { backgroundColor: Colors.neutral.divider, shadowOpacity: 0 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FLOATING BUBBLE
// ─────────────────────────────────────────────────────────────────────────────

export default function AIBubble() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { isProcessing, conversationHistory } = useAI();

  // ── Panel open/close state ──────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ── Draggable bubble position ───────────────────────────────────────────────
  const INITIAL_X = SCREEN_W - BUBBLE_SIZE - SNAP_MARGIN;
  const INITIAL_Y = SCREEN_H - TAB_BAR_H - BUBBLE_SIZE - 80 - insets.bottom;

  const bubblePos = useRef(new Animated.ValueXY({ x: INITIAL_X, y: INITIAL_Y })).current;
  const dragOffset = useRef({ x: INITIAL_X, y: INITIAL_Y });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4,
      onPanResponderGrant: (_, gs) => {
        isDragging.current = false;
        dragStartPos.current = { x: gs.x0, y: gs.y0 };
        bubblePos.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6) isDragging.current = true;
        const newX = Math.max(SNAP_MARGIN, Math.min(SCREEN_W - BUBBLE_SIZE - SNAP_MARGIN, dragOffset.current.x + gs.dx));
        const newY = Math.max(insets.top + 60, Math.min(SCREEN_H - TAB_BAR_H - BUBBLE_SIZE - 20 - insets.bottom, dragOffset.current.y + gs.dy));
        bubblePos.setValue({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gs) => {
        const finalX = dragOffset.current.x + gs.dx;
        const finalY = Math.max(insets.top + 60, Math.min(SCREEN_H - TAB_BAR_H - BUBBLE_SIZE - 20 - insets.bottom, dragOffset.current.y + gs.dy));
        const snapX = finalX + BUBBLE_SIZE / 2 < SCREEN_W / 2
          ? SNAP_MARGIN
          : SCREEN_W - BUBBLE_SIZE - SNAP_MARGIN;
        dragOffset.current = { x: snapX, y: finalY };
        Animated.spring(bubblePos, { toValue: { x: snapX, y: finalY }, useNativeDriver: false, speed: 20, bounciness: 8 }).start();
        if (!isDragging.current) {
          openPanel();
        }
      },
    })
  ).current;

  // ── Pulse animation ─────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [isProcessing]);

  // ── Visibility check — AFTER all hooks ─────────────────────────────────────
  const firstSegment = segments[0] as string | undefined;
  const secondSegment = segments[1] as string | undefined;
  const isOnAIChat = secondSegment === "ai-chat";
  const isOnAuth = firstSegment === "(auth)";

  const openPanel = () => {
    setPanelOpen(true);
    Animated.parallel([
      Animated.spring(panelAnim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 4 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closePanel = () => {
    Animated.parallel([
      Animated.timing(panelAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setPanelOpen(false));
  };

  const openFullChat = () => {
    closePanel();
    setTimeout(() => router.push("/(tabs)/ai-chat" as any), 300);
  };

  const unreadCount = conversationHistory.filter((t) => t.role === "assistant").length;

  // Hide on auth or AI chat tab — return null AFTER all hooks
  if (isOnAuth || isOnAIChat) return null;

  return (
    <>
      {/* Backdrop */}
      {panelOpen && (
        <TouchableWithoutFeedback onPress={closePanel}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.45)", opacity: backdropAnim, zIndex: 998 },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Mini chat panel */}
      {panelOpen && (
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 999 }}>
          <MiniChatPanel onClose={closePanel} onOpenFull={openFullChat} panelAnim={panelAnim} />
        </View>
      )}

      {/* Floating bubble */}
      {!panelOpen && (
        <Animated.View
          style={[
            bubble.container,
            {
              transform: [
                { translateX: bubblePos.x },
                { translateY: bubblePos.y },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Scale wrapper — native driver for smooth pulse */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: "center", justifyContent: "center" }}>
            {/* Outer glow ring */}
            <View style={bubble.ring} />

            {/* Main bubble */}
            <View style={bubble.inner}>
              <Text style={bubble.emoji}>🤖</Text>
            </View>

            {/* Unread badge */}
            {unreadCount > 0 && (
              <View style={bubble.badge}>
                <Text style={bubble.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}

            {/* "AI" label */}
            <View style={bubble.label}>
              <Text style={bubble.labelText}>AI</Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
}

const bubble = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    top: 0,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    zIndex: 997,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: BUBBLE_SIZE + 10,
    height: BUBBLE_SIZE + 10,
    borderRadius: (BUBBLE_SIZE + 10) / 2,
    backgroundColor: Colors.brand.primary + "25",
  },
  inner: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
  emoji: { fontSize: 26 },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.semantic.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },
  badgeText: { fontSize: 10, fontWeight: Typography.weight.heavy, color: Colors.neutral.white, lineHeight: 14 },
  label: {
    position: "absolute",
    bottom: -2,
    right: -4,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: Colors.brand.primary + "40",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  labelText: { fontSize: 9, fontWeight: Typography.weight.heavy, color: Colors.brand.primary, letterSpacing: 0.5 },
});
