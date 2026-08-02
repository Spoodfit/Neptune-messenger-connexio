import type {
  AppUser,
  ChatMessage,
  Conversation
} from "@/types/messaging";

export const currentUser: AppUser = {
  id: "user-johan",
  name: "Johan Zambelli",
  initials: "JZ",
  company: "Neptune Business",
  city: "Carcassonne",
  role: "visionary",
  roleLabel: "Visionnaire",
  online: true,
  avatarUrl: "https://i.pravatar.cc/160?u=neptune-johan"
};

export const members: AppUser[] = [
  currentUser,
  {
    id: "user-lea",
    name: "Léa Despoulins",
    initials: "LD",
    company: "Neptune Business",
    city: "Carcassonne",
    role: "visionary",
    roleLabel: "Visionnaire",
    online: true,
    avatarUrl: "https://i.pravatar.cc/160?u=neptune-lea",
    webProfileUrl: "https://neptunebusiness.com/profile/user-lea"
  },
  {
    id: "user-oceane",
    name: "Océane",
    initials: "OC",
    company: "Neptune Carcassonne",
    city: "Carcassonne",
    role: "captain",
    roleLabel: "Capitaine",
    online: true,
    avatarUrl: "https://i.pravatar.cc/160?u=neptune-oceane",
    webProfileUrl: "https://neptunebusiness.com/profile/user-oceane"
  },
  {
    id: "user-nabiha",
    name: "Nabiha",
    initials: "NA",
    company: "Neptune Toulouse",
    city: "Toulouse",
    role: "captain",
    roleLabel: "Capitaine",
    online: false,
    avatarUrl: "https://i.pravatar.cc/160?u=neptune-nabiha",
    webProfileUrl: "https://neptunebusiness.com/profile/user-nabiha"
  },
  {
    id: "user-christelle",
    name: "Christelle",
    initials: "CH",
    company: "Neptune Montpellier",
    city: "Montpellier",
    role: "captain",
    roleLabel: "Capitaine",
    online: true,
    avatarUrl: "https://i.pravatar.cc/160?u=neptune-christelle",
    webProfileUrl: "https://neptunebusiness.com/profile/user-christelle"
  }
];

const ACTIVE_MEMBERS = ["user-oceane", "user-lea", "user-johan", "user-nabiha"];

