import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

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

  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradients.primary} style={styles.logo}>
        <Text style={styles.logoText}>N</Text>
      </LinearGradient>
      <Text accessibilityRole="header" style={styles.title}>
        Connexion à Connexio
      </Text>
      <Text style={styles.description}>
        Utilisez le code à usage unique généré depuis votre compte Neptune Business.
      </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.navy
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg
  },
  logoText: { color: colors.white, fontSize: 40, fontWeight: "900" },
  title: { ...typography.display, color: colors.white },
  description: {
    ...typography.body,
    color: colors.whiteMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.lg
  },
  input: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    color: colors.text,
    paddingHorizontal: spacing.md,
    ...typography.body
  },
  error: { color: "#FFD7DB", marginTop: spacing.sm, ...typography.bodySmall },
  button: {
    minHeight: 52,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  buttonText: { color: colors.white, fontWeight: "900", fontSize: 16 },
  pressed: { transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.48 }
});
