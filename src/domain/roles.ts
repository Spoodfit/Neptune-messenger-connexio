import type { CanonicalUserRole, UserRole } from "../types/messaging";

const ROLE_ALIASES: Record<UserRole, CanonicalUserRole> = {
  visionnaire: "visionnaire",
  visionary: "visionnaire",
  amiral: "amiral",
  admiral: "amiral",
  capitaine: "capitaine",
  captain: "capitaine",
  legende: "moussaillon",
  moussaillon: "moussaillon",
  triton: "triton",
  member: "triton",
  allie: "allie",
  ally: "allie",
  free: "free",
  admin: "admin"
};

export const ROLE_LABELS: Record<CanonicalUserRole, string> = {
  visionnaire: "Visionnaire",
  amiral: "Amiral",
  capitaine: "Capitaine",
  legende: "Légende",
  moussaillon: "Moussaillon",
  triton: "Triton",
  allie: "Allié",
  free: "Free",
  admin: "Administration"
};

export const GROUP_VISIBILITY_ROLES: CanonicalUserRole[] = [
  "free",
  "triton",
  "moussaillon",
  "capitaine",
  "amiral",
  "allie",
  "visionnaire"
];

export function normalizeUserRole(role: UserRole): CanonicalUserRole {
  return ROLE_ALIASES[role];
}

export function canAccessAllowedRoles(
  role: UserRole,
  allowedRoles?: readonly UserRole[]
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return false;
  const normalized = normalizeUserRole(role);
  return allowedRoles.some(
    (allowedRole) => normalizeUserRole(allowedRole) === normalized
  );
}

export function isVisionnaireRole(role: UserRole): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === "visionnaire" || normalized === "admin";
}

export function isGroupResponsibleRole(role: UserRole): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === "amiral" || normalized === "capitaine";
}

export function isGovernanceRole(role: UserRole): boolean {
  return isVisionnaireRole(role);
}
