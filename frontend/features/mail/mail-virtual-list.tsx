"use client";

import { memo, useCallback, useMemo, useRef, type Key } from "react";
import { List, type RowComponentProps } from "react-window";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { MailMessageRow, type MailListAction } from "./mail-message-row";
import type { MailFolder, MailMessageSummary } from "@/types/mail";
import type { MailTriageGroup } from "./mail-group-messages";

const MESSAGE_ROW_HEIGHT = 72;
const HEADER_ROW_HEIGHT = 36;
const OVERSCAN_COUNT = 5;
const DEFAULT_LIST_HEIGHT = 600;

type FlatItem =
  | { kind: "header"; label: string; count: number }
  | { kind: "message"; message: MailMessageSummary };

function buildFlatItems(groups: MailTriageGroup[]): FlatItem[] {
  const items: FlatItem[] = [];
  for (const group of groups) {
    if (group.label)
      items.push({
        kind: "header",
        label: group.label,
        count: group.messages.length,
      });
    for (const msg of group.messages)
      items.push({ kind: "message", message: msg });
  }
  return items;
}

interface MailVirtualRowData {
  items: FlatItem[];
  selectedMessageId: string | null;
  activeFolder: MailFolder;
  canAi: boolean;
  onSelect: (message: MailMessageSummary) => void;
  onAction: (
    messageId: string,
    accountId: number,
    action: MailListAction,
    threadId?: string,
  ) => void;
  onAiBrief: (accountId: number, threadId: string) => void;
}

function getRowHeight(index: number, data: MailVirtualRowData): number {
  const item = data.items[index];
  if (!item || item.kind === "message") return MESSAGE_ROW_HEIGHT;
  return HEADER_ROW_HEIGHT;
}

function getRowKey(index: number, data: MailVirtualRowData): Key {
  const item = data.items[index];
  if (!item) return index;
  if (item.kind === "header") return `h-${item.label}`;
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
}: RowComponentProps<MailVirtualRowData>) {
  const item = items[index];
  if (!item) return <div style={style} {...ariaAttributes} />;

  if (item.kind === "header") {
    return (
      <div
        style={style}
        {...ariaAttributes}
        className="flex items-center justify-between gap-2 px-3 bg-background/90 backdrop-blur-sm border-b border-border/30"
      >
        <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
          {item.label}
        </span>
        <span className="text-micro tabular-nums text-muted-foreground">
          {item.count}
        </span>
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
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  selectedMessageId: string | null;
  activeFolder: MailFolder;
  canAi: boolean;
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
  hasNextPage,
  isFetchingNextPage,
  selectedMessageId,
  activeFolder,
  canAi,
  onSelect,
  onAction,
  onAiBrief,
  onLoadMore,
}: MailVirtualListProps) {
  const items = useMemo(() => buildFlatItems(groups), [groups]);

  const rowProps = useMemo(
    (): MailVirtualRowData => ({
      items,
      selectedMessageId,
      activeFolder,
      canAi,
      onSelect,
      onAction,
      onAiBrief,
    }),
    [
      items,
      selectedMessageId,
      activeFolder,
      canAi,
      onSelect,
      onAction,
      onAiBrief,
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

  const lastTriggerStopIndexRef = useRef(-1);

  const handleRowsRendered = useCallback(
    ({ stopIndex }: { startIndex: number; stopIndex: number }) => {
      if (
        stopIndex >= items.length - 1 &&
        hasNextPage &&
        !isFetchingNextPage &&
        stopIndex !== lastTriggerStopIndexRef.current
      ) {
        lastTriggerStopIndexRef.current = stopIndex;
        onLoadMore();
      }
    },
    [items.length, hasNextPage, isFetchingNextPage, onLoadMore],
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
        style={{ flex: "1 1 0", minHeight: 0 }}
        onRowsRendered={handleRowsRendered}
      />
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={onLoadMore}
        label="Load more messages"
        className="py-2"
      />
    </div>
  );
});
