"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_VISIBILITY_ROLES = exports.ROLE_LABELS = void 0;
exports.normalizeUserRole = normalizeUserRole;
exports.canAccessAllowedRoles = canAccessAllowedRoles;
exports.isVisionnaireRole = isVisionnaireRole;
exports.isGovernanceRole = isGovernanceRole;
const ROLE_ALIASES = {
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
exports.ROLE_LABELS = {
    visionnaire: "Visionnaire",
    amiral: "Amiral",
    capitaine: "Capitaine",
    legende: "Légende",
    moussaillon: "Moussaillon",
    triton: "Triton",
    free: "Free",
    admin: "Administration"
};
exports.GROUP_VISIBILITY_ROLES = [
    "visionnaire",
    "amiral",
    "capitaine",
    "legende",
    "moussaillon",
    "triton",
    "free"
];
function normalizeUserRole(role) {
    return ROLE_ALIASES[role];
}
function canAccessAllowedRoles(role, allowedRoles) {
    if (!allowedRoles || allowedRoles.length === 0)
        return false;
    const normalized = normalizeUserRole(role);
    return allowedRoles.some((allowedRole) => normalizeUserRole(allowedRole) === normalized);
}
/** Capacité produit de création et d’administration des groupes officiels. */
function isVisionnaireRole(role) {
    return normalizeUserRole(role) === "visionnaire";
}
/**
 * Dans l’interface membre Connexio, la gouvernance des groupes officiels est
 * volontairement réservée aux Visionnaires. Le rôle technique `admin` reste
 * utilisable par le backend via ses routes protégées, mais n’expose pas ces
 * commandes dans l’application membre.
 */
function isGovernanceRole(role) {
    return isVisionnaireRole(role);
}
