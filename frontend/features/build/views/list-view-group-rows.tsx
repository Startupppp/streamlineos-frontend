"use client";

import {
  useItemSelectHandler,
} from "./list-view-shared";
import { ListViewItem } from "./list-view-item";
import type {
  ListSelection,
  ListViewItemProps,
  Ticket,
} from "./list-view-shared";

interface GroupRowsProps {
  items: Ticket[];
  projectKey: ListViewItemProps["projectKey"];
  projectId: ListViewItemProps["projectId"];
  projectStatuses: ListViewItemProps["projectStatuses"];
  displayOptions: ListViewItemProps["displayOptions"];
  onTicketClick: ListViewItemProps["onClick"];
  selection?: ListSelection;
  focusedTicketId?: number | null;
}

export function GroupRows({
  items,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  onTicketClick,
  selection,
  focusedTicketId,
}: GroupRowsProps) {
  const handleItemSelect = useItemSelectHandler(selection);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border">
      {items.map((ticket) => (
        <ListViewItem
          key={ticket.id}
          ticket={ticket}
          projectKey={projectKey}
          projectId={projectId}
          projectStatuses={projectStatuses}
          onClick={onTicketClick}
          displayOptions={displayOptions}
          isSelected={selection?.selected.has(ticket.id)}
          onSelect={selection ? handleItemSelect : undefined}
          isKeyboardFocused={focusedTicketId === ticket.id}
        />
      ))}
    </div>
  );
}
