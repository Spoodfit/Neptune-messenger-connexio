export type IntegrationReadiness =
  | "blocked"
  | "local-ready"
  | "contract-ready"
  | "connected"
  | "device-validation-required";

export interface IntegrationDescriptor {
  label: string;
  readiness: IntegrationReadiness;
  owner: "frontend" | "backend" | "infrastructure" | "stores";
  requiredForPublicRelease: boolean;
  evidence: string;
}

export const INTEGRATION_REGISTRY = {
  authentication: {
    label: "Authentification Neptune",
    readiness: "device-validation-required",
    owner: "backend",
    requiredForPublicRelease: true,
    evidence: "Compte partagé et cookies /v1/auth connectés ; persistance native à certifier"
  },
  memberDirectory: {
    label: "Annuaire des membres",
    readiness: "connected",
    owner: "backend",
    requiredForPublicRelease: true,
    evidence: "GET /v1/users normalisé vers le modèle Connexio"
  },
  needsAndBenefits: {
    label: "Besoins et avantages",
    readiness: "connected",
    owner: "backend",
    requiredForPublicRelease: true,
    evidence: "GET /v1/needs et /v1/benefits connectés ; écriture Besoin limitée au parcours actuel"
  },
  messaging: {
    label: "Messages et conversations",
    readiness: "blocked",
    owner: "backend",
    requiredForPublicRelease: true,
    evidence: "Routes /v1/conversations sécurisées absentes ; routes historiques interdites au client"
  },
  privateMedia: {
    label: "Stockage privé des médias",
    readiness: "blocked",
    owner: "infrastructure",
    requiredForPublicRelease: true,
    evidence: "Upload présigné, URLs temporaires et antivirus attendus"
  },
  realtime: {
    label: "Temps réel Socket.IO / Redis",
    readiness: "blocked",
    owner: "infrastructure",
    requiredForPublicRelease: true,
    evidence: "Ticket éphémère, reconnexion et déduplication côté client"
  },
  calls: {
    label: "Appels WebRTC et TURN",
    readiness: "blocked",
    owner: "infrastructure",
    requiredForPublicRelease: true,
    evidence: "Client intégré ; TURN et réseaux réels à certifier"
  },
  pushNotifications: {
    label: "Notifications APNs / FCM",
    readiness: "blocked",
    owner: "stores",
    requiredForPublicRelease: true,
    evidence: "Canaux, sons et tokens côté client ; appareils à certifier"
  },
  groupAutomations: {
    label: "Automatisations de groupe",
    readiness: "blocked",
    owner: "backend",
    requiredForPublicRelease: true,
    evidence: "CRUD, récurrence, auteurs et gouvernance modélisés"
  },
  legalPages: {
    label: "Confidentialité et suppression web",
    readiness: "connected",
    owner: "stores",
    requiredForPublicRelease: true,
    evidence: "URLs HTTPS obligatoires dans les profils de build store"
  },
  storeBinaries: {
    label: "IPA / AAB signés",
    readiness: "blocked",
    owner: "stores",
    requiredForPublicRelease: true,
    evidence: "Profils EAS prêts ; comptes et certificats externes requis"
  }
} as const satisfies Record<string, IntegrationDescriptor>;
