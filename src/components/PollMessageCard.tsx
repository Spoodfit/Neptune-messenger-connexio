import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import type { MessagePoll } from "../types/messaging";

interface PollMessageCardProps {
  poll: MessagePoll;
  onVote: (optionId: string) => void | Promise<void>;
}

export function PollMessageCard({ poll, onVote }: PollMessageCardProps) {
  const closed =
    Boolean(poll.closedAt) ||
    (poll.closesAt ? new Date(poll.closesAt).getTime() <= Date.now() : false);
  const maximum = Math.max(1, ...poll.options.map((option) => option.voteCount));

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.icon}>
          <Ionicons name="stats-chart" size={18} color={colors.orange} />
        </View>
        <View style={styles.titleContent}>
          <Text style={styles.question}>{poll.question}</Text>
          <Text style={styles.meta}>
            {poll.totalVotes} vote{poll.totalVotes > 1 ? "s" : ""}
            {poll.allowMultiple ? " · choix multiples" : ""}
            {poll.anonymous ? " · anonyme" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.options}>
        {poll.options.map((option) => {
          const ratio = option.voteCount / maximum;
          return (
            <Pressable
              key={option.id}
              accessibilityRole={poll.allowMultiple ? "checkbox" : "radio"}
              accessibilityState={{
                checked: option.votedByCurrentUser,
                disabled: closed
              }}
              disabled={closed}
              onPress={() => void onVote(option.id)}
              style={({ pressed }) => [
                styles.option,
                option.votedByCurrentUser && styles.optionActive,
                pressed && !closed && styles.pressed
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.progress,
                  {
                    width: `${Math.max(
                      option.voteCount > 0 ? 8 : 0,
                      ratio * 100
                    )}%`
                  }
                ]}
              />
              <View style={styles.choiceMark}>
                {option.votedByCurrentUser ? (
                  <Ionicons name="checkmark" size={15} color={colors.white} />
                ) : null}
              </View>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionCount}>{option.voteCount}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {closed ? "Sondage terminé" : "Touchez une réponse pour voter"}
        </Text>
        {poll.eventVoteUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Ouvrir le vote d’évènement Neptune"
            onPress={() => void Linking.openURL(poll.eventVoteUrl!)}
            style={styles.eventLink}
          >
            <Text style={styles.eventLinkText}>Voir dans Neptune</Text>
            <Ionicons name="open-outline" size={14} color={colors.orange} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", minWidth: 0, maxWidth: 420, gap: 9 },
  titleRow: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,177,131,0.14)"
  },
  titleContent: { flex: 1, minWidth: 0 },
  question: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900"
  },
  meta: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: 8.5,
    lineHeight: 12,
    marginTop: 3,
    fontWeight: "700"
  },
  options: { width: "100%", minWidth: 0, gap: 6 },
  option: {
    width: "100%",
    minWidth: 0,
    minHeight: 46,
    overflow: "hidden",
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: "rgba(2,7,19,0.22)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  optionActive: { borderColor: colors.violet },
  progress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(107,79,234,0.18)"
  },
  choiceMark: {
    width: 22,
    height: 22,
    borderRadius: 8,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  optionLabel: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "800"
  },
  optionCount: {
    flexShrink: 0,
    color: colors.text,
    fontSize: 10.5,
    fontWeight: "900"
  },
  footer: {
    width: "100%",
    minWidth: 0,
    minHeight: 30,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    columnGap: 8,
    rowGap: 2
  },
  footerText: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 90,
    color: colors.textMuted,
    fontSize: 8.5,
    fontWeight: "700"
  },
  eventLink: {
    minHeight: 44,
    maxWidth: "100%",
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4
  },
  eventLinkText: {
    flexShrink: 1,
    color: colors.orange,
    fontSize: 9,
    fontWeight: "900"
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.993 }] }
});
