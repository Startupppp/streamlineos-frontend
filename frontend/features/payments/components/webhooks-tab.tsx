"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CopyIcon, ShieldCheckIcon } from "@animateicons/react/lucide";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  useGenerateWebhook,
  useWebhookEvents,
  useRetryWebhookEvent,
  usePaymentProviders,
  type PaymentEnvironment,
  type PaymentWebhookEvent,
} from "@/hooks/api/payments";

type RetryMutation = {
  isPending: boolean;
  mutate: (id: number, opts: { onError: (err: unknown) => void }) => void;
};

function RetryEventButton({ eventId, retry }: { eventId: number; retry: RetryMutation }) {
  function handleRetry() {
    retry.mutate(eventId, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handleRetry}>
      <RefreshCw className="h-3 w-3" /> Retry
    </Button>
  );
}

function buildWebhookColumns(retry: RetryMutation, canManage: boolean): DataTableColumn<PaymentWebhookEvent>[] {
  return [
    {
      key: "eventType",
      header: "Event",
      className: "text-xs font-mono",
      cell: (row) => row.eventType,
    },
    {
      key: "processingStatus",
      header: "Status",
      cell: (row) => (
        <span
          className={cn(
            "text-dense font-medium",
            row.processingStatus === "failed" ? "text-status-danger-ink" : "text-status-success-ink",
          )}
        >
          {row.processingStatus}
        </span>
      ),
    },
    {
      key: "receivedAt",
      header: "Received",
      className: "text-dense text-muted-foreground",
      cell: (row) => new Date(row.receivedAt).toLocaleString(),
    },
    {
      key: "actions",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) =>
        canManage && row.processingStatus === "failed" ? (
          <RetryEventButton eventId={row.id} retry={retry} />
        ) : null,
    },
  ];
}

export function WebhooksTab({ providerKey, environment }: { providerKey: string; environment: PaymentEnvironment }) {
  const canManage = useCan("payments:webhooks:manage");
  const canViewEvents = useCan("payments:webhooks:view");
  const { data: providers } = usePaymentProviders();
  const provider = providers?.find((p) => p.providerKey === providerKey);
  const generate = useGenerateWebhook(providerKey);
  const retry = useRetryWebhookEvent(providerKey);
  const {
    data: events,
    isLoading,
    isError,
    error,
    refetch,
  } = useWebhookEvents(providerKey);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  function handleRetryLoad() {
    void refetch();
  }

  function handleGenerate() {
    generate.mutate(environment, {
      onSuccess: (endpoint) => {
        setGeneratedUrl(endpoint.url);
        toast.success("Webhook endpoint generated — add it to your provider's dashboard");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCopyUrl() {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl).then(() => toast.success("Copied"));
  }

  const environmentEvents: PaymentWebhookEvent[] = (events ?? []).filter((e) => e.environment === environment);
  const columns = buildWebhookColumns(retry, canManage);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
        <p className="text-label font-medium text-foreground">
          {environment === "live" ? "Live" : "Test"} webhook endpoint
        </p>
        {generatedUrl ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-dense bg-background border border-border rounded px-2 py-1.5 font-mono">
              {generatedUrl}
            </code>
            <AnimatedIconButton icon={CopyIcon} iconSize={12} size="icon" variant="outline" className="w-7 shrink-0" aria-label="Copy webhook URL" onClick={handleCopyUrl} />
          </div>
        ) : (
          <p className="text-dense text-muted-foreground">
            Generate an endpoint URL, add it in your provider&apos;s dashboard, and paste the signing secret in
            Credentials. Verification happens automatically the first time a real event arrives.
          </p>
        )}
        {canManage ? (
          <AnimatedIconButton icon={ShieldCheckIcon} iconSize={12} iconClassName="mr-1.5" size="sm" variant="outline" className="text-xs" onClick={handleGenerate} disabled={generate.isPending}>
            {generatedUrl ? "Regenerate" : "Generate endpoint"}
          </AnimatedIconButton>
        ) : null}
        {provider && (
          <p className="text-dense text-muted-foreground">
            Expected events: card/UPI payments authorized, captured, failed; refunds; subscription charges.
          </p>
        )}
      </div>

      <div>
        <p className="text-label font-medium text-foreground mb-2">Recent events</p>
        {!canViewEvents ? (
          <NoPermissionState
            compact
            permission="payments:webhooks:view"
            title="Webhook events hidden"
            description="You do not have permission to view this provider's received webhook events."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={8} columns={4} />
        ) : isError ? (
          <ErrorState
            compact
            title="Failed to load webhook events"
            description={getErrorMessage(error)}
            onRetry={handleRetryLoad}
          />
        ) : environmentEvents.length === 0 ? (
          <EmptyState title="No webhook events yet" description="Events will appear here as they're received." compact />
        ) : (
          <DataTable
            data={environmentEvents}
            columns={columns}
            getRowKey={(row) => row.id}
          />
        )}
      </div>
    </div>
  );
}
