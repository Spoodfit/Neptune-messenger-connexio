from pathlib import Path

path = Path("src/components/MessageBubble.tsx")
text = path.read_text(encoding="utf-8")
text = text.replace(
    "            <Pressable\n    accessible={false}\n    onLongPress={() => setReactionOpen(true)}\n              delayLongPress={320}\n            >",
    "            <Pressable\n              accessible={false}\n              onLongPress={() => setReactionOpen(true)}\n              delayLongPress={320}\n            >"
)
start = text.index("            {showDetachedReactionButton ? (")
end = text.index("          {reactions.length > 0 ? (", start)
block = '''            {showDetachedReactionButton || reactionOpen ? (
              <View style={styles.reactionAnchor} pointerEvents="box-none">
                {reactionOpen ? (
                  <Animated.View
                    style={[
                      styles.reactionPicker,
                      message.isMine
                        ? styles.reactionPickerLeft
                        : styles.reactionPickerRight,
                      reactionStyle
                    ]}
                  >
                    {QUICK_REACTIONS.map((emoji) => (
                      <Pressable
                        key={emoji}
                        accessibilityRole="button"
                        accessibilityLabel={`Réagir avec ${emoji}`}
                        accessibilityState={{ selected: currentReaction === emoji }}
                        onPress={() => chooseReaction(emoji)}
                        style={styles.reactionChoiceTarget}
                      >
                        <View
                          style={[
                            styles.reactionChoiceVisual,
                            currentReaction === emoji && styles.reactionChoiceActive
                          ]}
                        >
                          <Text style={styles.reactionChoiceEmoji}>{emoji}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </Animated.View>
                ) : null}
                {showDetachedReactionButton ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ajouter une réaction"
                    onPress={() => setReactionOpen((value) => !value)}
                    style={styles.reactionAdd}
                  >
                    <View style={styles.reactionAddVisual}>
                      <Ionicons name="add" size={10} color={colors.textMuted} />
                    </View>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

'''
text = text[:start] + block + text[end:]
text = text.replace(
    '  bubbleStage: { maxWidth: "100%", position: "relative" },',
    '  bubbleStage: { maxWidth: "100%", position: "relative", overflow: "visible" },'
)
text = text.replace(
    '''  reactionPicker: {
    position: "absolute",
    left: 0,
    bottom: "100%",
    marginBottom: 7,''',
    '''  reactionAnchor: {
    position: "absolute",
    right: -8,
    bottom: -22,
    width: 44,
    height: 44,
    zIndex: 40,
    elevation: 18,
    overflow: "visible"
  },
  reactionPicker: {
    position: "absolute",
    top: 1,'''
)
text = text.replace(
    '  reactionPickerMine: { left: undefined, right: 0 },',
    '  reactionPickerLeft: { right: 38 },\n  reactionPickerRight: { left: 38 },'
)
text = text.replace(
    '''  reactionAdd: {
    position: "absolute",
    right: -8,
    bottom: -22,
    width: 44,''',
    '''  reactionAdd: {
    width: 44,'''
)
text = text.replace('  reactionAddMine: { right: -8 },\n  reactionAddOther: { right: -8 },\n', '')
text = text.replace('    transform: [{ translateX: 6 }]\n', '')
path.write_text(text, encoding="utf-8")
