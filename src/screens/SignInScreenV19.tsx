import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LanguagePickerModal } from "../components/LanguagePickerModal";
import { NeptuneMark } from "../components/NeptuneMark";
import { env } from "../config/env";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useSession } from "../providers/SessionProvider";
import { type ConnexioTheme, useAppTheme } from "../providers/ThemeProvider";
import { ApiError } from "../services/api/httpClient";
import { WireValidationError } from "../services/api/wire";
import { colors, gradients, radii, spacing, typography } from "../theme";

function getSignInErrorMessage(error: unknown): string {
  if (error instanceof WireValidationError) return "Le profil retourné par Neptune est invalide. Connexion refusée par sécurité.";
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) return "Le service Neptune est temporairement indisponible. Réessayez dans quelques instants.";
    if (error.status === 408) return "La connexion a expiré. Vérifiez votre réseau puis réessayez.";
    if (error.status === 429) return "Trop de tentatives. Patientez avant de réessayer.";
    if (error.status === 400 || error.status === 401 || error.status === 403) return "Adresse email ou mot de passe Neptune incorrect.";
  }
  return error instanceof Error ? error.message : "Connexion impossible. Réessayez avec vos identifiants Neptune.";
}

export default function SignInScreenV19() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { uiLanguage } = useAppLanguage();
  const { loginWithNeptune, exchangeOneTimeCode } = useSession();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const submit = async () => {
    const cleanEmail = email.trim();
    if (submittingRef.current || !cleanEmail || !password || !termsAccepted) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await loginWithNeptune(cleanEmail, password);
      router.replace("/(tabs)/messages");
    } catch (caught) {
      setError(getSignInErrorMessage(caught));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const enterDemo = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await exchangeOneTimeCode("DEMO-CONNEXIO");
      router.replace("/(tabs)/messages");
    } catch (caught) {
      setError(getSignInErrorMessage(caught));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const loginDisabled = loading || !email.trim() || !password || !termsAccepted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={theme.pageGradient} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.shell}>
            <View style={styles.topBar}>
              <View style={styles.brandCompact}>
                <NeptuneMark size={48} />
                <View>
                  <Text style={styles.brandName}>CONNEXIO</Text>
                  <Text style={styles.brandSignature}>by Neptune</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Changer la langue de Connexio"
                onPress={() => setLanguageOpen(true)}
                style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}
              >
                <Ionicons name="language-outline" size={20} color={theme.pageText} />
                <Text style={styles.languageCode}>{uiLanguage.toLocaleUpperCase()}</Text>
                <Ionicons name="chevron-down" size={15} color={theme.pageTextMuted} />
              </Pressable>
            </View>

            <View style={styles.intro}>
              <Text accessibilityRole="header" style={styles.title}>Se connecter avec Neptune</Text>
              <Text style={styles.description}>Retrouvez votre réseau, vos conversations et les opportunités Neptune avec le même compte que Neptune Business.</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>Adresse email Neptune</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}><Ionicons name="mail-outline" size={19} color={theme.pageTextMuted} /></View>
                <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" accessibilityLabel="Adresse email Neptune" placeholder="vous@entreprise.fr" placeholderTextColor={theme.pageTextMuted} style={styles.input} returnKeyType="next" />
              </View>

              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Mot de passe Neptune</Text>
              </View>
              <View style={styles.inputWrap}>
                <View style={styles.inputIcon}><Ionicons name="lock-closed-outline" size={19} color={theme.pageTextMuted} /></View>
                <TextInput value={password} onChangeText={setPassword} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" secureTextEntry={!passwordVisible} accessibilityLabel="Mot de passe Neptune" placeholder="Votre mot de passe" placeholderTextColor={theme.pageTextMuted} style={styles.input} returnKeyType="go" onSubmitEditing={() => void submit()} />
                <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"} onPress={() => setPasswordVisible((value) => !value)} style={styles.eyeButton}>
                  <Ionicons name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={20} color={theme.pageTextMuted} />
                </Pressable>
              </View>

              <Pressable accessibilityRole="checkbox" accessibilityLabel="Accepter les conditions d’utilisation" accessibilityState={{ checked: termsAccepted }} onPress={() => setTermsAccepted((value) => !value)} style={styles.termsRow}>
                <View style={[styles.termsCheck, termsAccepted && styles.termsCheckSelected]}>{termsAccepted ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}</View>
                <Text style={styles.termsText}>J’accepte les règles d’utilisation de Connexio et les conditions Neptune.</Text>
              </Pressable>

              <Pressable accessibilityRole="link" accessibilityLabel="Lire les conditions d’utilisation Neptune" onPress={() => void Linking.openURL(env.termsUrl)} style={styles.inlineLink}><Text style={styles.inlineLinkText}>Lire les conditions d’utilisation</Text></Pressable>

              {error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={19} color={theme.danger} /><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text></View> : null}

              <Pressable accessibilityRole="button" accessibilityLabel="Se connecter avec Neptune" accessibilityState={{ disabled: loginDisabled, busy: loading }} disabled={loginDisabled} onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loginDisabled && styles.disabled]}>
                <LinearGradient colors={gradients.primary} style={styles.primaryGradient}>
                  {loading ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="log-in-outline" size={21} color={colors.white} /><Text style={styles.primaryText}>Se connecter avec Neptune</Text></>}
                </LinearGradient>
              </Pressable>
            </View>

            <View style={styles.registerCard}>
              <View style={styles.registerIcon}><Ionicons name="person-add-outline" size={22} color={theme.orange} /></View>
              <View style={styles.registerCopy}>
                <Text style={styles.registerTitle}>Pas encore de compte Neptune ?</Text>
                <Text style={styles.registerText}>Créez votre compte Neptune Business puis revenez ici.</Text>
              </View>
              <Pressable accessibilityRole="link" accessibilityLabel="Créer un compte Neptune" onPress={() => void Linking.openURL(`${env.businessWebBaseUrl.replace(/\/$/, "")}/register`)} style={styles.registerButton}><Text style={styles.registerButtonText}>Créer</Text></Pressable>
            </View>

            {env.mockMode ? <Pressable accessibilityRole="button" accessibilityLabel="Entrer dans la démonstration Connexio" disabled={loading} onPress={() => void enterDemo()} style={({ pressed }) => [styles.demoButton, pressed && styles.pressed, loading && styles.disabled]}><Ionicons name="sparkles-outline" size={19} color={theme.pageText} /><Text style={styles.demoText}>Entrer en démonstration</Text></Pressable> : null}

            <View style={styles.securityNote}><Ionicons name="shield-checkmark-outline" size={18} color={theme.success} /><Text style={styles.securityText}>Votre mot de passe reste géré par Neptune et n’est jamais conservé dans Connexio.</Text></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <LanguagePickerModal visible={languageOpen} onClose={() => setLanguageOpen(false)} />
    </SafeAreaView>
  );
}

