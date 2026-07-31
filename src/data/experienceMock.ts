import { members } from "./mockData";
import type { ChatMessage, Conversation } from "../types/messaging";
import type {
  CallHistoryItem,
  HighlightPost,
  MapMemberMoment
} from "../types/experience";

const byId = (id: string) => {
  const member = members.find((item) => item.id === id);
  if (!member) throw new Error(`Membre de démonstration introuvable: ${id}`);
  return member;
};

export const privateConversations: Conversation[] = [
  {
    id: "direct-lea",
    name: "Léa Despoulins",
    description: "Conversation privée",
    categoryLabel: "Privé",
    type: "direct",
    memberCount: 2,
    unreadCount: 1,
    lastMessage: "Je t’envoie les chiffres Neptune Média.",
    lastMessageAt: "2026-07-31T08:42:00.000Z",
    restricted: false,
    canPost: true,
    memberIds: ["user-johan", "user-lea"]
  },
  {
    id: "direct-oceane",
    name: "Océane",
    description: "Conversation privée",
    categoryLabel: "Privé",
    type: "direct",
    memberCount: 2,
    unreadCount: 0,
    lastMessage: "Parfait pour l’afterwork.",
    lastMessageAt: "2026-07-30T17:22:00.000Z",
    restricted: false,
    canPost: true,
    memberIds: ["user-johan", "user-oceane"]
  },
  {
    id: "private-media-team",
    name: "Équipe Neptune Média",
    description: "Mini-groupe privé · 4 personnes maximum",
    categoryLabel: "Mini-groupe",
    type: "small_group",
    memberCount: 4,
    unreadCount: 3,
    mentionCount: 1,
    lastMessage: "@Johan tu valides la miniature ?",
    lastMessageAt: "2026-07-31T09:04:00.000Z",
    restricted: false,
    canPost: true,
    ownerId: "user-lea",
    adminIds: ["user-lea", "user-johan"],
    memberIds: ["user-johan", "user-lea", "user-oceane", "user-nabiha"]
  }
];

export const privateMessages: Record<string, ChatMessage[]> = {
  "direct-lea": [
    {
      id: "pm-lea-2",
      conversationId: "direct-lea",
      senderId: "user-lea",
      senderName: "Léa Despoulins",
      senderInitials: "LD",
      body: "Je t’envoie les chiffres Neptune Média.",
      createdAt: "2026-07-31T08:42:00.000Z",
      status: "delivered",
      isMine: false,
      reactions: [{ emoji: "🔥", count: 1, reactedByCurrentUser: true }]
    },
    {
      id: "pm-lea-1",
      conversationId: "direct-lea",
      senderId: "user-johan",
      senderName: "Johan Zambelli",
      senderInitials: "JZ",
      body: "Tu peux me confirmer les conversions de la campagne ?",
      createdAt: "2026-07-31T08:39:00.000Z",
      status: "read",
      isMine: true
    }
  ],
  "direct-oceane": [
    {
      id: "pm-oceane-1",
      conversationId: "direct-oceane",
      senderId: "user-oceane",
      senderName: "Océane",
      senderInitials: "OC",
      body: "Parfait pour l’afterwork.",
      createdAt: "2026-07-30T17:22:00.000Z",
      status: "read",
      isMine: false
    }
  ],
  "private-media-team": [
    {
      id: "pm-team-2",
      conversationId: "private-media-team",
      senderId: "user-lea",
      senderName: "Léa Despoulins",
      senderInitials: "LD",
      body: "@Johan tu valides la miniature ?",
      createdAt: "2026-07-31T09:04:00.000Z",
      status: "delivered",
      isMine: false,
      mentionedUserIds: ["user-johan"]
    },
    {
      id: "pm-team-1",
      conversationId: "private-media-team",
      senderId: "user-nabiha",
      senderName: "Nabiha",
      senderInitials: "NA",
      body: "La version courte fonctionne mieux sur mobile.",
      createdAt: "2026-07-31T09:01:00.000Z",
      status: "read",
      isMine: false
    }
  ]
};

