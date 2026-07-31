import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useMemo, useState } from "react";
import { Alert, Pressable, Share, StyleSheet } from "react-native";

import { env } from "../config/env";
import { useSession } from "../providers/SessionProvider";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { colors } from "../theme";
import type { HighlightPost } from "../types/experience";

interface HighlightShareButtonProps {
  post: HighlightPost;
}

export function HighlightShareButton({ post }: HighlightShareButtonProps) {
  const { accessToken } = useSession();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = api
        ? await api.shareHighlight(post.id)
        : {
            url: Linking.createURL(`/highlight/${encodeURIComponent(post.id)}`),
            shareCount: post.shareCount + 1
          };
      await Share.share({
        title: `${post.author.name} sur Connexio`,
        message: `${post.body || "Temps fort Neptune"}\n${result.url}`,
        url: result.url
      });
    } catch (error) {
      Alert.alert(
        "Partage impossible",
        error instanceof Error ? error.message : "Réessayez ultérieurement."
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Partager la publication"
      accessibilityState={{ busy: sharing }}
      disabled={sharing}
      onPress={() => void share()}
      style={styles.button}
    >
      <Ionicons
        name={sharing ? "hourglass-outline" : "share-outline"}
        size={22}
        color={colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  }
});
