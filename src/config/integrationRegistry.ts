export type IntegrationReadiness =
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
    readiness: "contract-ready",
    owner: "backend",
    requiredForPublicRelease: true,
    evidence: "REST /v1/auth, session sécurisée et révocation documentées"
  },
  messaging: {
    label: "Messages et conversations",
    readiness: "contract-ready",
    owner: "backend",
    requiredForPublicRelease: true,
    evidence: "REST, idempotence, pagination et Socket.IO documentés"
  },
  privateMedia: {
    label: "Stockage privé des médias",
    readiness: "contract-ready",
    owner: "infrastructure",
    requiredForPublicRelease: true,
    evidence: "Upload présigné, URLs temporaires et antivirus attendus"
  },
  realtime: {
    label: "Temps réel Socket.IO / Redis",
    readiness: "contract-ready",
    owner: "infrastructure",
    requiredForPublicRelease: true,
    evidence: "Ticket éphémère, reconnexion et déduplication côté client"
  },
  calls: {
    label: "Appels WebRTC et TURN",
    readiness: "device-validation-required",
    owner: "infrastructure",
    requiredForPublicRelease: true,
    evidence: "Client intégré ; TURN et réseaux réels à certifier"
  },
  pushNotifications: {
    label: "Notifications APNs / FCM",
    readiness: "device-validation-required",
    owner: "stores",
    requiredForPublicRelease: true,
    evidence: "Canaux, sons et tokens côté client ; appareils à certifier"
  },
  groupAutomations: {
    label: "Automatisations de groupe",
    readiness: "contract-ready",
    owner: "backend",
    requiredForPublicRelease: true,
    evidence: "CRUD, récurrence, auteurs et gouvernance modélisés"
  },
  legalPages: {
    label: "Confidentialité et suppression web",
    readiness: "contract-ready",
    owner: "stores",
    requiredForPublicRelease: true,
    evidence: "URLs HTTPS obligatoires dans les profils de build store"
  },
  storeBinaries: {
    label: "IPA / AAB signés",
    readiness: "device-validation-required",
    owner: "stores",
    requiredForPublicRelease: true,
    evidence: "Profils EAS prêts ; comptes et certificats externes requis"
  }
} as const satisfies Record<string, IntegrationDescriptor>;
