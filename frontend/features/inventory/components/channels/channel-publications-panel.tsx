"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Info } from "lucide-react";
import { AppSheet } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useChannelPublications,
  useRetryChannelPublications,
  type Channel,
  type Publication,
  type PublicationStatus,
} from "@/hooks/api/inventory/channels";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

const PUBLICATION_STATUS_BADGE: Record<PublicationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  FAILED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  SKIPPED: "bg-muted text-muted-foreground border-border",
};

const PUBLICATION_STATUS_LABEL: Record<PublicationStatus, string> = {
  PENDING: "Pending",
  PUBLISHED: "Published",
  FAILED: "Failed",
  SKIPPED: "Skipped",
};

const EXTERNAL_CHANNEL_TYPES = new Set(["SHOPIFY", "WOOCOMMERCE", "MARKETPLACE", "B2B", "THREE_PL"]);

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const PUBLICATION_COLUMNS: DataTableColumn<Publication>[] = [
  {
    key: "variant",
    header: "Variant",
    cell: (row) => <TruncatedText text={row.variantName} className="text-sm font-medium" />,
    sortable: true,
    sortValue: (row) => row.variantName,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant="outline"
        className={cn("text-[11px]", PUBLICATION_STATUS_BADGE[row.status])}
      >
        {PUBLICATION_STATUS_LABEL[row.status]}
      </Badge>
    ),
  },
  {
    key: "synced",
    header: "Synced at",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{formatDate(row.syncedAt)}</span>
    ),
  },
  {
    key: "error",
    header: "Error",
    cell: (row) =>
      row.errorMessage ? (
        <TruncatedText text={row.errorMessage} className="text-xs text-muted-foreground max-w-[200px]" />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
];

interface PublicationsTableProps {
  channelId: number;
  statusFilter?: PublicationStatus;
  showRetry: boolean;
}

function PublicationsTable({ channelId, statusFilter, showRetry }: PublicationsTableProps) {
  const retryMutation = useRetryChannelPublications();
  const { data, isLoading } = useChannelPublications(channelId, statusFilter);
  const publications = data ?? [];

  function handleRetryAll(): void {
    retryMutation.mutate(channelId, {
      onSuccess: () => toast.success("Retry queued for failed publications"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-2 mt-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (publications.length === 0) {
    return (
      <InventoryEmptyState
        compact
        title="No publications"
        description={
          statusFilter === "FAILED"
            ? "No failed publications at this time."
            : "No publication records found."
        }
        className="mt-3"
      />
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {showRetry && (
        <div className="flex justify-end">
          <LoadingButton
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={handleRetryAll}
            isPending={retryMutation.isPending}
            loadingText="Retrying…"
          >
            <RefreshCw className="h-3 w-3" />
            Retry all
          </LoadingButton>
        </div>
      )}
      <DataTable<Publication>
        data={publications}
        columns={PUBLICATION_COLUMNS}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

interface ChannelPublicationsPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: Channel | null;
}

export function ChannelPublicationsPanel({
  open,
  onOpenChange,
  channel,
}: ChannelPublicationsPanelProps) {
  const [activeTab, setActiveTab] = useState<"all" | "failed">("all");

  const isExternal = channel !== null && EXTERNAL_CHANNEL_TYPES.has(channel.channelType);

  function handleTabChange(value: string): void {
    setActiveTab(value as "all" | "failed");
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={channel ? `Publications — ${channel.name}` : "Publications"}
      description="Review stock publication records for this channel."
    >
      {channel && (
        <>
          {isExternal && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 p-3 mb-4">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Failed publications are awaiting provider connection — they will retry
                automatically once the provider is connected.
              </p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="failed" className="flex-1">
                Failed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <PublicationsTable
                channelId={channel.id}
                showRetry={false}
              />
            </TabsContent>

            <TabsContent value="failed">
              <PublicationsTable
                channelId={channel.id}
                statusFilter="FAILED"
                showRetry={!isExternal}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </AppSheet>
  );
}
