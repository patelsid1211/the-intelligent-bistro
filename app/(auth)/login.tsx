/**
 * app/(auth)/login.tsx
 * Full auth screen: Login + Sign Up + Forgot Password
 * Proper per-method validation throughout.
 */

import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList, KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppleButton, FacebookButton, GoogleButton } from "@/components/SocialButtons";
import { Colors, Radius, Spacing, Typography } from "@/constants/Theme";
import { useAuth } from "@/store";
import { apiForgotPassword, apiLogin, apiSignup, saveSession } from "@/store/authClient";
import type { AuthMethod, CountryCode } from "@shared/types";

// ─────────────────────────────────────────────────────────────────────────────
// COUNTRY CODES
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_CODES: CountryCode[] = [
  { name: "United States",  code: "US", dialCode: "+1",   flag: "🇺🇸", phoneMask: "(###) ###-####" },
  { name: "United Kingdom", code: "GB", dialCode: "+44",  flag: "🇬🇧", phoneMask: "#### ### ####" },
  { name: "Canada",         code: "CA", dialCode: "+1",   flag: "🇨🇦", phoneMask: "(###) ###-####" },
  { name: "Australia",      code: "AU", dialCode: "+61",  flag: "🇦🇺", phoneMask: "#### ### ###" },
  { name: "India",          code: "IN", dialCode: "+91",  flag: "🇮🇳", phoneMask: "##### #####" },
  { name: "Germany",        code: "DE", dialCode: "+49",  flag: "🇩🇪", phoneMask: "#### ########" },
  { name: "France",         code: "FR", dialCode: "+33",  flag: "🇫🇷", phoneMask: "## ## ## ## ##" },
  { name: "Japan",          code: "JP", dialCode: "+81",  flag: "🇯🇵", phoneMask: "##-####-####" },
  { name: "Brazil",         code: "BR", dialCode: "+55",  flag: "🇧🇷", phoneMask: "(##) #####-####" },
  { name: "Mexico",         code: "MX", dialCode: "+52",  flag: "🇲🇽", phoneMask: "## #### ####" },
  { name: "South Korea",    code: "KR", dialCode: "+82",  flag: "🇰🇷", phoneMask: "###-####-####" },
  { name: "Italy",          code: "IT", dialCode: "+39",  flag: "🇮🇹", phoneMask: "### ### ####" },
  { name: "Spain",          code: "ES", dialCode: "+34",  flag: "🇪🇸", phoneMask: "### ### ###" },
  { name: "Netherlands",    code: "NL", dialCode: "+31",  flag: "🇳🇱", phoneMask: "## ### ####" },
  { name: "Singapore",      code: "SG", dialCode: "+65",  flag: "🇸🇬", phoneMask: "#### ####" },
  { name: "UAE",            code: "AE", dialCode: "+971", flag: "🇦🇪", phoneMask: "## ### ####" },
  { name: "Nigeria",        code: "NG", dialCode: "+234", flag: "🇳🇬", phoneMask: "### ### ####" },
  { name: "South Africa",   code: "ZA", dialCode: "+27",  flag: "🇿🇦", phoneMask: "## ### ####" },
  { name: "China",          code: "CN", dialCode: "+86",  flag: "🇨🇳", phoneMask: "### #### ####" },
  { name: "Pakistan",       code: "PK", dialCode: "+92",  flag: "🇵🇰", phoneMask: "### #######" },
];

type Screen = "login" | "signup" | "forgot";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(v: string): string | null {
  if (!v.trim()) return "Email address is required.";
  if (!EMAIL_RE.test(v.trim())) return "Enter a valid email address (e.g. you@example.com).";
  return null;
}

function validatePhone(v: string): string | null {
  const digits = v.replace(/\D/g, "");
  if (!v.trim()) return "Phone number is required.";
  if (digits.length < 7) return "Enter a valid phone number (at least 7 digits).";
  if (digits.length > 15) return "Phone number is too long.";
  return null;
}

function validatePassword(v: string, isSignup = false): string | null {
  if (!v) return "Password is required.";
  if (isSignup) {
    if (v.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(v) && !/[0-9]/.test(v))
      return "Password must contain at least one number or uppercase letter.";
  }
  return null;
}

