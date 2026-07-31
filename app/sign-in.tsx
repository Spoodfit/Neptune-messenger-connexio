import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
    return "La réponse du serveur Neptune est invalide. Connexion refusée par sécurité.";
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
      return "Code invalide, expiré ou déjà utilisé.";
    }
  }
  return "Connexion impossible. Réessayez sans réutiliser un ancien code.";
}

export default function SignInScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { exchangeOneTimeCode } = useSession();
  const [code, setCode] = useState(params.code ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const processedDeepLinkCodeRef = useRef<string | null>(null);

  const submit = useCallback(
    async (value: string) => {
      const cleanCode = value.trim();
      if (submittingRef.current || !cleanCode) return;
      submittingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        await exchangeOneTimeCode(cleanCode);
        router.replace("/(tabs)/messages");
      } catch (caught) {
        setError(getSignInErrorMessage(caught));
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [exchangeOneTimeCode]
  );

  useEffect(() => {
    const deepLinkCode = params.code?.trim();
    if (!deepLinkCode || processedDeepLinkCodeRef.current === deepLinkCode) return;
    processedDeepLinkCodeRef.current = deepLinkCode;
    setCode(deepLinkCode);
    void submit(deepLinkCode);
  }, [params.code, submit]);

  const enterDemo = () => void submit("DEMO-CONNEXIO");

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={gradients.screen} style={StyleSheet.absoluteFillObject} />
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
              Retrouver votre réseau
            </Text>
            <Text style={styles.description}>
              Connectez-vous avec le code à usage unique généré depuis votre compte Neptune Business.
            </Text>

            {env.mockMode ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Entrer dans la démonstration Connexio"
                disabled={loading}
                onPress={enterDemo}
                style={({ pressed }) => [
                  styles.demoButton,
                  pressed && styles.pressed,
                  loading && styles.disabled
                ]}
              >
                <LinearGradient colors={gradients.primary} style={styles.demoGradient}>
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={20} color={colors.white} />
                      <Text style={styles.demoText}>Entrer en démonstration</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            ) : null}

            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>
                {env.mockMode ? "ou tester le parcours code" : "code Neptune"}
              </Text>
              <View style={styles.separatorLine} />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="key-outline" size={19} color={colors.textMuted} />
              <TextInput
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                accessibilityLabel="Code de connexion Neptune"
                accessibilityHint="Ce code est à usage unique et expire rapidement"
                placeholder="Code de connexion"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                returnKeyType="go"
                onSubmitEditing={() => void submit(code)}
              />
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
              accessibilityLabel="Se connecter à Connexio"
              accessibilityState={{ disabled: loading || !code.trim(), busy: loading }}
              disabled={loading || !code.trim()}
              onPress={() => void submit(code)}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
                (loading || !code.trim()) && styles.disabled
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </Pressable>

            <View style={styles.links}>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push("/access-help")}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Je n’ai pas de code</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push("/privacy")}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Confidentialité</Text>
              </Pressable>
            </View>

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
              <Text style={styles.securityText}>
                Aucun mot de passe Neptune n’est saisi dans Connexio. Le code doit être court, à usage unique et lié à l’appareil.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  form: { width: "100%", maxWidth: 520, alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: spacing.xl },
  brandText: { minWidth: 0 },
  brandName: { color: colors.text, fontSize: 24, lineHeight: 27, fontWeight: "950", letterSpacing: 1.7 },
  brandSignature: { color: colors.orange, fontSize: 11, fontWeight: "800", marginTop: 1 },
  title: { ...typography.display, color: colors.white },
  description: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  demoButton: { minHeight: 54, borderRadius: 18, overflow: "hidden" },
  demoGradient: { minHeight: 54, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  demoText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  separator: { marginVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: 10 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.borderSoft },
  separatorText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
  inputWrap: { minHeight: 54, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 52, color: colors.text, ...typography.body },
  error: { color: colors.danger, marginTop: spacing.sm, ...typography.bodySmall },
  button: { minHeight: 52, marginTop: spacing.md, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  buttonText: { color: colors.white, fontWeight: "900", fontSize: 16 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  disabled: { opacity: 0.48 },
  links: { marginTop: spacing.md, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14 },
  linkButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
  linkText: { color: colors.orange, fontSize: 11, fontWeight: "800" },
  securityNote: { marginTop: spacing.lg, padding: 12, borderRadius: 16, backgroundColor: colors.successSoft, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  securityText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 }
});
