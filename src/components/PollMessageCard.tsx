import { Ionicons } from "@expo/vector-icons";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { colors } from "../theme";
import type { MessagePoll, PollVoter } from "../types/messaging";
import { StatusAvatar } from "./StatusAvatar";

interface PollMessageCardProps {
  poll: MessagePoll;
  onVote: (optionId: string) => void | Promise<void>;
}

const MAX_VISIBLE_VOTERS = 6;

function VoterStack({ voters }: { voters: readonly PollVoter[] }) {
  const visible = voters.slice(0, MAX_VISIBLE_VOTERS);
  const remaining = Math.max(0, voters.length - visible.length);

  if (voters.length === 0) return null;

  return (
    <View
      accessible
      accessibilityLabel={`${voters.length} personne${voters.length > 1 ? "s" : ""} a voté pour cette réponse`}
      style={styles.voterStack}
    >
      {visible.map((voter, index) => (
        <View
          key={voter.id}
          style={{
            marginLeft: index === 0 ? 0 : -7,
            zIndex: visible.length - index
          }}
        >
          <StatusAvatar user={voter} size={20} ringWidth={1.5} accessible={false} />
        </View>
      ))}
      {remaining > 0 ? (
        <View style={[styles.voterAvatar, styles.remainingAvatar, { marginLeft: -7 }]}>
          <Text style={styles.remainingText}>+{remaining}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function PollMessageCard({ poll, onVote }: PollMessageCardProps) {
  const closed =
    Boolean(poll.closedAt) ||
    (poll.closesAt ? new Date(poll.closesAt).getTime() <= Date.now() : false);
  const maximum = Math.max(1, ...poll.options.map((option) => option.voteCount));
  const totalVoters =
    poll.totalVoters ??
    new Set(poll.options.flatMap((option) => option.voterIds ?? [])).size;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.icon}>
          <Ionicons name="stats-chart" size={18} color={colors.orange} />
        </View>
        <View style={styles.titleContent}>
          <Text style={styles.question}>{poll.question}</Text>
          <Text style={styles.meta}>
            {totalVoters > 0
              ? `${totalVoters} participant${totalVoters > 1 ? "s" : ""}`
              : `${poll.totalVotes} vote${poll.totalVotes > 1 ? "s" : ""}`}
            {poll.allowMultiple ? " · plusieurs réponses possibles" : ""}
            {poll.anonymous ? " · anonyme" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.options}>
        {poll.options.map((option) => {
          const ratio = option.voteCount / maximum;
          const voters = poll.anonymous ? [] : option.voters ?? [];
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
              <View style={styles.optionMain}>
                <View
                  style={[
                    styles.choiceMark,
                    poll.allowMultiple && styles.multipleChoiceMark
                  ]}
                >
                  {option.votedByCurrentUser ? (
                    <Ionicons name="checkmark" size={15} color={colors.white} />
                  ) : null}
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionCount}>{option.voteCount}</Text>
              </View>
              {voters.length > 0 ? (
                <View style={styles.voterLine}>
                  <VoterStack voters={voters} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {closed
            ? "Sondage terminé"
            : poll.allowMultiple
              ? "Sélectionnez toutes les réponses qui vous conviennent"
              : "Sélectionnez une réponse"}
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
    gap: 8
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
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900"
  },
  meta: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 12,
    marginTop: 3,
    fontWeight: "700"
  },
  options: { width: "100%", minWidth: 0, gap: 8 },
  option: {
    width: "100%",
    minWidth: 0,
    minHeight: 48,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: "rgba(2,7,19,0.22)",
    justifyContent: "center",
    gap: 8
  },
  optionActive: { borderColor: colors.violet },
  progress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(107,79,234,0.18)"
  },
  optionMain: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  choiceMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  multipleChoiceMark: { borderRadius: 7 },
  optionLabel: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800"
  },
  optionCount: {
    flexShrink: 0,
    color: colors.text,
    fontSize: 11,
    fontWeight: "900"
  },
  voterLine: {
    minHeight: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingRight: 1
  },
  voterStack: { flexDirection: "row", alignItems: "center" },
  voterAvatar: {
    width: 20,
    height: 20,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.navyLight,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  voterImage: { width: "100%", height: "100%" },
  voterInitials: { color: colors.text, fontSize: 11, fontWeight: "900" },
  remainingAvatar: { backgroundColor: colors.surfaceStrong },
  remainingText: { color: colors.textSecondary, fontSize: 11, fontWeight: "900" },
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
    fontSize: 11,
    fontWeight: "700"
  },
  eventLink: {
    minHeight: 48,
    maxWidth: "100%",
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8
  },
  eventLinkText: {
    flexShrink: 1,
    color: colors.orange,
    fontSize: 11,
    fontWeight: "900"
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.993 }] }
});
