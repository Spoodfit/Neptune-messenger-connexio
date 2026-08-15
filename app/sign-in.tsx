import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import {
  useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef,
  useState } from "react";
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

import { NeptuneMark } from "../src/components/NeptuneMark";
import { env } from "../src/config/env";
import { useSession } from "../src/providers/SessionProvider";
import { ApiError } from "../src/services/api/httpClient";
import { WireValidationError } from "../src/services/api/wire";
import { colors, gradients, radii, spacing, typography } from "../src/theme";

function getSignInErrorMessage(error: unknown): string {
  if (error instanceof WireValidationError) {
    return "Le profil retourné par Neptune est invalide. Connexion refusée par sécurité.";
  }
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) {
      return "Le service Neptune est temporairement indisponible. Réessayez dans quelques instants.";
    }
    if (error.status === 408) {
      return "La connexion a expiré. Vérifiez votre réseau puis réessayez.";
    }
    if (error.status === 429) {
      return "Trop de tentatives. Patientez avant de réessayer.";
    }
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return "Adresse email ou mot de passe Neptune incorrect.";
    }
  }
  return error instanceof Error
    ? error.message
    : "Connexion impossible. Réessayez avec vos identifiants Neptune.";
}

import { useAppTheme } from "@/providers/ThemeProvider";
export default function SignInScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { loginWithNeptune, exchangeOneTimeCode } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const submit = async () => {
    const cleanEmail = email.trim();
    if (
      submittingRef.current ||
      !cleanEmail ||
      !password ||
      !termsAccepted
    ) {
      return;
    }
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

  const openRegistration = () =>
    void Linking.openURL(
      `${env.businessWebBaseUrl.replace(/\/$/, "")}/register`
    );

  const openTerms = () => void Linking.openURL(env.termsUrl);

  const loginDisabled =
    loading || !email.trim() || !password || !termsAccepted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={theme.pageGradient} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.form}>
            <View style={styles.brandRow}>
              <NeptuneMark size={66} />
              <View style={styles.brandText}>
                <Text style={styles.brandName}>CONNEXIO</Text>
                <Text style={styles.brandSignature}>by Neptune</Text>
              </View>
            </View>

            <Text accessibilityRole="header" style={styles.title}>
              Se connecter avec Neptune
            </Text>
            <Text style={styles.description}>
              Utilisez la même adresse email et le même mot de passe que sur Neptune Business.
            </Text>

            <Text style={styles.label}>Adresse email Neptune</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={19} color={theme.pageTextMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                accessibilityLabel="Adresse email Neptune"
                placeholder="vous@entreprise.fr"
                placeholderTextColor={theme.pageTextMuted}
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            <Text style={styles.label}>Mot de passe Neptune</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={19} color={theme.pageTextMuted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                secureTextEntry={!passwordVisible}
                accessibilityLabel="Mot de passe Neptune"
                placeholder="Votre mot de passe"
                placeholderTextColor={theme.pageTextMuted}
                style={styles.input}
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  passwordVisible
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                onPress={() => setPasswordVisible((value) => !value)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.pageTextMuted}
                />
              </Pressable>
            </View>

            <View style={styles.termsCard}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Accepter les conditions d’utilisation"
                accessibilityState={{ checked: termsAccepted }}
                onPress={() => setTermsAccepted((value) => !value)}
                style={styles.termsCheckTarget}
              >
                <View
                  style={[
                    styles.termsCheck,
                    termsAccepted && styles.termsCheckSelected
                  ]}
                >
                  {termsAccepted ? (
                    <Ionicons name="checkmark" size={20} color={colors.white} />
                  ) : null}
                </View>
              </Pressable>
              <View style={styles.termsCopy}>
                <Text style={styles.termsText}>
                  Je confirme avoir lu et j’accepte les règles d’utilisation de Connexio avant d’envoyer ou de publier du contenu.
                </Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Lire les conditions d’utilisation Neptune"
                  onPress={openTerms}
                  style={styles.termsLink}
                >
                  <Text style={styles.termsLinkText}>
                    Lire les conditions d’utilisation
                  </Text>
                </Pressable>
              </View>
            </View>

            {error ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={styles.error}
              >
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Se connecter avec Neptune"
              accessibilityState={{
                disabled: loginDisabled,
                busy: loading
              }}
              disabled={loginDisabled}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
                loginDisabled && styles.disabled
              ]}
            >
              <LinearGradient colors={gradients.primary} style={styles.buttonGradient}>
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={21} color={colors.white} />
                    <Text style={styles.buttonText}>Se connecter avec Neptune</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.registerCard}>
              <View style={styles.registerIcon}>
                <Ionicons name="person-add-outline" size={21} color={theme.orange} />
              </View>
              <View style={styles.registerContent}>
                <Text style={styles.registerTitle}>Pas encore de compte Neptune ?</Text>
                <Text style={styles.registerText}>
                  Créez votre compte sur Neptune Business, puis revenez vous connecter ici.
                </Text>
              </View>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Créer un compte Neptune"
                onPress={openRegistration}
                style={styles.registerButton}
              >
                <Text style={styles.registerButtonText}>Créer</Text>
              </Pressable>
            </View>

            {env.mockMode ? (
              <>
                <View style={styles.separator}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>prévisualisation</Text>
                  <View style={styles.separatorLine} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Entrer dans la démonstration Connexio"
                  disabled={loading}
                  onPress={() => void enterDemo()}
                  style={({ pressed }) => [
                    styles.demoButton,
                    pressed && styles.pressed,
                    loading && styles.disabled
                  ]}
                >
                  <Ionicons name="sparkles" size={19} color={theme.pageText} />
                  <Text style={styles.demoText}>Entrer en démonstration</Text>
                </Pressable>
              </>
            ) : null}

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.success} />
              <Text style={styles.securityText}>
                La session est protégée par un cookie httpOnly Neptune. Le mot de passe n’est jamais conservé dans Connexio.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.pageBackground },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  form: { width: "100%", maxWidth: 520, alignSelf: "center" },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: spacing.xl
  },
  brandText: { minWidth: 0 },
  brandName: {
    color: theme.pageText,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: 1.7
  },
  brandSignature: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1
  },
  title: { ...typography.display, color: colors.white },
  description: {
    ...typography.body,
    color: theme.pageTextSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg
  },
  label: {
    color: theme.pageTextSecondary,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
    marginTop: 9
  },
  inputWrap: {
    minHeight: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    paddingLeft: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    color: theme.pageText,
    ...typography.body
  },
  eyeButton: {
    width: 48,
    height: 52,
    alignItems: "center",
    justifyContent: "center"
  },
  termsCard: {
    minHeight: 112,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  termsCheckTarget: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  termsCheck: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.pageTextMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  termsCheckSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  termsCopy: { flex: 1, minWidth: 0 },
  termsText: {
    color: theme.pageTextSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  termsLink: {
    alignSelf: "flex-start",
    minHeight: 48,
    justifyContent: "center",
    paddingRight: spacing.sm
  },
  termsLinkText: {
    color: theme.orange,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    textDecorationLine: "underline"
  },
  error: {
    color: theme.danger,
    marginTop: spacing.sm,
    ...typography.bodySmall
  },
  button: {
    minHeight: 54,
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    overflow: "hidden"
  },
  buttonGradient: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  buttonText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 16,
    textAlign: "center"
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  disabled: { opacity: 0.48 },
  registerCard: {
    minHeight: 78,
    marginTop: spacing.md,
    padding: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  registerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(244,177,131,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  registerContent: { flex: 1, minWidth: 0 },
  registerTitle: { color: theme.pageText, fontSize: 11, fontWeight: "900" },
  registerText: {
    color: theme.pageTextMuted,
    fontSize: 11,
    lineHeight: 13,
    marginTop: 3
  },
  registerButton: {
    minWidth: 58,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: theme.accentSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  registerButtonText: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: "900"
  },
  separator: {
    marginVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: theme.borderSoft },
  separatorText: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "700" },
  demoButton: {
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  demoText: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  securityNote: {
    marginTop: spacing.lg,
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.successSoft,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9
  },
  securityText: {
    ...typography.bodySmall,
    color: theme.pageTextSecondary,
    flex: 1
  }
});