function validateDisplayName(v: string): string | null {
  if (!v.trim()) return "Display name is required.";
  if (v.trim().length < 2) return "Display name must be at least 2 characters.";
  if (v.trim().length > 50) return "Display name must be 50 characters or less.";
  if (!/^[a-zA-Z0-9 '_-]+$/.test(v.trim()))
    return "Display name can only contain letters, numbers, spaces, and _ - '.";
  return null;
}

// Password strength: 0–4
function passwordStrength(v: string): { score: number; label: string; color: string } {
  if (!v) return { score: 0, label: "", color: Colors.neutral.border };
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  score = Math.min(4, score);
  const map = [
    { label: "Too weak", color: "#FF3B30" },
    { label: "Weak",     color: "#FF9500" },
    { label: "Fair",     color: "#FFCC00" },
    { label: "Good",     color: "#34C759" },
    { label: "Strong",   color: "#30D158" },
  ];
  return { score, ...map[score] };
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTRY PICKER MODAL
// ─────────────────────────────────────────────────────────────────────────────

function CountryPicker({ visible, selected, onSelect, onClose }: {
  visible: boolean; selected: CountryCode;
  onSelect: (c: CountryCode) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = COUNTRY_CODES.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.dialCode.includes(search)
  );
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.pickerWrap}>
        <View style={s.pickerHeader}>
          <Text style={s.pickerTitle}>Select Country</Text>
          <TouchableOpacity onPress={onClose} style={s.pickerDoneBtn}>
            <Text style={s.pickerDone}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={s.pickerSearchWrap}>
          <TextInput style={s.pickerSearch} placeholder="Search country or dial code..."
            placeholderTextColor={Colors.neutral.placeholder}
            value={search} onChangeText={setSearch} autoFocus clearButtonMode="while-editing" />
        </View>
        <FlatList data={filtered} keyExtractor={(i) => i.code}
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.countryRow, item.code === selected.code && s.countryRowSel]}
              onPress={() => { onSelect(item); onClose(); }}
              accessibilityRole="button" accessibilityLabel={`${item.name} ${item.dialCode}`}>
              <Text style={s.flag}>{item.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.countryName}>{item.name}</Text>
                <Text style={s.countryDial}>{item.dialCode}</Text>
              </View>
              {item.code === selected.code && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={s.fieldError} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

function MethodToggle({ value, onChange }: { value: AuthMethod; onChange: (m: AuthMethod) => void }) {
  return (
    <View style={s.methodToggle}>
      {(["email", "phone"] as AuthMethod[]).map((m) => (
        <TouchableOpacity key={m} style={[s.methodBtn, value === m && s.methodBtnActive]}
          onPress={() => onChange(m)} accessibilityRole="button"
          accessibilityState={{ selected: value === m }}>
          <Text style={[s.methodBtnText, value === m && s.methodBtnTextActive]}>
            {m === "email" ? "📧 Email" : "📱 Phone"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PasswordInput({ value, onChange, placeholder, inputRef, onSubmit, showStrength = false }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  inputRef?: React.RefObject<TextInput | null>; onSubmit?: () => void; showStrength?: boolean;
}) {
  const [show, setShow] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;

  return (
    <View>
      <View style={s.pwRow}>
        <TextInput ref={inputRef} style={[s.input, s.pwInput]}
          placeholder={placeholder} placeholderTextColor={Colors.neutral.placeholder}
          value={value} onChangeText={onChange}
          secureTextEntry={!show} returnKeyType="done" onSubmitEditing={onSubmit} />
        <TouchableOpacity style={s.pwToggle} onPress={() => setShow(v => !v)}
          accessibilityRole="button" accessibilityLabel={show ? "Hide password" : "Show password"}>
          <Text style={s.pwToggleText}>{show ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>
      {showStrength && value.length > 0 && strength && (
        <View style={s.strengthRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.strengthBar, { backgroundColor: i < strength.score ? strength.color : Colors.neutral.border }]} />
          ))}
          <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}
    </View>
  );
}

function PhoneInput({ phone, onChangePhone, country, onOpenPicker }: {
  phone: string; onChangePhone: (v: string) => void;
  country: CountryCode; onOpenPicker: () => void;
}) {
  return (
    <View style={s.phoneRow}>
      <TouchableOpacity style={s.countryBtn} onPress={onOpenPicker}
        accessibilityRole="button" accessibilityLabel={`Country code ${country.dialCode}`}>
        <Text style={s.flag}>{country.flag}</Text>
        <Text style={s.countryDial}>{country.dialCode}</Text>
        <Text style={s.chevron}>▾</Text>
      </TouchableOpacity>
      <TextInput style={[s.input, { flex: 1 }]}
        placeholder={country.phoneMask.replace(/#/g, "0")}
        placeholderTextColor={Colors.neutral.placeholder}
        value={phone} onChangeText={onChangePhone}
        keyboardType="phone-pad" returnKeyType="next" />
    </View>
  );
}

function PrimaryButton({ label, onPress, loading, disabled }: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={[s.primaryBtn, (loading || disabled) && s.primaryBtnDisabled]}
      onPress={onPress} disabled={loading || disabled}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: loading || disabled }}>
      {loading
        ? <ActivityIndicator color={Colors.neutral.white} />
        : <Text style={s.primaryBtnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const { setAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>("login");

  // Method (email vs phone) — shared across login/signup/forgot
  const [method, setMethod] = useState<AuthMethod>("email");

  // Credential fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // UI state
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Per-field inline errors (shown after first submit attempt)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const clearAll = () => {
    setFieldErrors({});
    setGlobalError(null);
    setSuccessMsg(null);
  };

  const setFE = (key: string, msg: string | null) =>
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });

  const switchScreen = (s: Screen) => {
    setScreen(s);
    clearAll();
    // Reset credential fields when switching screens
    setEmail(""); setPhone(""); setPassword(""); setConfirmPassword(""); setDisplayName("");
  };

  const switchMethod = (m: AuthMethod) => {
    setMethod(m);
    clearAll();
    setEmail(""); setPhone("");
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────

  const handleLogin = useCallback(async () => {
    const errors: Record<string, string> = {};

    if (method === "email") {
      const e = validateEmail(email);
      if (e) errors.email = e;
    } else {
      const e = validatePhone(phone);
      if (e) errors.phone = e;
    }

    const pe = validatePassword(password, false);
    if (pe) errors.password = pe;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true); clearAll();
    try {
      // For phone login: look up by phone number
      // The server accepts email; for phone we pass the full number as the identifier
      const identifier = method === "email"
        ? email.trim().toLowerCase()
        : `${country.dialCode}${phone.trim()}`;

      const result = await apiLogin(identifier, password);
      if (!result.success) {
        setGlobalError(result.error.message);
        return;
      }
      await saveSession(result.data.accessToken, result.data.refreshToken, result.data.user);
      setAuth(result.data.user, result.data.accessToken);
    } catch {
      setGlobalError("Could not reach the server. Make sure the API server is running on port 3001.");
    } finally {
      setLoading(false);
    }
  }, [method, email, phone, country, password, setAuth]);

  // ── SIGNUP ─────────────────────────────────────────────────────────────────

  const handleSignup = useCallback(async () => {
    const errors: Record<string, string> = {};

    const ne = validateDisplayName(displayName);
    if (ne) errors.displayName = ne;

    if (method === "email") {
      const e = validateEmail(email);
      if (e) errors.email = e;
    } else {
      const e = validatePhone(phone);
      if (e) errors.phone = e;
    }

    const pe = validatePassword(password, true);
    if (pe) errors.password = pe;

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true); clearAll();
    try {
      // For phone signup: email field is optional — pass phone as identifier
      const emailValue = method === "email" ? email.trim().toLowerCase() : `${country.dialCode}${phone.trim()}`;
      const phoneValue = method === "phone" ? `${country.dialCode}${phone.trim()}` : undefined;

      const result = await apiSignup(emailValue, password, displayName.trim(), phoneValue);
      if (!result.success) {
        setGlobalError(result.error.message);
        return;
      }
      await saveSession(result.data.accessToken, result.data.refreshToken, result.data.user);
      setAuth(result.data.user, result.data.accessToken);
    } catch {
      setGlobalError("Could not reach the server. Make sure the API server is running on port 3001.");
    } finally {
      setLoading(false);
    }
  }, [method, email, phone, country, password, confirmPassword, displayName, setAuth]);

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────────

  const handleForgot = useCallback(async () => {
    const errors: Record<string, string> = {};

    if (method === "email") {
      const e = validateEmail(email);
      if (e) errors.email = e;
    } else {
      const e = validatePhone(phone);
      if (e) errors.phone = e;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true); clearAll();
    try {
      const identifier = method === "email"
        ? email.trim().toLowerCase()
        : `${country.dialCode}${phone.trim()}`;

      const result = await apiForgotPassword(identifier);
      if (result.success) {
        setSuccessMsg(
          result.message +
          (process.env.NODE_ENV !== "production"
            ? "\n\n🔧 Dev mode: check the API server terminal for your reset token."
            : "")
        );
      } else {
        setGlobalError(result.message);
      }
    } catch {
      setGlobalError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [method, email, phone, country]);

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + Spacing["2xl"] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

          {/* ── Dark header ── */}
          <View style={s.hero}>
            <Text style={s.appName}>
              {screen === "login" ? "Log In" : screen === "signup" ? "Sign Up" : "Forgot Password"}
            </Text>
            <Text style={s.tagline}>
              {screen === "login"
                ? "Please sign in to your existing account"
                : screen === "signup"
                ? "Please sign up to get started"
                : "Please sign in to your existing account"}
            </Text>
          </View>

          {/* ── White card ── */}
          <View style={s.card}>

          {/* ── Screen tabs (Login / Sign Up) ── */}
          {screen !== "forgot" && (
            <View style={s.tabs}>
              {(["login", "signup"] as Screen[]).map((tab) => (
                <TouchableOpacity key={tab} style={[s.tab, screen === tab && s.tabActive]}
                  onPress={() => switchScreen(tab)} accessibilityRole="button"
                  accessibilityState={{ selected: screen === tab }}>
                  <Text style={[s.tabText, screen === tab && s.tabTextActive]}>
                    {tab === "login" ? "Log In" : "Sign Up"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Global error / success ── */}
          {globalError && (
            <View style={s.globalError} accessibilityRole="alert">
              <Text style={s.globalErrorIcon}>⚠️</Text>
              <Text style={s.globalErrorText}>{globalError}</Text>
            </View>
          )}
          {successMsg && (
            <View style={s.globalSuccess} accessibilityRole="alert">
              <Text style={s.globalSuccessIcon}>✅</Text>
              <Text style={s.globalSuccessText}>{successMsg}</Text>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              LOGIN FORM
          ══════════════════════════════════════════════════════════════════ */}
          {screen === "login" && (
            <View style={s.form}>
              <MethodToggle value={method} onChange={switchMethod} />

              {method === "email" ? (
                <Field label="Email" error={fieldErrors.email}>
                  <TextInput style={[s.input, fieldErrors.email && s.inputError]}
                    placeholder="example@gmail.com"
                    placeholderTextColor={Colors.neutral.placeholder}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setFE("email", null); }}
                    keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                    returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
                    accessibilityLabel="Email address" />
                </Field>
              ) : (
                <Field label="Mobile Number" error={fieldErrors.phone}>
                  <PhoneInput phone={phone} onChangePhone={(t) => { setPhone(t); setFE("phone", null); }}
                    country={country} onOpenPicker={() => setShowPicker(true)} />
                </Field>
              )}

              <Field label="Password" error={fieldErrors.password}>
                <PasswordInput value={password}
                  onChange={(t) => { setPassword(t); setFE("password", null); }}
                  placeholder="· · · · · · · · · ·"
                  inputRef={passwordRef} onSubmit={handleLogin} />
              </Field>

              {/* Remember me + Forgot */}
              <View style={s.forgotRow}>
                <View style={s.rememberRow}>
                  <View style={s.rememberBox} />
                  <Text style={s.rememberText}>Remember me</Text>
                </View>
                <TouchableOpacity onPress={() => switchScreen("forgot")}>
                  <Text style={s.forgotLinkText}>Forgot Password</Text>
                </TouchableOpacity>
              </View>

              <PrimaryButton label="Log In" onPress={handleLogin} loading={loading} />

              {/* Sign up link */}
              <View style={s.signupRow}>
                <Text style={s.signupText}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => switchScreen("signup")}>
                  <Text style={s.signupLink}>SIGN UP</Text>
                </TouchableOpacity>
              </View>

              <View style={s.dividerRow}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>Or</Text>
                <View style={s.dividerLine} />
              </View>

              <View style={s.socialStack}>
                <AppleButton onPress={() => {}} />
                <GoogleButton onPress={() => {}} />
                <FacebookButton onPress={() => {}} />
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              SIGNUP FORM
          ══════════════════════════════════════════════════════════════════ */}
          {screen === "signup" && (
            <View style={s.form}>
              <Field label="Name" error={fieldErrors.displayName}>
                <TextInput style={[s.input, fieldErrors.displayName && s.inputError]}
                  placeholder="John doe"
                  placeholderTextColor={Colors.neutral.placeholder}
                  value={displayName}
                  onChangeText={(t) => { setDisplayName(t); setFE("displayName", null); }}
                  autoCapitalize="words" returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityLabel="Display name" />
              </Field>

              <MethodToggle value={method} onChange={switchMethod} />

              {method === "email" ? (
                <Field label="Email" error={fieldErrors.email}>
                  <TextInput style={[s.input, fieldErrors.email && s.inputError]}
                    placeholder="example@gmail.com"
                    placeholderTextColor={Colors.neutral.placeholder}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setFE("email", null); }}
                    keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                    returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()}
                    accessibilityLabel="Email address" />
                </Field>
              ) : (
                <Field label="Mobile Number" error={fieldErrors.phone}>
                  <PhoneInput phone={phone} onChangePhone={(t) => { setPhone(t); setFE("phone", null); }}
                    country={country} onOpenPicker={() => setShowPicker(true)} />
                </Field>
              )}

              <Field label="Password" error={fieldErrors.password}>
                <PasswordInput value={password}
                  onChange={(t) => { setPassword(t); setFE("password", null); }}
                  placeholder="· · · · · · · · · ·"
                  inputRef={passwordRef} onSubmit={() => confirmRef.current?.focus()}
                  showStrength />
              </Field>

              <Field label="Re-Type Password" error={fieldErrors.confirmPassword}>
                <PasswordInput value={confirmPassword}
                  onChange={(t) => { setConfirmPassword(t); setFE("confirmPassword", null); }}
                  placeholder="Re-enter your password"
                  inputRef={confirmRef} onSubmit={handleSignup} />
              </Field>

              <PrimaryButton label="Sign Up" onPress={handleSignup} loading={loading} />

              <Text style={s.termsText}>
                By signing up you agree to our{" "}
                <Text style={s.termsLink}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={s.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              FORGOT PASSWORD FORM
          ══════════════════════════════════════════════════════════════════ */}
          {screen === "forgot" && (
            <View style={s.form}>
              <MethodToggle value={method} onChange={switchMethod} />

              {method === "email" ? (
                <Field label="Email" error={fieldErrors.email}>
                  <TextInput style={[s.input, fieldErrors.email && s.inputError]}
                    placeholder="example@gmail.com"
                    placeholderTextColor={Colors.neutral.placeholder}
                    value={email}
                    onChangeText={(t) => { setEmail(t); setFE("email", null); }}
                    keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                    returnKeyType="done" onSubmitEditing={handleForgot} autoFocus
                    accessibilityLabel="Email address" />
                </Field>
              ) : (
                <Field label="Mobile Number" error={fieldErrors.phone}>
                  <PhoneInput phone={phone} onChangePhone={(t) => { setPhone(t); setFE("phone", null); }}
                    country={country} onOpenPicker={() => setShowPicker(true)} />
                </Field>
              )}

              <PrimaryButton label="Send Code" onPress={handleForgot} loading={loading}
                disabled={!!successMsg} />

              <TouchableOpacity style={s.backToLogin} onPress={() => switchScreen("login")}>
                <Text style={s.backToLoginText}>← Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          </View>{/* end card */}
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPicker visible={showPicker} selected={country}
        onSelect={setCountry} onClose={() => setShowPicker(false)} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Root & scroll ──────────────────────────────────────────────────────────
  root: { flex: 1, backgroundColor: Colors.auth.bg },
  scroll: { flexGrow: 1 },

  // ── Dark header section ────────────────────────────────────────────────────
  hero: {
    alignItems: "center",
    paddingTop: Spacing["4xl"],
    paddingBottom: Spacing["2xl"],
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.sm,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    fontSize: Typography.size["2xl"],
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  tagline: {
    fontSize: Typography.size.base,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },

  // ── White card container ───────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.neutral.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: Spacing["2xl"],
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing["3xl"],
    flex: 1,
  },

  // ── Screen tabs ────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: "row",
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
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

  // ── Global banners ─────────────────────────────────────────────────────────
  globalError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: "#FEF2F2",
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.semantic.error,
    marginBottom: Spacing.sm,
  },
  globalErrorIcon: { fontSize: 16, marginTop: 1 },
  globalErrorText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.semantic.error,
    fontWeight: Typography.weight.medium,
    lineHeight: 18,
  },
  globalSuccess: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: "#F0FDF4",
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.semantic.success,
    marginBottom: Spacing.sm,
  },
  globalSuccessIcon: { fontSize: 16, marginTop: 1 },
  globalSuccessText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.semantic.success,
    fontWeight: Typography.weight.medium,
    lineHeight: 18,
  },

  // ── Form ───────────────────────────────────────────────────────────────────
  form: { gap: Spacing.lg },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.secondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  fieldError: { fontSize: Typography.size.xs, color: Colors.semantic.error, marginTop: 2 },

  // ── Input ──────────────────────────────────────────────────────────────────
  input: {
    height: 54,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
    borderWidth: 0,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: Colors.semantic.error,
    backgroundColor: "#FEF2F2",
  },

  // ── Method toggle ──────────────────────────────────────────────────────────
  methodToggle: {
    flexDirection: "row",
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    padding: 4,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    borderRadius: Radius.md,
  },
  methodBtnActive: {
    backgroundColor: Colors.neutral.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  methodBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.neutral.secondary,
  },
  methodBtnTextActive: {
    color: Colors.neutral.primary,
    fontWeight: Typography.weight.bold,
  },

  // ── Phone ──────────────────────────────────────────────────────────────────
  phoneRow: { flexDirection: "row", gap: Spacing.sm },
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    backgroundColor: Colors.neutral.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  chevron: { fontSize: 11, color: Colors.neutral.secondary },

  // ── Password ───────────────────────────────────────────────────────────────
  pwRow: { position: "relative" },
  pwInput: { paddingRight: 72 },
  pwToggle: {
    position: "absolute",
    right: Spacing.base,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  pwToggleText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.neutral.secondary,
  },

  // ── Password strength ──────────────────────────────────────────────────────
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    minWidth: 52,
    textAlign: "right",
  },

  // ── Remember me + Forgot row ───────────────────────────────────────────────
  forgotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -Spacing.sm,
  },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rememberBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.neutral.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberText: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  forgotLink: {},
  forgotLinkText: {
    fontSize: Typography.size.sm,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.semibold,
  },

  // ── Primary button ─────────────────────────────────────────────────────────
  primaryBtn: {
    height: 56,
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.heavy,
    color: Colors.neutral.white,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ── Divider ────────────────────────────────────────────────────────────────
  dividerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.neutral.border },
  dividerText: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },

  // ── Social ─────────────────────────────────────────────────────────────────
  socialStack: { gap: Spacing.sm },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  signupText: { fontSize: Typography.size.sm, color: Colors.neutral.secondary },
  signupLink: {
    fontSize: Typography.size.sm,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.bold,
  },

  // ── Terms ──────────────────────────────────────────────────────────────────
  termsText: {
    fontSize: Typography.size.xs,
    color: Colors.neutral.secondary,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: { color: Colors.brand.primary, fontWeight: Typography.weight.medium },

  // ── Forgot screen ──────────────────────────────────────────────────────────
  forgotHero: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  forgotEmoji: { fontSize: 48 },
  forgotHeading: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
    textAlign: "center",
  },
  forgotSubtitle: {
    fontSize: Typography.size.base,
    color: Colors.neutral.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  backToLogin: { alignItems: "center", paddingVertical: Spacing.sm },
  backToLoginText: {
    fontSize: Typography.size.base,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.medium,
  },

  // ── Country picker ─────────────────────────────────────────────────────────
  pickerWrap: { flex: 1, backgroundColor: Colors.neutral.white },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  pickerTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.neutral.primary,
  },
  pickerDoneBtn: { padding: Spacing.xs },
  pickerDone: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.brand.primary,
  },
  pickerSearchWrap: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.neutral.surface,
  },
  pickerSearch: {
    height: 44,
    backgroundColor: Colors.neutral.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.size.base,
    color: Colors.neutral.primary,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  countryRowSel: { backgroundColor: "#FFF7ED" },
  flag: { fontSize: 26 },
  countryName: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
    color: Colors.neutral.primary,
  },
  countryDial: {
    fontSize: Typography.size.sm,
    color: Colors.neutral.secondary,
    marginTop: 2,
  },
  check: {
    fontSize: Typography.size.md,
    color: Colors.brand.primary,
    fontWeight: Typography.weight.bold,
  },
  sep: {
    height: 1,
    backgroundColor: Colors.neutral.border,
    marginLeft: Spacing.base + 26 + Spacing.md,
  },
});
