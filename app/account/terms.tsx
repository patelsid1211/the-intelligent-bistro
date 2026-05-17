/**
 * app/account/terms.tsx
 * Terms & Privacy screen.
 */

import BackButton from "@/components/BackButton";
import { Colors, Radius, Shadow, Spacing, Typography } from "@/constants/Theme";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView } from "expo-symbols";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "Terms of Service",
    icon: "doc.text.fill",
    color: "#007AFF",
    url: "https://thebistro.app/terms",
    summary: "By using The Bistro, you agree to our terms of service. We reserve the right to modify these terms at any time with notice.",
  },
  {
    title: "Privacy Policy",
    icon: "lock.shield.fill",
    color: "#34C759",
    url: "https://thebistro.app/privacy",
    summary: "We collect only the data necessary to provide our service. We never sell your personal information to third parties.",
  },
  {
    title: "Cookie Policy",
    icon: "hand.raised.fill",
    color: "#FF9500",
    url: "https://thebistro.app/cookies",
    summary: "We use cookies to improve your experience and analyze app usage. You can opt out of analytics cookies at any time.",
  },
];

const DATA_PRACTICES = [
  { icon: "person.fill", title: "Account Data", desc: "Name, email, phone — used to manage your account and orders." },
  { icon: "location.fill", title: "Location Data", desc: "Used only when you request delivery. Never tracked in background." },
  { icon: "cart.fill", title: "Order History", desc: "Stored to show your past orders and improve recommendations." },
  { icon: "creditcard.fill", title: "Payment Data", desc: "Processed securely by Stripe. We never store full card numbers." },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <BackButton />
        <Text style={s.title}>Terms & Privacy</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Documents */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>LEGAL DOCUMENTS</Text>
          <View style={s.card}>
            {SECTIONS.map((item, i) => (
              <View key={item.title}>
                {i > 0 && <View style={s.divider} />}
                <TouchableOpacity style={s.docRow} onPress={() => Linking.openURL(item.url)} activeOpacity={0.7}>
                  <View style={[s.docIcon, { backgroundColor: item.color + "18" }]}>
                    <SymbolView name={{ ios: item.icon as any, android: "description", web: "description" }} tintColor={item.color} size={20} />
                  </View>
                  <View style={s.docInfo}>
                    <Text style={s.docTitle}>{item.title}</Text>
                    <Text style={s.docSummary} numberOfLines={2}>{item.summary}</Text>
                  </View>
                  <SymbolView name={{ ios: "arrow.up.right.square", android: "open_in_new", web: "open_in_new" }} tintColor={Colors.neutral.placeholder} size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Data practices */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>HOW WE USE YOUR DATA</Text>
          <View style={s.card}>
            {DATA_PRACTICES.map((item, i) => (
              <View key={item.title}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.dataRow}>
                  <View style={s.dataIcon}>
                    <SymbolView name={{ ios: item.icon as any, android: "info", web: "info" }} tintColor={Colors.brand.primary} size={18} />
                  </View>
                  <View style={s.dataInfo}>
                    <Text style={s.dataTitle}>{item.title}</Text>
                    <Text style={s.dataDesc}>{item.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Data rights */}
        <View style={s.rightsCard}>
          <Text style={s.rightsTitle}>Your Data Rights</Text>
          <Text style={s.rightsText}>
            You have the right to access, correct, or delete your personal data at any time. To submit a data request, contact us at{" "}
            <Text style={s.rightsLink} onPress={() => Linking.openURL("mailto:privacy@thebistro.app")}>
              privacy@thebistro.app
            </Text>
          </Text>
        </View>

        <Text style={s.lastUpdated}>Last updated: May 2026 · v1.0.0</Text>
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
  docRow: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.base, gap: Spacing.md },
  docIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  docInfo: { flex: 1 },
  docTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary },
  docSummary: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, marginTop: 3, lineHeight: 16 },
  dataRow: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.base, gap: Spacing.md },
  dataIcon: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.brand.primary + "18", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  dataInfo: { flex: 1 },
  dataTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.semibold, color: Colors.neutral.primary },
  dataDesc: { fontSize: Typography.size.xs, color: Colors.neutral.secondary, marginTop: 2, lineHeight: 16 },
  rightsCard: { backgroundColor: Colors.neutral.white, borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm, ...Shadow.sm },
  rightsTitle: { fontSize: Typography.size.base, fontWeight: Typography.weight.bold, color: Colors.neutral.primary },
  rightsText: { fontSize: Typography.size.sm, color: Colors.neutral.secondary, lineHeight: 20 },
  rightsLink: { color: Colors.brand.primary, fontWeight: Typography.weight.medium },
  lastUpdated: { fontSize: Typography.size.xs, color: Colors.neutral.placeholder, textAlign: "center" },
});
