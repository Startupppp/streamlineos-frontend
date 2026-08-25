"use client";

import { useState, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { RichPanel, RichSectionHeader } from "@/components/shared/rich-surface";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useWebhookLogs,
  useRetryDelivery,
  type WebhookEndpoint,
  type WebhookLog,
} from "@/hooks/api/webhooks";

const LOG_PAGE_SIZE = 20;

interface WebhookDeliveryLogSheetProps {
  webhook: WebhookEndpoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
}

interface LogRowProps {
  log: WebhookLog;
  endpointId: number;
  canManage: boolean;
}

function LogRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-3 w-48 ml-4" />
    </div>
  );
}

function LogRow({ log, endpointId, canManage }: LogRowProps) {
  const retry = useRetryDelivery(endpointId);

  const handleRetry = useCallback(() => {
    retry.mutate(log.id, {
      onSuccess: () =>
        toast.success("Retry queued — a new delivery attempt is being made"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [retry, log.id]);

  const isBlocked = log.responseBody?.startsWith("Blocked:") ?? false;

  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 mt-1 ${log.success ? "bg-status-success-surface" : "bg-destructive"}`}
          />
          <span className="text-sm font-mono font-medium truncate">
            {log.event}
          </span>
          {isBlocked && (
            <Badge
              variant="outline"
              className="text-micro shrink-0 border-status-warning-rule text-status-warning-ink bg-status-warning-surface"
            >
              Blocked
            </Badge>
          )}
          {!isBlocked && log.statusCode !== null && (
            <Badge
              variant={log.success ? "outline" : "destructive"}
              className="text-micro shrink-0"
            >
              {log.statusCode}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(log.createdAt).toLocaleString("en-IN", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
          {canManage && !log.success && (
            <LoadingButton
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              isPending={retry.isPending}
              onClick={handleRetry}
              aria-label="Retry delivery"
            >
              <RotateCcw className="h-3 w-3" />
            </LoadingButton>
          )}
        </div>
      </div>
      {log.responseBody && (
        <p className="text-xs text-muted-foreground font-mono pl-4 leading-relaxed line-clamp-2 break-all">
          {log.responseBody}
        </p>
      )}
    </div>
  );
}

export function WebhookDeliveryLogSheet({
  webhook,
  open,
  onOpenChange,
  canManage,
}: WebhookDeliveryLogSheetProps) {
  const [page, setPage] = useState(1);
  const endpointId = webhook !== null ? webhook.id : 0;

  const { data, isLoading, isError, error, refetch } = useWebhookLogs(
    webhook !== null ? webhook.id : null,
    { page, limit: LOG_PAGE_SIZE },
  );

  const logs = data?.data ?? [];
  const pagination = data?.pagination;

  const handlePageChange = useCallback((next: number) => setPage(next), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) setPage(1);
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Delivery Logs</SheetTitle>
          {webhook && (
            <p className="text-sm text-muted-foreground truncate">{webhook.url}</p>
          )}
        </SheetHeader>
        <SheetBody className="px-4 py-4 flex flex-col min-h-0">
          <RichPanel padded={false} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="px-4 pt-4 pb-2 shrink-0">
              <RichSectionHeader
                title="Recent deliveries"
                description="Each row is one attempt. Click the retry icon to re-send a failed event."
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4">
              {isLoading ? (
                <div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <LogRowSkeleton key={i} />
                  ))}
                </div>
              ) : isError ? (
                <ErrorState
                  title="Couldn't load logs"
                  description={getErrorMessage(error)}
                  onRetry={handleRetry}
                  compact
                  className="flex-1"
                />
              ) : logs.length === 0 ? (
                <EmptyState
                  compact
                  title="No deliveries yet"
                  description="Events sent to this endpoint will appear here once the first one fires."
                  className="flex-1"
                />
              ) : (
                <div>
                  {logs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      endpointId={endpointId}
                      canManage={canManage}
                    />
                  ))}
                </div>
              )}
            </div>
            {!isLoading && !isError && logs.length > 0 && pagination && (
              <TablePagination
                page={page}
                pageSize={LOG_PAGE_SIZE}
                total={pagination.total}
                onPageChange={handlePageChange}
              />
            )}
          </RichPanel>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
