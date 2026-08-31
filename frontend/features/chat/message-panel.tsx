"use client";

import { useMessagePanelData, type MessagePanelProps } from "./use-message-panel-data";
import { MessagePanelView } from "./message-panel-view";

export function MessagePanel(props: MessagePanelProps) {
  const viewProps = useMessagePanelData(props);
  return <MessagePanelView {...viewProps} />;
}
