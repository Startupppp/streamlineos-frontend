"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  entityReferenceKey,
  useEntityActions,
  type EntityAction,
  type EntityReferenceInput,
} from "@/hooks/api/chat";
import type { Message } from "./chat-types";

interface EntityActionsValue {
  actionsByReference: Map<string, EntityAction[]>;
  isLoading: boolean;
}

const EntityActionsContext = createContext<EntityActionsValue>({
  actionsByReference: new Map(),
  isLoading: false,
});

function referencesInMessages(messages: Message[]): EntityReferenceInput[] {
  const seen = new Map<string, EntityReferenceInput>();
  for (const message of messages) {
    for (const entity of message.metadata?.entities ?? []) {
      const reference = { type: entity.type, id: String(entity.id) };
      seen.set(entityReferenceKey(reference), reference);
    }
  }
  return [...seen.values()];
}

export function EntityActionsProvider({
  channelId,
  messages,
  children,
}: {
  channelId: number;
  messages: Message[];
  children: ReactNode;
}) {
  const references = useMemo(
    () => referencesInMessages(messages),
    [messages],
  );
  const { data, isLoading } = useEntityActions(channelId, references);
  const value = useMemo(
    () => ({ actionsByReference: data ?? new Map(), isLoading }),
    [data, isLoading],
  );

  return (
    <EntityActionsContext.Provider value={value}>
      {children}
    </EntityActionsContext.Provider>
  );
}

/**
 * What the server says this actor may do to this record — never a permission key
 * the client guessed, which is how a CRM deal ended up gated on Build permissions.
 */
export function useAvailableActions(
  reference: EntityReferenceInput,
): EntityAction[] {
  const { actionsByReference } = useContext(EntityActionsContext);
  const key = entityReferenceKey(reference);
  return actionsByReference.get(key) ?? [];
}

export function useEntityAction(
  reference: EntityReferenceInput,
  actionId: string,
): EntityAction | undefined {
  return useAvailableActions(reference).find(
    (action) => action.id === actionId,
  );
}
