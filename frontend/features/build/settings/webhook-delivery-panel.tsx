"use client";

import { useState, useCallback } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useWebhookDeliveries, useRetryDelivery } from "@/hooks/api/build/webhooks";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import type { WebhookDeliveryItem } from "@/hooks/api/build/webhook-lifecycle-schema";
import { cn } from "@/lib/utils";

function DeliveryRow({
  delivery,
  projectId,
  webhookId,
}: {
  delivery: WebhookDeliveryItem;
  projectId: number;
  webhookId: number;
}) {
  const retry = useRetryDelivery(projectId, webhookId);
  const statusColor =
    delivery.status === "success"
      ? "bg-status-success-fill"
      : delivery.status === "failed"
        ? "bg-status-danger-fill"
        : "bg-status-warning-fill";

  const handleRetry = useCallback(() => {
    retry.mutate(delivery.id, {
      onSuccess: (r) => {
        if (r.success) {
          toast.success("Retry succeeded");
        } else {
          toast.error(`Retry failed (HTTP ${r.responseCode ?? "—"})`);
        }
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [retry, delivery.id]);

  return (
    <div className="py-2 px-3 border-b last:border-0">
      <div className="flex items-center gap-3 text-sm">
        <div className={cn("h-2 w-2 rounded-full shrink-0", statusColor)} />
        <span
          className="min-w-0 flex-1 font-mono text-xs text-muted-foreground truncate"
          title={delivery.event}
        >
          {delivery.event}
        </span>
        <Badge variant="outline" className="text-micro shrink-0 font-mono">
          {delivery.responseCode ?? "—"}
        </Badge>
        {delivery.attempts > 1 && (
          <Badge variant="secondary" className="text-micro shrink-0">
            {delivery.attempts}x
          </Badge>
        )}
        <span className="text-micro text-muted-foreground shrink-0">
          {new Date(delivery.createdAt).toLocaleTimeString()}
        </span>
        {delivery.status === "failed" && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retry.isPending}
            aria-label="Retry delivery"
            className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
      {delivery.lastError && delivery.status === "failed" && (
        <p
          className="mt-0.5 ml-5 text-micro text-status-danger-ink-strong truncate"
          title={delivery.lastError}
        >
          {delivery.lastError}
        </p>
      )}
    </div>
  );
}

interface WebhookDeliveryPanelProps {
  projectId: number;
  webhookId: number;
  expanded: boolean;
}

export function WebhookDeliveryPanel({
  projectId,
  webhookId,
  expanded,
}: WebhookDeliveryPanelProps) {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<number[]>([]);
  const canViewDeliveries = useCan("build:manage");
  const { data, isLoading } = useWebhookDeliveries(projectId, webhookId, expanded, cursor);
  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;
  const hasPrevious = cursorStack.length > 0;

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor ?? -1]);
    setCursor(nextCursor);
  }, [nextCursor, cursor]);

  const handlePrevious = useCallback(() => {
    const prev = [...cursorStack];
    const last = prev.pop();
    setCursorStack(prev);
    setCursor(last === -1 ? undefined : last);
  }, [cursorStack]);

  return (
    <div className="p-3.5">
      <p className="text-xs font-normal text-muted-foreground mb-2 flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        Recent Deliveries
      </p>
      {!canViewDeliveries ? (
        <NoPermissionState permission="build:manage" compact />
      ) : isLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No deliveries yet
        </p>
      ) : (
        <>
          <div className="rounded-md border border-border overflow-hidden bg-muted/20">
            {items.map((d) => (
              <DeliveryRow key={d.id} delivery={d} projectId={projectId} webhookId={webhookId} />
            ))}
          </div>
          <TablePagination
            mode="cursor"
            rowCount={items.length}
            pageNumber={cursorStack.length + 1}
            hasMore={nextCursor !== null}
            hasPrevious={hasPrevious}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hideOnSinglePage
            compact
            showSummary={false}
            className="mt-2"
          />
        </>
      )}
    </div>
  );
}
