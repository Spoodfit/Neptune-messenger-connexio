import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useSession } from "../src/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "../src/theme";

export default function SignInScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { exchangeOneTimeCode } = useSession();
  const [code, setCode] = useState(params.code ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (value = code) => {
    if (loading || !value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await exchangeOneTimeCode(value);
      router.replace("/(tabs)/messages");
    } catch {
      setError("Code invalide, expiré ou déjà utilisé.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.code) void submit(params.code);
    // Le code du lien profond n’est traité qu’une seule fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.code]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradients.primary} style={styles.logo}>
        <Text style={styles.logoText}>N</Text>
      </LinearGradient>
      <Text style={styles.title}>Connexion à Connexio</Text>
      <Text style={styles.description}>
        Utilisez le code à usage unique généré depuis votre compte Neptune Business.
      </Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Code de connexion Neptune"
        placeholder="Code de connexion"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Se connecter à Connexio"
        disabled={loading || !code.trim()}
        onPress={() => void submit()}
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
