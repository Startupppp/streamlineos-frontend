"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface RecordConversationProps {
  entityType: string;
  entityId: string;
  emptyTitle?: string;
  emptyDescriptionWrite?: string;
  emptyDescriptionReadOnly?: string;
}

type RenderRecordConversation = (props: RecordConversationProps) => ReactNode;

const RecordConversationSlot = createContext<RenderRecordConversation | null>(
  null,
);

export function RecordConversationSlotProvider({
  render,
  children,
}: {
  render: RenderRecordConversation;
  children: ReactNode;
}) {
  return (
    <RecordConversationSlot.Provider value={render}>
      {children}
    </RecordConversationSlot.Provider>
  );
}

export function RecordConversation(props: RecordConversationProps) {
  const render = useContext(RecordConversationSlot);
  return render ? render(props) : null;
}
