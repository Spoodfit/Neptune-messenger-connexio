import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Linking, Pressable, Text, View } from "react-native";

import { useReducedMotion } from "../hooks/useReducedMotion";
import { useAppTheme } from "../providers/ThemeProvider";
import { colors } from "../theme";
import type { MessagePoll, PollVoter } from "../types/messaging";
import { createPollStyles } from "./PollMessageCard.styles";
import { StatusAvatar } from "./StatusAvatar";

interface PollMessageCardProps {
  poll: MessagePoll;
  onVote: (optionId: string) => void | Promise<void>;
}

function VoterStack({ voters }: { voters: readonly PollVoter[] }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createPollStyles(theme), [theme]);
  const visible = voters.slice(0, 6);
  const remaining = Math.max(0, voters.length - visible.length);
  if (!voters.length) return null;
  return (
    <View accessible accessibilityLabel={`${voters.length} personne${voters.length > 1 ? "s" : ""} a voté`} style={styles.voters}>
      {visible.map((voter, index) => (
        <View key={voter.id} style={{ marginLeft: index ? -7 : 0, zIndex: visible.length - index }}>
          <StatusAvatar user={voter} size={20} ringWidth={1.5} accessible={false} />
        </View>
      ))}
      {remaining ? <View style={styles.remaining}><Text style={styles.remainingText}>+{remaining}</Text></View> : null}
    </View>
  );
}

function PollOption({ option, maximum, poll, closed, onVote }: {
  option: MessagePoll["options"][number];
  maximum: number;
  poll: MessagePoll;
  closed: boolean;
  onVote: PollMessageCardProps["onVote"];
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createPollStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const target = option.voteCount / maximum;
  const progress = useRef(new Animated.Value(target)).current;
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    Animated.timing(progress, { toValue: target, duration: reducedMotion ? 0 : 220, useNativeDriver: false }).start();
  }, [progress, reducedMotion, target]);

  const vote = async () => {
    if (closed || voting) return;
    setVoting(true);
    try { await onVote(option.id); } finally { setVoting(false); }
  };

  const voters = poll.anonymous ? [] : option.voters ?? [];
  return (
    <Pressable accessibilityRole={poll.allowMultiple ? "checkbox" : "radio"} accessibilityState={{ checked: option.votedByCurrentUser, disabled: closed || voting, busy: voting }} disabled={closed || voting} onPress={() => void vote()} style={({ pressed }) => [styles.option, option.votedByCurrentUser && styles.optionActive, pressed && styles.pressed, voting && styles.busy]}>
      <Animated.View pointerEvents="none" style={[styles.progress, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      <View style={styles.optionMain}>
        <View style={[styles.choice, poll.allowMultiple && styles.choiceMultiple, option.votedByCurrentUser && styles.choiceSelected]}>
          {option.votedByCurrentUser ? <Ionicons name="checkmark" size={15} color={colors.white} /> : null}
        </View>
        <Text style={styles.optionLabel}>{option.label}</Text>
        <Text style={styles.optionCount}>{voting ? "…" : option.voteCount}</Text>
      </View>
      {voters.length ? <View style={styles.voterLine}><VoterStack voters={voters} /></View> : null}
    </Pressable>
  );
}

export function PollMessageCard({ poll, onVote }: PollMessageCardProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createPollStyles(theme), [theme]);
  const closed = Boolean(poll.closedAt) || Boolean(poll.closesAt && new Date(poll.closesAt).getTime() <= Date.now());
  const maximum = Math.max(1, ...poll.options.map((option) => option.voteCount));
  const totalVoters = poll.totalVoters ?? new Set(poll.options.flatMap((option) => option.voterIds ?? [])).size;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.icon}><Ionicons name="stats-chart" size={18} color={theme.orange} /></View>
        <View style={styles.titleContent}>
          <Text style={styles.question}>{poll.question}</Text>
          <Text style={styles.meta}>{totalVoters > 0 ? `${totalVoters} participant${totalVoters > 1 ? "s" : ""}` : `${poll.totalVotes} vote${poll.totalVotes > 1 ? "s" : ""}`}{poll.allowMultiple ? " · plusieurs réponses possibles" : ""}{poll.anonymous ? " · anonyme" : ""}</Text>
        </View>
      </View>
      <View style={styles.options}>{poll.options.map((option) => <PollOption key={option.id} option={option} maximum={maximum} poll={poll} closed={closed} onVote={onVote} />)}</View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>{closed ? "Sondage terminé" : poll.allowMultiple ? "Sélectionnez toutes les réponses utiles" : "Sélectionnez une réponse"}</Text>
        {poll.eventVoteUrl ? <Pressable accessibilityRole="link" accessibilityLabel="Ouvrir le vote d’évènement Neptune" onPress={() => void Linking.openURL(poll.eventVoteUrl!)} style={styles.eventLink}><Text style={styles.eventLinkText}>Voir dans Neptune</Text><Ionicons name="open-outline" size={14} color={theme.orange} /></Pressable> : null}
      </View>
    </View>
  );
}
