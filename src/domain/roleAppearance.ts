import type { CanonicalUserRole, UserRole } from "../types/messaging";
import { normalizeUserRole, ROLE_LABELS } from "./roles";

export interface RoleAppearance {
  label: string;
  shortLabel: string;
  background: string;
  border: string;
  foreground: string;
  ringColors: readonly string[];
  glowColor: string;
}

export const ROLE_APPEARANCE: Record<CanonicalUserRole, RoleAppearance> = {
  free: {
    label: ROLE_LABELS.free,
    shortLabel: "Free",
    background: "#0F1126",
    border: "#2A2E42",
    foreground: "#99A1AF",
    ringColors: ["#5F6A7D", "#A6AFBF"],
    glowColor: "#7C8798"
  },
  triton: {
    label: ROLE_LABELS.triton,
    shortLabel: "Triton",
    background: "#081333",
    border: "#133372",
    foreground: "#1E61FE",
    ringColors: ["#00D4FF", "#1E61FE", "#6B4FEA"],
    glowColor: "#1E61FE"
  },
  moussaillon: {
    label: ROLE_LABELS.moussaillon,
    shortLabel: "Moussaillon",
    background: "#150D33",
    border: "#431E73",
    foreground: "#C27AFF",
    ringColors: ["#4D8CFF", "#8B5CF6", "#D36CFF"],
    glowColor: "#8B5CF6"
  },
  legende: {
    label: ROLE_LABELS.legende,
    shortLabel: "Légende",
    background: "#1D1819",
    border: "#5C4612",
    foreground: "#FDC700",
    ringColors: ["#FFD84D", "#FF9F1C", "#FF6A3D"],
    glowColor: "#FFB020"
  },
  capitaine: {
    label: ROLE_LABELS.capitaine,
    shortLabel: "Capitaine",
    background: "#1F1019",
    border: "#632A12",
    foreground: "#FF8904",
    ringColors: ["#FFB347", "#FF7A2F", "#FF4D8D"],
    glowColor: "#FF7A2F"
  },
  amiral: {
    label: ROLE_LABELS.amiral,
    shortLabel: "Amiral",
    background: "#0E0F33",
    border: "#272771",
    foreground: "#7C86FF",
    ringColors: ["#7C5CFF", "#3E7BFA", "#00C2FF"],
    glowColor: "#6B4FEA"
  },
  allie: {
    label: ROLE_LABELS.allie,
    shortLabel: "Allié",
    background: "#051925",
    border: "#034A40",
    foreground: "#00D492",
    ringColors: ["#00D492", "#00C6D7", "#4D8CFF"],
    glowColor: "#00D492"
  },
  visionnaire: {
    label: ROLE_LABELS.visionnaire,
    shortLabel: "Visionnaire",
    background: "#150D33",
    border: "#431E73",
    foreground: "#C27AFF",
    ringColors: ["#00D8FF", "#386BFF", "#7C4DFF", "#D53CFF", "#FF4D91", "#FFB347", "#59F2B0"],
    glowColor: "#A44CFF"
  },
  admin: {
    label: ROLE_LABELS.admin,
    shortLabel: "Admin",
    background: "#150D33",
    border: "#431E73",
    foreground: "#FFFFFF",
    ringColors: ["#00D8FF", "#386BFF", "#7C4DFF", "#D53CFF", "#FF4D91", "#FFB347", "#59F2B0"],
    glowColor: "#A44CFF"
  }
};

export function getRoleAppearance(role: UserRole): RoleAppearance {
  return ROLE_APPEARANCE[normalizeUserRole(role)];
}
