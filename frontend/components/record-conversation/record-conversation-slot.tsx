"use client";

import {
  createContext,
  useContext,
  type ComponentType,
  type ReactNode,
} from "react";

export interface RecordConversationProps {
  entityType: string;
  entityId: string;
  emptyTitle?: string;
  emptyDescriptionWrite?: string;
  emptyDescriptionReadOnly?: string;
}

const RecordConversationSlot =
  createContext<ComponentType<RecordConversationProps> | null>(null);

export function RecordConversationSlotProvider({
  render: Component,
  children,
}: {
  render: ComponentType<RecordConversationProps>;
  children: ReactNode;
}) {
  return (
    <RecordConversationSlot.Provider value={Component}>
      {children}
    </RecordConversationSlot.Provider>
  );
}

export function RecordConversation(props: RecordConversationProps) {
  const Component = useContext(RecordConversationSlot);
  return Component ? <Component {...props} /> : null;
}
