"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Info } from "lucide-react";
import { AppSheet } from "@/components/shared";
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

const PUBLICATION_STATUS_BADGE: Record<string, string | undefined> = {
  PENDING: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  PUBLISHED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  FAILED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  SKIPPED: "bg-muted text-muted-foreground border-border",
};

const PUBLICATION_STATUS_LABEL: Record<string, string | undefined> = {
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
    header: "Variant ID",
    cell: (row) => (
      <span className="text-sm font-medium font-mono tabular-nums">{row.productVariantId}</span>
    ),
    sortable: true,
    sortValue: (row) => row.productVariantId,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant="outline"
        className={cn("text-dense", PUBLICATION_STATUS_BADGE[row.status] ?? "")}
      >
        {PUBLICATION_STATUS_LABEL[row.status] ?? row.status}
      </Badge>
    ),
  },
  {
    key: "publishedAt",
    header: "Published at",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{formatDate(row.publishedAt)}</span>
    ),
  },
  {
    key: "error",
    header: "Error",
    cell: (row) =>
      row.error ? (
        <TruncatedText text={row.error} className="text-xs text-muted-foreground max-w-[200px]" />
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
  const publications = data?.items ?? [];

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

  const channelType = channel?.type;
  const isExternal = channelType !== undefined && EXTERNAL_CHANNEL_TYPES.has(channelType);

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
            <div className="flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface p-3 mb-4">
              <Info className="h-4 w-4 text-status-warning-ink mt-0.5 shrink-0" />
              <p className="text-xs text-status-warning-ink leading-relaxed">
                Failed publications are awaiting provider connection — they will retry
                automatically once the provider is connected.
              </p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="all">
                All
              </TabsTrigger>
              <TabsTrigger value="failed">
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