export const conversations: Conversation[] = [
  {
    id: "annonces",
    name: "Annonces Neptune",
    description: "Les informations officielles du réseau.",
    categoryLabel: "Officiel",
    type: "announcement",
    memberCount: 238,
    unreadCount: 2,
    lastMessage: "Le prochain atelier est ouvert aux votes.",
    lastMessageAt: "2026-07-24T11:30:00.000Z",
    pinnedMessage: "Seuls les administrateurs publient dans cet espace.",
    restricted: false,
    activeMemberIds: ["user-lea", "user-johan", "user-oceane"]
  },
  {
    id: "carcassonne",
    name: "Club Carcassonne",
    description: "Échanges et opportunités du club.",
    categoryLabel: "Ville",
    type: "city",
    memberCount: 68,
    unreadCount: 5,
    lastMessage: "Qui sera présent au prochain afterwork ?",
    lastMessageAt: "2026-07-24T12:08:00.000Z",
    restricted: false,
    activeMemberIds: ACTIVE_MEMBERS,
    eventVoteAlert: {
      id: "vote-carcassonne-aout",
      title: "2 évènements attendent votre vote",
      clubName: "Club Carcassonne",
      city: "Carcassonne",
      pendingCount: 2,
      webUrl: "https://neptunebusiness.com/events/votes?club=carcassonne",
      closesAt: "2026-08-09T21:59:00.000Z"
    }
  },
  {
    id: "toulouse",
    name: "Club Toulouse",
    description: "Échanges et opportunités du club.",
    categoryLabel: "Ville",
    type: "city",
    memberCount: 54,
    unreadCount: 0,
    lastMessage: "Le Comptoir des Vins confirme le créneau.",
    lastMessageAt: "2026-07-23T17:45:00.000Z",
    restricted: false,
    activeMemberIds: ["user-nabiha", "user-lea", "user-johan"]
  },
  {
    id: "montpellier",
    name: "Club Montpellier",
    description: "Échanges et opportunités du club.",
    categoryLabel: "Ville",
    type: "city",
    memberCount: 47,
    unreadCount: 0,
    lastMessage: "Bienvenue aux nouveaux membres.",
    lastMessageAt: "2026-07-23T09:15:00.000Z",
    restricted: false,
    activeMemberIds: ["user-christelle", "user-lea"]
  },
  {
    id: "narbonne",
    name: "Club Narbonne",
    description: "Échanges et opportunités du club.",
    categoryLabel: "Ville",
    type: "city",
    memberCount: 39,
    unreadCount: 1,
    lastMessage: "Besoin d’un photographe pour mardi.",
    lastMessageAt: "2026-07-24T08:20:00.000Z",
    restricted: false,
    activeMemberIds: ["user-lea", "user-oceane", "user-johan"]
  },
  {
    id: "limoux",
    name: "Club Limoux",
    description: "Nouveau club Neptune.",
    categoryLabel: "Ville",
    type: "city",
    memberCount: 12,
    unreadCount: 0,
    lastMessage: "Le groupe est désormais ouvert.",
    lastMessageAt: "2026-07-22T14:00:00.000Z",
    restricted: false,
    activeMemberIds: ["user-johan", "user-lea"]
  },
  {
    id: "visionnaires",
    name: "Les Visionnaires",
    description: "Pilotage stratégique et décisions fondatrices.",
    categoryLabel: "Gouvernance",
    type: "role",
    memberCount: 4,
    unreadCount: 3,
    lastMessage: "Point sur Neptune Média à 17 h.",
    lastMessageAt: "2026-07-24T12:40:00.000Z",
    restricted: true,
    allowedRoles: ["visionary", "admin"],
    activeMemberIds: ["user-johan", "user-lea"]
  },
  {
    id: "amiraux",
    name: "Les Amiraux",
    description: "Coordination régionale de plusieurs clubs.",
    categoryLabel: "Gouvernance",
    type: "role",
    memberCount: 7,
    unreadCount: 0,
    lastMessage: "Le suivi régional est à jour.",
    lastMessageAt: "2026-07-23T15:10:00.000Z",
    restricted: true,
    allowedRoles: ["admiral", "visionary", "admin"],
    activeMemberIds: ["user-lea", "user-johan"]
  },
  {
    id: "capitaines",
    name: "Les Capitaines",
    description: "Organisation et animation des clubs.",
    categoryLabel: "Gouvernance",
    type: "role",
    memberCount: 18,
    unreadCount: 4,
    lastMessage: "Merci de valider les disponibilités partenaires.",
    lastMessageAt: "2026-07-24T10:52:00.000Z",
    restricted: true,
    allowedRoles: ["captain", "admiral", "visionary", "admin"],
    activeMemberIds: ["user-oceane", "user-nabiha", "user-christelle", "user-lea"]
  },
  {
    id: "sav",
    name: "SAV Application",
    description: "Bugs, blocages et demandes d’assistance.",
    categoryLabel: "Support",
    type: "support",
    memberCount: 238,
    unreadCount: 0,
    lastMessage: "Le problème de connexion a été corrigé.",
    lastMessageAt: "2026-07-22T11:20:00.000Z",
    restricted: false,
    activeMemberIds: ["user-johan", "user-lea"]
  },
  {
    id: "boost",
    name: "Boost réseaux sociaux",
    description: "Soutien aux publications des membres.",
    categoryLabel: "Entraide",
    type: "topic",
    memberCount: 121,
    unreadCount: 7,
    lastMessage: "Nouveau post à soutenir aujourd’hui.",
    lastMessageAt: "2026-07-24T12:25:00.000Z",
    restricted: false,
    activeMemberIds: ACTIVE_MEMBERS
  },
  {
    id: "reussites",
    name: "Nos réussites",
    description: "Contrats, lancements et victoires du réseau.",
    categoryLabel: "Entraide",
    type: "topic",
    memberCount: 176,
    unreadCount: 1,
    lastMessage: "Premier contrat signé grâce à Neptune.",
    lastMessageAt: "2026-07-24T07:40:00.000Z",
    restricted: false,
    activeMemberIds: ["user-christelle", "user-oceane", "user-nabiha"]
  },
  {
    id: "besoins",
    name: "Nos besoins",
    description: "Demandes de contacts, prestataires et recommandations.",
    categoryLabel: "Entraide",
    type: "topic",
    memberCount: 184,
    unreadCount: 2,
    lastMessage: "Je cherche un expert Meta Ads à Toulouse.",
    lastMessageAt: "2026-07-24T11:58:00.000Z",
    restricted: false,
    activeMemberIds: ACTIVE_MEMBERS
  },
  {
    id: "publicite",
    name: "Publicité",
    description: "Offres et actualités commerciales des membres.",
    categoryLabel: "Visibilité",
    type: "topic",
    memberCount: 143,
    unreadCount: 0,
    lastMessage: "Offre de lancement disponible jusqu’à dimanche.",
    lastMessageAt: "2026-07-21T18:00:00.000Z",
    restricted: false,
    activeMemberIds: ["user-nabiha", "user-christelle", "user-oceane"]
  },
  {
    id: "rencontres",
    name: "Rencontres",
    description: "Proposer un café, un rendez-vous ou une rencontre.",
    categoryLabel: "Communauté",
    type: "topic",
    memberCount: 162,
    unreadCount: 0,
    lastMessage: "Disponible demain matin à Carcassonne.",
    lastMessageAt: "2026-07-23T13:22:00.000Z",
    restricted: false,
    activeMemberIds: ACTIVE_MEMBERS
  },
  {
    id: "online",
    name: "Membres online",
    description: "Échanges pour les membres à distance.",
    categoryLabel: "Communauté",
    type: "topic",
    memberCount: 48,
    unreadCount: 0,
    lastMessage: "Visio networking mercredi prochain.",
    lastMessageAt: "2026-07-22T16:42:00.000Z",
    restricted: false,
    activeMemberIds: ["user-johan", "user-lea", "user-nabiha"]
  }
];

