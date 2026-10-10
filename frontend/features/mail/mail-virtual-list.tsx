"use client";

import { memo, useCallback, useMemo, useState, type Key } from "react";
import { ChevronDown } from "lucide-react";
import { List, type RowComponentProps } from "react-window";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { MailMessageRow, type MailListAction } from "./mail-message-row";
import type { MailFolder, MailMessageSummary } from "@/types/mail";
import type { MailTriageGroup } from "./mail-group-messages";

const OVERSCAN_COUNT = 5;
const HEADER_ROW_HEIGHT = 32;
const MESSAGE_ROW_HEIGHT = 56;
const DEFAULT_LIST_HEIGHT = 600;
const PAGINATION_ROW_HEIGHT = 48;

type FlatItem =
  | {
      kind: "header";
      key: string;
      label: string;
      count: number;
      collapsed: boolean;
    }
  | { kind: "message"; message: MailMessageSummary }
  | { kind: "sentinel"; key: "mail-pagination" };

export function buildFlatItems(
  groups: MailTriageGroup[],
  collapsedGroups = new Set<string>(),
): FlatItem[] {
  const items: FlatItem[] = [];
  for (const group of groups) {
    if (group.label)
      items.push({
        kind: "header",
        key: group.key,
        label: group.label,
        count: group.messages.length,
        collapsed: collapsedGroups.has(group.key),
      });
    if (collapsedGroups.has(group.key)) continue;
    for (const msg of group.messages)
      items.push({ kind: "message", message: msg });
  }
  return items;
}

interface MailVirtualRowData {
  canAi: boolean;
  items: FlatItem[];
  hasNextPage: boolean;
  activeFolder: MailFolder;
  isFetchingNextPage: boolean;
  selectedMessageId: string | null;
  onAction: (
    messageId: string,
    accountId: number,
    action: MailListAction,
    threadId?: string,
  ) => void;
  onLoadMore: () => void;
  onToggleGroup: (key: string) => void;
  onSelect: (message: MailMessageSummary) => void;
  onAiBrief: (accountId: number, threadId: string) => void;
}

function getRowHeight(index: number, data: MailVirtualRowData): number {
  const item = data.items[index];
  if (!item || item.kind === "message") return MESSAGE_ROW_HEIGHT;
  if (item.kind === "sentinel") return PAGINATION_ROW_HEIGHT;
  return HEADER_ROW_HEIGHT;
}

function getRowKey(index: number, data: MailVirtualRowData): Key {
  const item = data.items[index];
  if (!item) return index;
  if (item.kind === "header") return `h-${item.label}`;
  if (item.kind === "sentinel") return item.key;
  return `${item.message.accountId}-${item.message.id}`;
}

function MailVirtualRow({
  ariaAttributes,
  index,
  style,
  items,
  selectedMessageId,
  activeFolder,
  canAi,
  onSelect,
  onAction,
  onAiBrief,
  onToggleGroup,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: RowComponentProps<MailVirtualRowData>) {
  const item = items[index];
  if (!item) return <div style={style} {...ariaAttributes} />;

  if (item.kind === "sentinel") {
    return (
      <div style={style} {...ariaAttributes}>
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
          label="Load more mail"
          className="h-full py-2"
        />
      </div>
    );
  }

  if (item.kind === "header") {
    return (
      <div style={style} {...ariaAttributes}>
        <button
          type="button"
          className="flex h-full w-full items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-3 text-left hover:bg-muted/35"
          aria-expanded={!item.collapsed}
          onClick={() => onToggleGroup(item.key)}
        >
          <span className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
            <ChevronDown
              className={`size-3.5 transition-transform ${item.collapsed ? "-rotate-90" : ""}`}
              aria-hidden="true"
            />
            {item.label}
          </span>
          <span className="text-micro tabular-nums text-muted-foreground">
            {item.count}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div style={style} {...ariaAttributes}>
      <MailMessageRow
        message={item.message}
        isSelected={selectedMessageId === item.message.id}
        folder={activeFolder}
        showPriority={activeFolder === "inbox"}
        canAi={canAi}
        onSelect={onSelect}
        onAction={onAction}
        onAiBrief={onAiBrief}
      />
    </div>
  );
}

export interface MailVirtualListProps {
  groups: MailTriageGroup[];
  selectedMessageId: string | null;
  activeFolder: MailFolder;
  canAi: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onSelect: (message: MailMessageSummary) => void;
  onAction: (
    messageId: string,
    accountId: number,
    action: MailListAction,
    threadId?: string,
  ) => void;
  onAiBrief: (accountId: number, threadId: string) => void;
  onLoadMore: () => void;
}

export const MailVirtualList = memo(function MailVirtualList({
  groups,
  selectedMessageId,
  activeFolder,
  canAi,
  hasNextPage,
  isFetchingNextPage,
  onSelect,
  onAction,
  onAiBrief,
  onLoadMore,
}: MailVirtualListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  const handleToggleGroup = useCallback((key: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const items = useMemo(() => {
    const rows = buildFlatItems(groups, collapsedGroups);
    if (hasNextPage) rows.push({ kind: "sentinel", key: "mail-pagination" });
    return rows;
  }, [groups, collapsedGroups, hasNextPage]);

  const rowProps = useMemo(
    (): MailVirtualRowData => ({
      items,
      canAi,
      hasNextPage,
      activeFolder,
      selectedMessageId,
      isFetchingNextPage,
      onSelect,
      onAction,
      onAiBrief,
      onLoadMore,
      onToggleGroup: handleToggleGroup,
    }),
    [
      items,
      selectedMessageId,
      activeFolder,
      canAi,
      onSelect,
      onAction,
      onAiBrief,
      handleToggleGroup,
      hasNextPage,
      isFetchingNextPage,
      onLoadMore,
    ],
  );

  const stableRowKey = useCallback(
    (index: number, data: MailVirtualRowData) => getRowKey(index, data),
    [],
  );
  const stableRowHeight = useCallback(
    (index: number, data: MailVirtualRowData) => getRowHeight(index, data),
    [],
  );

  return (
    <div className="flex flex-col h-full">
      <List<MailVirtualRowData>
        rowComponent={MailVirtualRow}
        rowCount={items.length}
        rowHeight={stableRowHeight}
        rowProps={rowProps}
        rowKey={stableRowKey}
        defaultHeight={DEFAULT_LIST_HEIGHT}
        overscanCount={OVERSCAN_COUNT}
        className="scrollbar-hide"
        style={{ flex: "1 1 0", minHeight: 0 }}
      />
    </div>
  );
});