export const highlightPosts: HighlightPost[] = [
  {
    id: "post-lea-studio",
    author: byId("user-lea"),
    kind: "reussite",
    body: "Première session studio validée. On affine les hooks, les plans et la livraison 24 h. Très bon niveau de rendu.",
    createdAt: "2026-07-31T09:12:00.000Z",
    reactions: [
      { emoji: "🔥", count: 12, reactedByCurrentUser: false },
      { emoji: "👏", count: 6, reactedByCurrentUser: true }
    ],
    comments: [
      {
        id: "comment-1",
        postId: "post-lea-studio",
        author: byId("user-oceane"),
        body: "Le rendu est vraiment premium.",
        createdAt: "2026-07-31T09:24:00.000Z",
        reactions: []
      },
      {
        id: "comment-2",
        postId: "post-lea-studio",
        author: byId("user-nabiha"),
        body: "@Léa vous avez déjà la prochaine date ?",
        createdAt: "2026-07-31T09:28:00.000Z",
        parentCommentId: "comment-1",
        mentionedUserIds: ["user-lea"],
        reactions: [{ emoji: "💡", count: 1, reactedByCurrentUser: false }]
      }
    ],
    shareCount: 3,
    coordinates: {
      latitude: 43.6045,
      longitude: 1.444,
      accuracyRadiusMeters: 1800
    }
  },
  {
    id: "post-oceane-besoin",
    author: byId("user-oceane"),
    kind: "besoin",
    body: "BESOIN · Je cherche un photographe disponible mardi à Carcassonne. @Neptune Business",
    createdAt: "2026-07-31T08:18:00.000Z",
    mentionedUserIds: ["user-johan"],
    reactions: [
      { emoji: "🤝", count: 8, reactedByCurrentUser: true },
      { emoji: "💡", count: 3, reactedByCurrentUser: false }
    ],
    comments: [],
    shareCount: 5,
    coordinates: {
      latitude: 43.213,
      longitude: 2.351,
      accuracyRadiusMeters: 1400
    },
    syncedWithBusinessApp: true
  },
  {
    id: "post-nabiha-video",
    author: byId("user-nabiha"),
    kind: "standard",
    body: "Coulisses du prochain atelier Toulouse. Vidéo courte prête à publier.",
    createdAt: "2026-07-30T18:10:00.000Z",
    media: {
      id: "media-nabiha",
      kind: "video",
      durationSeconds: 42,
      status: "ready"
    },
    reactions: [{ emoji: "❤️", count: 9, reactedByCurrentUser: false }],
    comments: [],
    shareCount: 1,
    coordinates: {
      latitude: 43.6045,
      longitude: 1.444,
      accuracyRadiusMeters: 2200
    }
  },
  {
    id: "post-christelle-offre",
    author: byId("user-christelle"),
    kind: "offre",
    body: "Une place vient de se libérer pour l’atelier de Montpellier.",
    createdAt: "2026-07-30T15:40:00.000Z",
    reactions: [{ emoji: "🔥", count: 4, reactedByCurrentUser: false }],
    comments: [],
    shareCount: 2,
    coordinates: {
      latitude: 43.611,
      longitude: 3.877,
      accuracyRadiusMeters: 2000
    }
  }
];

export const mapMoments: MapMemberMoment[] = [
  {
    member: byId("user-lea"),
    latitude: 43.6045,
    longitude: 1.444,
    approximate: true,
    recentPostIds: ["post-lea-studio"],
    lastPublishedAt: "2026-07-31T09:12:00.000Z"
  },
  {
    member: byId("user-oceane"),
    latitude: 43.213,
    longitude: 2.351,
    approximate: true,
    recentPostIds: ["post-oceane-besoin"],
    lastPublishedAt: "2026-07-31T08:18:00.000Z"
  },
  {
    member: byId("user-nabiha"),
    latitude: 43.6045,
    longitude: 1.444,
    approximate: true,
    recentPostIds: ["post-nabiha-video"],
    lastPublishedAt: "2026-07-30T18:10:00.000Z"
  },
  {
    member: byId("user-christelle"),
    latitude: 43.611,
    longitude: 3.877,
    approximate: true,
    recentPostIds: ["post-christelle-offre"],
    lastPublishedAt: "2026-07-30T15:40:00.000Z"
  }
];

export const callHistory: CallHistoryItem[] = [
  {
    id: "call-1",
    member: byId("user-lea"),
    type: "video",
    direction: "outgoing",
    occurredAt: "2026-07-30T16:10:00.000Z",
    durationSeconds: 614
  },
  {
    id: "call-2",
    member: byId("user-oceane"),
    type: "audio",
    direction: "missed",
    occurredAt: "2026-07-30T11:32:00.000Z"
  },
  {
    id: "call-3",
    member: byId("user-nabiha"),
    type: "audio",
    direction: "incoming",
    occurredAt: "2026-07-29T17:20:00.000Z",
    durationSeconds: 184
  }
];
