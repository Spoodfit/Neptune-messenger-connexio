from pathlib import Path

wire = Path("src/services/api/wireExtensions.ts")
text = wire.read_text(encoding="utf-8")
old = '    allowMultiple: first(value, "allowMultiple", "allow_multiple", "multiple") === true,'
new = '    allowMultiple: first(value, "allowMultiple", "allow_multiple", "multiple") !== false,'
if old not in text:
    raise RuntimeError("allowMultiple marker missing")
wire.write_text(text.replace(old, new), encoding="utf-8")

chat = Path("app/chat/[id].tsx")
text = chat.read_text(encoding="utf-8")
start = text.index("  const votePoll = async (message: ChatMessage, optionId: string) => {")
end = text.index("\n\n  const connectionLabel", start)
vote = '''  const votePoll = async (message: ChatMessage, optionId: string) => {
    if (!message.poll) return;
    const currentPoll = pollOverrides[message.id] ?? message.poll;
    const optimisticPoll = updateLocalPoll(currentPoll, optionId);
    const active = Boolean(
      optimisticPoll.options.find((option) => option.id === optionId)
        ?.votedByCurrentUser
    );

    setPollOverrides((previous) => ({
      ...previous,
      [message.id]: optimisticPoll
    }));

    if (!messagingApi || message.id.startsWith("local-")) return;

    try {
      const updatedMessage = await messagingApi.votePoll(
        message.id,
        optionId,
        active
      );
      if (!updatedMessage.poll) return;

      setPollOverrides((previous) => {
        if (previous[message.id] !== optimisticPoll) return previous;
        const serverPoll = updatedMessage.poll!;
        const optimisticById = new Map(
          optimisticPoll.options.map((option) => [option.id, option])
        );
        const options = serverPoll.options.map((serverOption) => {
          const optimisticOption = optimisticById.get(serverOption.id);
          if (!optimisticOption) return serverOption;
          const selected = optimisticOption.votedByCurrentUser;
          const serverSelected = serverOption.votedByCurrentUser;
          return {
            ...serverOption,
            votedByCurrentUser: selected,
            voteCount: Math.max(
              0,
              serverOption.voteCount +
                (selected && !serverSelected
                  ? 1
                  : !selected && serverSelected
                    ? -1
                    : 0)
            )
          };
        });
        const mergedPoll: MessagePoll = {
          ...serverPoll,
          allowMultiple: currentPoll.allowMultiple,
          options,
          totalVotes: options.reduce((sum, option) => sum + option.voteCount, 0)
        };
        return { ...previous, [message.id]: mergedPoll };
      });
    } catch (error) {
      setPollOverrides((previous) =>
        previous[message.id] === optimisticPoll
          ? { ...previous, [message.id]: currentPoll }
          : previous
      );
      Alert.alert(
        "Vote impossible",
        error instanceof Error
          ? error.message
          : "Le vote n’a pas été enregistré."
      );
    }
  };'''
chat.write_text(text[:start] + vote + text[end:], encoding="utf-8")

recorder = Path("src/components/InlineVoiceRecorder.tsx")
text = recorder.read_text(encoding="utf-8")
text = text.replace("Array.from({ length: 24 }", "Array.from({ length: 38 }")
text = text.replace(
    '''  shell: {
    minHeight: 58,''',
    '''  shell: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 58,'''
)
text = text.replace(
    '  recordingContent: { flex: 1, minWidth: 0 },',
    '''  recordingContent: {
    flex: 1,
    minWidth: 0,
    alignSelf: "stretch",
    justifyContent: "center"
  },'''
)
text = text.replace(
    '''  waveform: {
    height: 31,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    overflow: "hidden"
  },''',
    '''  waveform: {
    width: "100%",
    height: 31,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden"
  },'''
)
recorder.write_text(text, encoding="utf-8")
