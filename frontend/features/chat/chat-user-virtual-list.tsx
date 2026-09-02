"use client";

import { useMemo, type Key, type ReactNode } from "react";
import { List, type RowComponentProps } from "react-window";
import type { OrgUser } from "@/types/chat";

const OVERSCAN_COUNT = 6;

interface ChatUserRowData {
  users: OrgUser[];
  renderUser: (user: OrgUser) => ReactNode;
}

function getRowKey(index: number, data: ChatUserRowData): Key {
  return data.users[index]?.id ?? index;
}

function ChatUserRow({
  ariaAttributes,
  index,
  style,
  users,
  renderUser,
}: RowComponentProps<ChatUserRowData>) {
  const user = users[index];
  if (!user) return <div style={style} />;
  return (
    <div style={style} {...ariaAttributes}>
      {renderUser(user)}
    </div>
  );
}

export interface ChatUserVirtualListProps {
  users: OrgUser[];
  rowHeight: number;
  listHeight: number;
  renderUser: (user: OrgUser) => ReactNode;
  ariaLabel: string;
}

/**
 * `/chat/users` returns every member of the organisation with no cursor, so an
 * org of any size renders its whole headcount into a 280–340px box. Windowing
 * keeps the mounted row count proportional to the box, not to the tenant.
 */
export function ChatUserVirtualList({
  users,
  rowHeight,
  listHeight,
  renderUser,
  ariaLabel,
}: ChatUserVirtualListProps) {
  const rowProps = useMemo(
    (): ChatUserRowData => ({ users, renderUser }),
    [users, renderUser],
  );
  return (
    <List<ChatUserRowData>
      aria-label={ariaLabel}
      rowComponent={ChatUserRow}
      rowCount={users.length}
      rowHeight={rowHeight}
      rowProps={rowProps}
      rowKey={getRowKey}
      defaultHeight={listHeight}
      overscanCount={OVERSCAN_COUNT}
      style={{ height: listHeight }}
    />
  );
}
