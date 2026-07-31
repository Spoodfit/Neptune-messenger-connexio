import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients, radii } from "../theme";
import type { NeptuneMapProps } from "./NeptuneMap.types";

const POSITIONS = [
  { left: "18%", top: "22%" },
  { left: "38%", top: "55%" },
  { left: "59%", top: "68%" },
  { left: "76%", top: "35%" }
] as const;

export default function NeptuneMap({
  moments,
  selectedMemberId,
  onSelectMember
}: NeptuneMapProps) {
  return (
    <LinearGradient colors={["#071A38", "#061027", "#020713"]} style={styles.map}>
      <View style={[styles.route, styles.routeOne]} />
      <View style={[styles.route, styles.routeTwo]} />
      <View style={[styles.route, styles.routeThree]} />
      <Text style={[styles.city, { left: "10%", top: "12%" }]}>TOULOUSE</Text>
      <Text style={[styles.city, { left: "29%", top: "47%" }]}>CARCASSONNE</Text>
      <Text style={[styles.city, { left: "52%", top: "79%" }]}>NARBONNE</Text>
      <Text style={[styles.city, { left: "66%", top: "25%" }]}>MONTPELLIER</Text>

      {moments.map((moment, index) => {
        const selected = moment.member.id === selectedMemberId;
        const position = POSITIONS[index % POSITIONS.length] ?? POSITIONS[0];
        return (
          <Pressable
            key={moment.member.id}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir les publications de ${moment.member.name}`}
            onPress={() => onSelectMember(moment.member.id)}
            style={[styles.markerTouch, position]}
          >
            {moment.recentPostIds.length > 0 ? (
              <View style={[styles.pulse, selected && styles.pulseSelected]} />
            ) : null}
            <LinearGradient
              colors={gradients.primaryWarm}
              style={[styles.marker, selected && styles.markerSelected]}
            >
              <View style={styles.markerInner}>
                <Text style={styles.initials}>{moment.member.initials}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Me localiser"
        onPress={() => undefined}
        style={styles.locationButton}
      >
        <Ionicons name="locate" size={21} color={colors.text} />
      </Pressable>

      {__DEV__ ? (
        <View style={styles.devNotice}>
          <Ionicons name="construct-outline" size={14} color={colors.orange} />
          <Text style={styles.devText}>
            Adaptateur natif à remplacer par react-native-maps ou Expo Maps.
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    minHeight: 420,
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative"
  },
  route: { position: "absolute", height: 2, borderRadius: 2, backgroundColor: "rgba(24,168,255,0.20)" },
  routeOne: { width: "70%", left: "8%", top: "42%", transform: [{ rotate: "18deg" }] },
  routeTwo: { width: "54%", left: "35%", top: "53%", transform: [{ rotate: "-28deg" }] },
  routeThree: { width: "48%", left: "23%", top: "66%", transform: [{ rotate: "6deg" }] },
  city: { position: "absolute", color: "rgba(174,184,210,0.23)", fontSize: 10, fontWeight: "900" },
  markerTouch: { position: "absolute", width: 64, height: 64, marginLeft: -32, marginTop: -32, alignItems: "center", justifyContent: "center" },
  pulse: { position: "absolute", inset: 3, borderRadius: 32, borderWidth: 2, borderColor: "rgba(0,114,255,0.42)" },
  pulseSelected: { borderColor: colors.orange, transform: [{ scale: 1.08 }] },
  marker: { width: 48, height: 48, borderRadius: 17, padding: 2 },
  markerSelected: { transform: [{ scale: 1.12 }] },
  markerInner: { flex: 1, borderRadius: 15, borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  initials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  locationButton: { position: "absolute", top: 12, right: 12, width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  devNotice: { position: "absolute", left: 12, right: 66, top: 12, minHeight: 44, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(8,18,38,0.94)", flexDirection: "row", alignItems: "center", gap: 7 },
  devText: { color: colors.textMuted, fontSize: 9, fontWeight: "700", flex: 1 }
});
