"use client";

import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import type { AiCreditTransaction } from "@/hooks/api/ai-credits";
import {
  TXN_COLUMNS,
  getTxnRowKey,
} from "@/features/billing/components/ai-credit-txn-columns";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";

interface AiCreditsHistoryTabProps {
  txns: AiCreditTransaction[];
  txnLoading: boolean;
  txnError: boolean;
  txnErrorObj: unknown;
  txnLimit: number;
  hasMore: boolean;
  hasPrevious: boolean;
  isFirstPage: boolean;
  onRetry: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onPageSizeChange: (size: number) => void;
}

export function AiCreditsHistoryTab({
  txns,
  txnLoading,
  txnError,
  txnErrorObj,
  txnLimit,
  hasMore,
  hasPrevious,
  isFirstPage,
  onRetry,
  onNext,
  onPrevious,
  onPageSizeChange,
}: AiCreditsHistoryTabProps) {
  return (
    <section
      className={cn(
        CONTENT_PANEL_SOLID,
        "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
      )}
    >
      {txnLoading ? (
        <DataTableSkeleton fill columns={8} />
      ) : txnError ? (
        <ErrorState
          title="Failed to load transactions"
          description={getErrorMessage(txnErrorObj)}
          onRetry={onRetry}
          compact
          className="flex-1 border-0 bg-transparent py-8"
        />
      ) : txns.length === 0 && isFirstPage ? (
        <EmptyState
          illustrationPreset="report"
          title="No transactions yet"
          description="Credits will appear here once used."
          className="flex-1 border-0 bg-transparent py-8"
          compact
        />
      ) : (
        <DataTable
          data={txns}
          columns={TXN_COLUMNS}
          getRowKey={getTxnRowKey}
          className="min-h-0 flex-1 rounded-none border-0"
          scrollRegionLabel="Transaction history"
          pagination={{
            mode: "cursor",
            pageSize: txnLimit,
            hasMore,
            hasPrevious,
            onNext,
            onPrevious,
            onPageSizeChange,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
            showSummary: false,
          }}
        />
      )}
    </section>
  );
}
