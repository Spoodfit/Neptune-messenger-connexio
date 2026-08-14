import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeptuneMark } from "@/components/NeptuneMark";
import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const GITHUB_PAGES_ROOT = "/Neptune-messenger-connexio";

import { useAppTheme } from "@/providers/ThemeProvider";
export default function NotFoundScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { isAuthenticated, sessionReady } = useSession();

  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      !sessionReady ||
      typeof window === "undefined"
    ) {
      return;
    }

    const normalizedPath = window.location.pathname.replace(/\/+$/, "");
    if (normalizedPath !== GITHUB_PAGES_ROOT) return;

    const target = isAuthenticated ? "/(tabs)/messages" : "/sign-in";
    const redirectTimer = window.setTimeout(() => router.replace(target), 0);
    return () => window.clearTimeout(redirectTimer);
  }, [isAuthenticated, sessionReady]);

  return (
    <LinearGradient
      colors={theme.pageGradient}
      style={[
        styles.screen,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingLeft: insets.left + spacing.lg,
          paddingRight: insets.right + spacing.lg
        }
      ]}
    >
      <NeptuneMark size={76} />
      <View style={styles.iconWrap}>
        <Ionicons name="compass-outline" size={31} color={theme.orange} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Cette destination n’existe pas
      </Text>
      <Text style={styles.description}>
        Le lien est invalide, a expiré ou pointe vers un contenu auquel votre statut ne donne plus accès.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.replace(isAuthenticated ? "/(tabs)/messages" : "/sign-in")
        }
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>
          {isAuthenticated ? "Revenir aux messages" : "Ouvrir Connexio"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.canGoBack() && router.back()}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>Retour</Text>
      </Pressable>
    </LinearGradient>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 66, height: 66, marginTop: spacing.lg, borderRadius: 23, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading2, color: theme.pageText, textAlign: "center", marginTop: spacing.md },
  description: { ...typography.body, color: theme.pageTextMuted, textAlign: "center", maxWidth: 430, marginTop: 7 },
  primaryButton: { minHeight: 52, minWidth: 210, marginTop: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.white, fontWeight: "900" },
  secondaryButton: { minHeight: 48, minWidth: 100, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: theme.orange, fontSize: 14, fontWeight: "800" }
});
