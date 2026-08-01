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

/**
 * Les groupes officiels Connexio sont une capacité réservée aux Visionnaires.
 * Le rôle technique `admin` n'est volontairement pas assimilé à cette capacité
 * produit : le backend peut toujours intervenir via ses routes d'administration,
 * mais l'interface membre ne doit pas exposer la création ou l'édition officielle.
 */
export function isVisionnaireRole(role: UserRole): boolean {
  return normalizeUserRole(role) === "visionnaire";
}

/**
 * Conservé pour les autres fonctions de gouvernance qui restent accessibles aux
 * rôles historiques. Ne pas utiliser pour créer ou administrer un groupe officiel.
 */
export function isGovernanceRole(role: UserRole): boolean {
  const normalized = normalizeUserRole(role);
  return (
    normalized === "visionnaire" ||
    normalized === "amiral" ||
    normalized === "capitaine" ||
    normalized === "admin"
  );
}
