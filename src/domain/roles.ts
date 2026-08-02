import type {
  CanonicalUserRole,
  UserRole
} from "../types/messaging";

const ROLE_ALIASES: Record<UserRole, CanonicalUserRole> = {
  visionnaire: "visionnaire",
  visionary: "visionnaire",
  amiral: "amiral",
  admiral: "amiral",
  capitaine: "capitaine",
  captain: "capitaine",
  legende: "legende",
  moussaillon: "moussaillon",
  triton: "triton",
  member: "triton",
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
  free: "Free",
  admin: "Administration"
};

export const GROUP_VISIBILITY_ROLES: CanonicalUserRole[] = [
  "visionnaire",
  "amiral",
  "capitaine",
  "legende",
  "moussaillon",
  "triton",
  "free"
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

/** Capacité produit de création et d’administration des groupes officiels. */
export function isVisionnaireRole(role: UserRole): boolean {
  return normalizeUserRole(role) === "visionnaire";
}

/**
 * Dans l’interface membre Connexio, la gouvernance des groupes officiels est
 * volontairement réservée aux Visionnaires. Le rôle technique `admin` reste
 * utilisable par le backend via ses routes protégées, mais n’expose pas ces
 * commandes dans l’application membre.
 */
export function isGovernanceRole(role: UserRole): boolean {
  return isVisionnaireRole(role);
}
