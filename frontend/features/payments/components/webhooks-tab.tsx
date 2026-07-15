"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useGenerateWebhook,
  useWebhookEvents,
  useRetryWebhookEvent,
  usePaymentProviders,
  type PaymentEnvironment,
  type PaymentWebhookEvent,
} from "@/hooks/api/payments";

function buildWebhookColumns(
  retry: { isPending: boolean; mutate: (id: number, opts: { onError: (err: unknown) => void }) => void },
): DataTableColumn<PaymentWebhookEvent>[] {
  return [
    {
      key: "eventType",
      header: "Event",
      className: "text-[12px] font-mono",
      cell: (row) => row.eventType,
    },
    {
      key: "processingStatus",
      header: "Status",
      cell: (row) => (
        <span
          className={cn(
            "text-[11px] font-medium",
            row.processingStatus === "failed" ? "text-rose-600" : "text-emerald-600",
          )}
        >
          {row.processingStatus}
        </span>
      ),
    },
    {
      key: "receivedAt",
      header: "Received",
      className: "text-[11px] text-muted-foreground",
      cell: (row) => new Date(row.receivedAt).toLocaleString(),
    },
    {
      key: "actions",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) =>
        row.processingStatus === "failed" ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs gap-1"
            onClick={() =>
              retry.mutate(row.id, {
                onError: (err) => toast.error(getErrorMessage(err)),
              })
            }
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </Button>
        ) : null,
    },
  ];
}

export function WebhooksTab({ providerKey, environment }: { providerKey: string; environment: PaymentEnvironment }) {
  const { data: providers } = usePaymentProviders();
  const provider = providers?.find((p) => p.providerKey === providerKey);
  const generate = useGenerateWebhook(providerKey);
  const retry = useRetryWebhookEvent(providerKey);
  const { data: events, isLoading } = useWebhookEvents(providerKey);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  function handleGenerate() {
    generate.mutate(environment, {
      onSuccess: (endpoint) => {
        setGeneratedUrl(endpoint.url);
        toast.success("Webhook endpoint generated — add it to your provider's dashboard");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.success("Copied"));
  }

  const environmentEvents: PaymentWebhookEvent[] = (events ?? []).filter((e) => e.environment === environment);
  const columns = buildWebhookColumns(retry);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
        <p className="text-[13px] font-medium text-foreground">
          {environment === "live" ? "Live" : "Test"} webhook endpoint
        </p>
        {generatedUrl ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-[11px] bg-background border border-border rounded px-2 py-1.5 font-mono">
              {generatedUrl}
            </code>
            <Button size="icon" variant="outline" className="w-7 shrink-0" onClick={() => handleCopy(generatedUrl)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Generate an endpoint URL, add it in your provider&apos;s dashboard, and paste the signing secret in
            Credentials. Verification happens automatically the first time a real event arrives.
          </p>
        )}
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={handleGenerate} disabled={generate.isPending}>
          <ShieldCheck className="h-3 w-3" />
          {generatedUrl ? "Regenerate" : "Generate endpoint"}
        </Button>
        {provider && (
          <p className="text-[11px] text-muted-foreground">
            Expected events: card/UPI payments authorized, captured, failed; refunds; subscription charges.
          </p>
        )}
      </div>

      <div>
        <p className="text-[13px] font-medium text-foreground mb-2">Recent events</p>
        {isLoading ? (
          <DataTableSkeleton rows={8} columns={4} />
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
