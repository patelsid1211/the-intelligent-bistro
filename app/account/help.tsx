/**
 * app/account/help.tsx
 * Help & Support screen — FAQs, contact options.
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FAQS = [
  { q: "How do I track my order?", a: "Go to your Profile → Recent Orders and tap any order to see real-time tracking with status updates." },
  { q: "Can I cancel my order?", a: "Orders can be cancelled within 2 minutes of placing them. After that, the restaurant has already started preparing your food." },
  { q: "What if my order is wrong or missing items?", a: "Tap 'Report an Issue' below and we'll make it right with a refund or replacement within 24 hours." },
  { q: "How do promo codes work?", a: "Go to Profile → Promo Codes and enter your code. It will be applied automatically at checkout. Each code can only be used once." },
  { q: "How do I change my delivery address?", a: "You can update your delivery address in Profile → Saved Addresses, or change it directly at checkout before placing your order." },
  { q: "What payment methods are accepted?", a: "We accept all major credit and debit cards (Visa, Mastercard, Amex, Discover), Apple Pay, and Google Pay." },
  { q: "How do I use the AI ordering assistant?", a: "Tap the AI Order tab and type or speak what you want. Try 'Add a burger', 'Show my cart', or 'What's popular?'" },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={faq.item} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
      <View style={faq.row}>
        <Text style={faq.question}>{q}</Text>
        <SymbolView
          name={{ ios: open ? "chevron.up" : "chevron.down", android: open ? "expand_less" : "expand_more", web: "expand_more" }}
          tintColor={Colors.neutral.secondary} size={16} />
      </View>
      {open && <Text style={faq.answer}>{a}</Text>}
    </TouchableOpacity>
  );
}

const faq = StyleSheet.create({
  item: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.md },
  question: { flex: 1, fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary, lineHeight: 22 },
  answer: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, lineHeight: 20, marginTop: Spacing.sm },
});

export default function HelpScreen() {
  const router = useRouter();

  const handleContact = (method: string) => {
    switch (method) {
      case "email":
        Linking.openURL("mailto:support@thebistro.app?subject=Support Request");
        break;
      case "phone":
        Linking.openURL("tel:+18005551234");
        break;
      case "chat":
        Alert.alert("Live Chat", "Live chat is available Mon–Fri 9am–9pm PT. Average response time: 2 minutes.", [{ text: "OK" }]);
        break;
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Help & Support</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Contact options */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>CONTACT US</Text>
          <View style={s.card}>
            {[
              { icon: "message.fill", label: "Live Chat", sub: "Avg. 2 min response", method: "chat", color: Colors.brand.primary },
              { icon: "envelope.fill", label: "Email Support", sub: "support@thebistro.app", method: "email", color: "#007AFF" },
              { icon: "phone.fill", label: "Call Us", sub: "+1 (800) 555-1234", method: "phone", color: "#34C759" },
            ].map((item, i, arr) => (
              <View key={item.method}>
                {i > 0 && <View style={s.divider} />}
                <TouchableOpacity style={s.contactRow} onPress={() => handleContact(item.method)} activeOpacity={0.7}>
                  <View style={[s.contactIcon, { backgroundColor: item.color + "18" }]}>
                    <SymbolView name={{ ios: item.icon as any, android: "support_agent", web: "support_agent" }} tintColor={item.color} size={20} />
                  </View>
                  <View style={s.contactInfo}>
                    <Text style={s.contactLabel}>{item.label}</Text>
                    <Text style={s.contactSub}>{item.sub}</Text>
                  </View>
                  <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} tintColor={Colors.neutral.placeholder} size={14} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Report issue */}
        <TouchableOpacity style={s.reportBtn} onPress={() => Alert.alert("Report an Issue", "Our team will review your report and respond within 24 hours.", [{ text: "OK" }])}>
          <SymbolView name={{ ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" }} tintColor={Colors.semantic.warning} size={20} />
          <Text style={s.reportText}>Report an Issue with My Order</Text>
          <SymbolView name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }} tintColor={Colors.neutral.placeholder} size={14} />
        </TouchableOpacity>

        {/* FAQs */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Text>
          <View style={s.card}>
            {FAQS.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </View>
        </View>

        <Text style={s.version}>The Intelligent Bistro v1.0.0 · support@thebistro.app</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.neutral.offWhite },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, backgroundColor: Colors.neutral.white, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  title: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  content: { padding: Spacing.base, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.neutral.secondary, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: Spacing.xs },
  card: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, overflow: "hidden", ...Shadow.sm },
  divider: { height: 1, backgroundColor: Colors.neutral.border, marginLeft: Spacing.base },
  contactRow: { flexDirection: "row", alignItems: "center", padding: Spacing.base, gap: Spacing.md },
  contactIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary },
  contactSub: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, marginTop: 2 },
  reportBtn: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  reportText: { flex: 1, fontSize: Typography.size.base, fontWeight: Typography.weight.medium, color: Colors.neutral.primary },
  version: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, textAlign: "center" },
});
