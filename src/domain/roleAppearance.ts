import type { CanonicalUserRole, UserRole } from "../types/messaging";
import { normalizeUserRole, ROLE_LABELS } from "./roles";

export interface RoleAppearance {
  label: string;
  shortLabel: string;
  background: string;
  border: string;
  foreground: string;
  ringGradient: readonly [string, string, ...string[]];
  glow: string;
}

export const ROLE_APPEARANCE: Record<CanonicalUserRole, RoleAppearance> = {
  free: {
    label: ROLE_LABELS.free,
    shortLabel: "Free",
    background: "#0F1126",
    border: "#2A2E42",
    foreground: "#99A1AF",
    ringGradient: ["#566176", "#B2BED5", "#687386"],
    glow: "#8B96AA"
  },
  triton: {
    label: ROLE_LABELS.triton,
    shortLabel: "Triton",
    background: "#081333",
    border: "#133372",
    foreground: "#1E61FE",
    ringGradient: ["#0048BA", "#00B7FF", "#725CFF"],
    glow: "#2D7BFF"
  },
  moussaillon: {
    label: ROLE_LABELS.moussaillon,
    shortLabel: "Moussaillon",
    background: "#150D33",
    border: "#431E73",
    foreground: "#C27AFF",
    ringGradient: ["#6B4FEA", "#D183FF", "#486CFF"],
    glow: "#A966FF"
  },
  legende: {
    label: ROLE_LABELS.legende,
    shortLabel: "Légende",
    background: "#1D1819",
    border: "#5C4612",
    foreground: "#FDC700",
    ringGradient: ["#F4B183", "#FFD84F", "#FF8A4C"],
    glow: "#FDC700"
  },
  capitaine: {
    label: ROLE_LABELS.capitaine,
    shortLabel: "Capitaine",
    background: "#1F1019",
    border: "#632A12",
    foreground: "#FF8904",
    ringGradient: ["#FF6A3D", "#FFB13B", "#D55CFF"],
    glow: "#FF8904"
  },
  amiral: {
    label: ROLE_LABELS.amiral,
    shortLabel: "Amiral",
    background: "#0E0F33",
    border: "#272771",
    foreground: "#7C86FF",
    ringGradient: ["#5262FF", "#68D8FF", "#A86CFF"],
    glow: "#7C86FF"
  },
  allie: {
    label: ROLE_LABELS.allie,
    shortLabel: "Allié",
    background: "#051925",
    border: "#034A40",
    foreground: "#00D492",
    ringGradient: ["#00A987", "#3BE7B3", "#28A9E0"],
    glow: "#00D492"
  },
  visionnaire: {
    label: ROLE_LABELS.visionnaire,
    shortLabel: "Visionnaire",
    background: "#150D33",
    border: "#431E73",
    foreground: "#C27AFF",
    ringGradient: ["#7C3AED", "#21B9FF", "#64D66E", "#F4B183", "#D55CFF", "#7C3AED"],
    glow: "#9E67FF"
  },
  admin: {
    label: ROLE_LABELS.admin,
    shortLabel: "Admin",
    background: "#150D33",
    border: "#431E73",
    foreground: "#FFFFFF",
    ringGradient: ["#FFFFFF", "#69D5FF", "#9D67FF", "#FFFFFF"],
    glow: "#C9B7FF"
  }
};

export function getRoleAppearance(role: UserRole): RoleAppearance {
  return ROLE_APPEARANCE[normalizeUserRole(role)];
}