const createStyles = (theme: ConnexioTheme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.pageBackground },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  shell: { width: "100%", maxWidth: 520, alignSelf: "center" },
  topBar: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brandCompact: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandName: { color: theme.pageText, fontSize: 18, lineHeight: 21, fontWeight: "900", letterSpacing: 1.4 },
  brandSignature: { color: theme.orange, fontSize: 10, fontWeight: "900", marginTop: 1 },
  languageButton: { minWidth: 78, minHeight: 48, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  languageCode: { color: theme.pageText, fontSize: 13, fontWeight: "900" },
  intro: { marginTop: spacing.xl, marginBottom: spacing.lg },
  title: { ...typography.display, color: theme.pageText },
  description: { ...typography.body, color: theme.pageTextSecondary, marginTop: 8, maxWidth: 470 },
  formCard: { padding: spacing.md, borderRadius: 26, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface },
  label: { color: theme.pageTextSecondary, fontSize: 12, fontWeight: "900", marginBottom: 7 },
  passwordLabelRow: { marginTop: 14 },
  inputWrap: { minHeight: 56, borderRadius: radii.lg, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.inputBackground, flexDirection: "row", alignItems: "center" },
  inputIcon: { width: 46, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minWidth: 0, minHeight: 54, color: theme.pageText, ...typography.body },
  eyeButton: { width: 48, height: 54, alignItems: "center", justifyContent: "center" },
  termsRow: { minHeight: 52, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  termsCheck: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: theme.pageTextMuted, alignItems: "center", justifyContent: "center" },
  termsCheckSelected: { borderColor: theme.accent, backgroundColor: theme.accent },
  termsText: { flex: 1, color: theme.pageTextSecondary, fontSize: 13, lineHeight: 19 },
  inlineLink: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingRight: 10 },
  inlineLinkText: { color: theme.orange, fontSize: 13, fontWeight: "900" },
  errorBox: { marginTop: 8, padding: 10, borderRadius: 14, backgroundColor: theme.dangerSoft, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  error: { flex: 1, color: theme.danger, ...typography.bodySmall },
  primaryButton: { minHeight: 56, marginTop: 10, borderRadius: 18, overflow: "hidden" },
  primaryGradient: { minHeight: 56, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: colors.white, fontWeight: "900", fontSize: 16 },
  registerCard: { minHeight: 82, marginTop: 12, padding: 11, borderRadius: 20, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, flexDirection: "row", alignItems: "center", gap: 10 },
  registerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: theme.orangeSoft, alignItems: "center", justifyContent: "center" },
  registerCopy: { flex: 1, minWidth: 0 },
  registerTitle: { color: theme.pageText, fontSize: 13, fontWeight: "900" },
  registerText: { color: theme.pageTextMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  registerButton: { minWidth: 58, minHeight: 48, borderRadius: 15, backgroundColor: theme.surfaceStrong, alignItems: "center", justifyContent: "center", paddingHorizontal: 9 },
  registerButtonText: { color: theme.pageText, fontSize: 12, fontWeight: "900" },
  demoButton: { minHeight: 52, marginTop: 10, borderRadius: 17, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  demoText: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  securityNote: { marginTop: 14, flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4 },
  securityText: { flex: 1, color: theme.pageTextMuted, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.988 }] },
  disabled: { opacity: 0.48 }
});