const baseMessages: ChatMessage[] = [
  {
    id: "m-poll-carcassonne",
    conversationId: "carcassonne",
    senderId: "user-oceane",
    senderName: "Océane",
    senderInitials: "OC",
    senderAvatarUrl: "https://i.pravatar.cc/160?u=neptune-oceane",
    body: "",
    createdAt: "2026-08-02T10:42:00.000Z",
    status: "read",
    isMine: false,
    poll: {
      id: "poll-afterwork-carcassonne",
      question: "Quel créneau préférez-vous pour le prochain afterwork ?",
      allowMultiple: false,
      anonymous: false,
      totalVotes: 31,
      closesAt: "2026-08-08T21:59:00.000Z",
      eventVoteId: "event-vote-carcassonne-august",
      eventVoteUrl: "https://neptunebusiness.com/events/votes?club=carcassonne",
      options: [
        {
          id: "option-thursday",
          label: "Jeudi 20 août · 18 h 30",
          voteCount: 18,
          votedByCurrentUser: true
        },
        {
          id: "option-friday",
          label: "Vendredi 21 août · 19 h",
          voteCount: 13,
          votedByCurrentUser: false
        }
      ]
    }
  },
  {
    id: "m-1",
    conversationId: "carcassonne",
    senderId: "user-oceane",
    senderName: "Océane",
    senderInitials: "OC",
    senderAvatarUrl: "https://i.pravatar.cc/160?u=neptune-oceane",
    body: "Qui sera présent au prochain afterwork ?",
    createdAt: "2026-07-24T12:08:00.000Z",
    status: "read",
    isMine: false
  },
  {
    id: "m-2",
    conversationId: "carcassonne",
    senderId: "user-johan",
    senderName: "Johan Zambelli",
    senderInitials: "JZ",
    senderAvatarUrl: "https://i.pravatar.cc/160?u=neptune-johan",
    body: "Présent. Je prépare aussi une courte présentation de Connexio.",
    createdAt: "2026-07-24T12:10:00.000Z",
    status: "read",
    isMine: true
  },
  {
    id: "m-3",
    conversationId: "annonces",
    senderId: "user-lea",
    senderName: "Léa Despoulins",
    senderInitials: "LD",
    senderAvatarUrl: "https://i.pravatar.cc/160?u=neptune-lea",
    body: "Le vote pour choisir la prochaine thématique d’atelier est ouvert.",
    createdAt: "2026-07-24T11:30:00.000Z",
    status: "read",
    isMine: false
  },
  {
    id: "m-4",
    conversationId: "visionnaires",
    senderId: "user-lea",
    senderName: "Léa Despoulins",
    senderInitials: "LD",
    senderAvatarUrl: "https://i.pravatar.cc/160?u=neptune-lea",
    body: "Point sur Neptune Média à 17 h. Merci d’ajouter les chiffres de conversion.",
    createdAt: "2026-07-24T12:40:00.000Z",
    status: "delivered",
    isMine: false
  }
];

export const messagesByConversation: Record<string, ChatMessage[]> =
  conversations.reduce<Record<string, ChatMessage[]>>((accumulator, item) => {
    accumulator[item.id] = baseMessages
      .filter((message) => message.conversationId === item.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return accumulator;
  }, {});
