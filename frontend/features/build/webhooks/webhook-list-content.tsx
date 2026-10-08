"use client";

import type { ComponentProps } from "react";
import { AnimatePresence } from "framer-motion";
import { WebhookBulkBar } from "@/features/build/webhooks/webhook-bulk-bar";
import { WebhookCard } from "@/features/build/settings/webhook-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { PmStaggerList } from "@/components/pm-chrome";
import type { ProjectWebhook } from "@/hooks/api/build/webhooks";

type WebhookCardProps = ComponentProps<typeof WebhookCard>;

interface WebhookListContentProps {
  projectId: number;
  webhookList: ProjectWebhook[];
  canManage: boolean;
  isOnline: boolean;
  density: "compact" | "comfortable";
  expandedId: number | null;
  focusedIndex: number | null;
  onExpandedChange: (webhookId: number, next: boolean) => void;
  onNextPage: () => void;
  pageNumber: number;
  hasMore: boolean;
  hasPrevious: boolean;
  onPrevious: () => void;
  selectedIds: ReadonlySet<number>;
  selectedWebhooks: ProjectWebhook[];
  bulkPending: boolean;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onDelete: WebhookCardProps["onDelete"];
  onToggle: NonNullable<WebhookCardProps["onToggle"]>;
  onSelectedChange: (id: number, selected: boolean) => void;
  onEdit: (webhook: ProjectWebhook) => void;
}

export function WebhookListContent({
  projectId,
  webhookList,
  canManage,
  isOnline,
  density,
  expandedId,
  focusedIndex,
  onExpandedChange,
  onNextPage,
  pageNumber,
  hasMore,
  hasPrevious,
  onPrevious,
  selectedIds,
  selectedWebhooks,
  bulkPending,
  onBulkEnable,
  onBulkDisable,
  onBulkDelete,
  onClearSelection,
  onDelete,
  onToggle,
  onSelectedChange,
  onEdit,
}: WebhookListContentProps) {
  return (
    <BuildPaginatedContent
      ariaLabel="Webhooks"
      footer={(
        <TablePagination
          mode="cursor"
          rowCount={webhookList.length}
          pageNumber={pageNumber}
          hasMore={hasMore}
          hasPrevious={hasPrevious}
          onNext={onNextPage}
          onPrevious={onPrevious}
          hideOnSinglePage
        />
      )}
    >
      {canManage && isOnline && selectedIds.size > 0 && (
        <WebhookBulkBar
          selectedCount={selectedIds.size}
          canEnable={selectedWebhooks.every((wh) => !wh.isActive)}
          canDisable={selectedWebhooks.every((wh) => wh.isActive)}
          isPending={bulkPending}
          onEnable={onBulkEnable}
          onDisable={onBulkDisable}
          onDelete={onBulkDelete}
          onClear={onClearSelection}
        />
      )}
      <div>
        <PmStaggerList className="space-y-2.5" role="list" aria-label="Webhooks">
          <AnimatePresence initial={false}>
            {webhookList.map((wh, index) => (
              <div key={wh.id} role="listitem">
                <WebhookCard
                  webhook={wh}
                  projectId={projectId}
                  onDelete={onDelete}
                  onToggle={canManage ? onToggle : undefined}
                  onEdit={canManage ? onEdit : undefined}
                  canManage={canManage}
                  density={density}
                  focused={index === focusedIndex}
                  expanded={expandedId === wh.id}
                  onExpandedChange={onExpandedChange}
                  selected={selectedIds.has(wh.id)}
                  onSelectedChange={canManage ? onSelectedChange : undefined}
                />
              </div>
            ))}
          </AnimatePresence>
        </PmStaggerList>
      </div>
    </BuildPaginatedContent>
  );
}
