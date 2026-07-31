import * as Crypto from "expo-crypto";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

import type { GroupDraft } from "../types/experience";
import type { Conversation } from "../types/messaging";

interface GroupAdminContextValue {
  createdGroups: Conversation[];
  createGroup: (draft: GroupDraft) => Conversation;
  updateCreatedGroup: (conversationId: string, draft: GroupDraft) => void;
  getCreatedGroup: (conversationId: string) => Conversation | undefined;
  removeCreatedGroup: (conversationId: string) => void;
}

const GroupAdminContext = createContext<GroupAdminContextValue | null>(null);

export function GroupAdminProvider({ children }: PropsWithChildren) {
  const [createdGroups, setCreatedGroups] = useState<Conversation[]>([]);

  const createGroup = useCallback((draft: GroupDraft): Conversation => {
    const group: Conversation = {
      id: `local-group-${Crypto.randomUUID()}`,
      name: draft.name.trim(),
      description: draft.description.trim(),
      categoryLabel: "Groupe administré",
      type: "topic",
      memberCount: 1,
      unreadCount: 0,
      restricted: true,
      allowedRoles: draft.allowedRoles,
      canPost: draft.canMembersPost,
      canManage: true,
      avatarUrl: draft.avatarUrl,
      iconName: draft.iconName,
      ownerId: "user-johan",
      adminIds: ["user-johan"],
      memberIds: ["user-johan"],
      lastMessage: "Groupe créé. Le backend ajoutera les membres éligibles.",
      lastMessageAt: new Date().toISOString()
    };
    setCreatedGroups((previous) => [group, ...previous]);
    return group;
  }, []);

  const updateCreatedGroup = useCallback(
    (conversationId: string, draft: GroupDraft) => {
      setCreatedGroups((previous) =>
        previous.map((group) =>
          group.id === conversationId
            ? {
                ...group,
                name: draft.name.trim(),
                description: draft.description.trim(),
                avatarUrl: draft.avatarUrl,
                iconName: draft.iconName,
                allowedRoles: draft.allowedRoles,
                canPost: draft.canMembersPost
              }
            : group
        )
      );
    },
    []
  );

  const getCreatedGroup = useCallback(
    (conversationId: string) =>
      createdGroups.find((group) => group.id === conversationId),
    [createdGroups]
  );

  const removeCreatedGroup = useCallback((conversationId: string) => {
    setCreatedGroups((previous) =>
      previous.filter((group) => group.id !== conversationId)
    );
  }, []);

  const value = useMemo<GroupAdminContextValue>(
    () => ({
      createdGroups,
      createGroup,
      updateCreatedGroup,
      getCreatedGroup,
      removeCreatedGroup
    }),
    [
      createGroup,
      createdGroups,
      getCreatedGroup,
      removeCreatedGroup,
      updateCreatedGroup
    ]
  );

  return (
    <GroupAdminContext.Provider value={value}>
      {children}
    </GroupAdminContext.Provider>
  );
}

export function useGroupAdmin(): GroupAdminContextValue {
  const context = useContext(GroupAdminContext);
  if (!context) {
    throw new Error("useGroupAdmin doit être utilisé dans GroupAdminProvider.");
  }
  return context;
}
