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

type RoleVisual = Omit<RoleAppearance, "label" | "shortLabel">;

const ROLE_RING: Record<CanonicalUserRole, Pick<RoleVisual, "ringColors" | "glowColor">> = {
  free: { ringColors: ["#5F6A7D", "#A6AFBF"], glowColor: "#7C8798" },
  triton: { ringColors: ["#00D4FF", "#1E61FE", "#6B4FEA"], glowColor: "#1E61FE" },
  moussaillon: { ringColors: ["#4D8CFF", "#8B5CF6", "#D36CFF"], glowColor: "#8B5CF6" },
  legende: { ringColors: ["#FFD84D", "#FF9F1C", "#FF6A3D"], glowColor: "#FFB020" },
  capitaine: { ringColors: ["#FFB347", "#FF7A2F", "#FF4D8D"], glowColor: "#FF7A2F" },
  amiral: { ringColors: ["#7C5CFF", "#3E7BFA", "#00C2FF"], glowColor: "#6B4FEA" },
  allie: { ringColors: ["#00D492", "#00C6D7", "#4D8CFF"], glowColor: "#00D492" },
  visionnaire: { ringColors: ["#00D8FF", "#386BFF", "#7C4DFF", "#D53CFF", "#FF4D91", "#FFB347", "#59F2B0"], glowColor: "#A44CFF" },
  admin: { ringColors: ["#00D8FF", "#386BFF", "#7C4DFF", "#D53CFF", "#FF4D91", "#FFB347", "#59F2B0"], glowColor: "#A44CFF" }
};

const DARK_ROLE_SURFACE: Record<CanonicalUserRole, Pick<RoleVisual, "background" | "border" | "foreground">> = {
  free: { background: "#0F1126", border: "#2A2E42", foreground: "#99A1AF" },
  triton: { background: "#081333", border: "#133372", foreground: "#1E61FE" },
  moussaillon: { background: "#150D33", border: "#431E73", foreground: "#C27AFF" },
  legende: { background: "#1D1819", border: "#5C4612", foreground: "#FDC700" },
  capitaine: { background: "#1F1019", border: "#632A12", foreground: "#FF8904" },
  amiral: { background: "#0E0F33", border: "#272771", foreground: "#7C86FF" },
  allie: { background: "#051925", border: "#034A40", foreground: "#00D492" },
  visionnaire: { background: "#150D33", border: "#431E73", foreground: "#C27AFF" },
  admin: { background: "#150D33", border: "#431E73", foreground: "#FFFFFF" }
};

/*
 * Light mode gets its own opaque pastel surfaces. Reusing the dark badge
 * backgrounds produced black/navy chips on an otherwise light interface.
 */
const LIGHT_ROLE_SURFACE: Record<CanonicalUserRole, Pick<RoleVisual, "background" | "border" | "foreground">> = {
  free: { background: "#E6EBF1", border: "#A5B0BE", foreground: "#425267" },
  triton: { background: "#DDEBFF", border: "#79A8EE", foreground: "#0B4DA8" },
  moussaillon: { background: "#EEE6FC", border: "#B399E2", foreground: "#65409B" },
  legende: { background: "#FFF1C9", border: "#D9AF46", foreground: "#705000" },
  capitaine: { background: "#FFE7D8", border: "#E99A63", foreground: "#8C3E10" },
  amiral: { background: "#E5E8FF", border: "#929BE2", foreground: "#40499C" },
  allie: { background: "#DCF3EC", border: "#72C6B0", foreground: "#096552" },
  visionnaire: { background: "#F0E5FA", border: "#BE96DC", foreground: "#713991" },
  admin: { background: "#EAE7F6", border: "#A296CB", foreground: "#413B69" }
};

function buildAppearance(role: CanonicalUserRole, isLight: boolean): RoleAppearance {
  const surface = isLight ? LIGHT_ROLE_SURFACE[role] : DARK_ROLE_SURFACE[role];
  return {
    label: ROLE_LABELS[role],
    shortLabel: role === "legende" ? "Légende" : role === "allie" ? "Allié" : role.charAt(0).toUpperCase() + role.slice(1),
    ...surface,
    ...ROLE_RING[role]
  };
}

export const ROLE_APPEARANCE: Record<CanonicalUserRole, RoleAppearance> = Object.fromEntries(
  (Object.keys(DARK_ROLE_SURFACE) as CanonicalUserRole[]).map((role) => [role, buildAppearance(role, false)])
) as Record<CanonicalUserRole, RoleAppearance>;

export const LIGHT_ROLE_APPEARANCE: Record<CanonicalUserRole, RoleAppearance> = Object.fromEntries(
  (Object.keys(LIGHT_ROLE_SURFACE) as CanonicalUserRole[]).map((role) => [role, buildAppearance(role, true)])
) as Record<CanonicalUserRole, RoleAppearance>;

export function getRoleAppearance(role: UserRole, isLight = false): RoleAppearance {
  const canonical = normalizeUserRole(role);
  return isLight ? LIGHT_ROLE_APPEARANCE[canonical] : ROLE_APPEARANCE[canonical];
}
