"use client";

import { memo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  WEBHOOK_EVENT_LABELS,
  type WebhookEvent,
} from "@/hooks/api/inventory/webhooks";

interface RetryEventButtonProps {
  eventId: number;
  isPending: boolean;
  onRetry: (id: number) => void;
}

export const RetryEventButton = memo(function RetryEventButton({
  eventId,
  isPending,
  onRetry,
}: RetryEventButtonProps) {
  function handleClick(): void {
    onRetry(eventId);
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-xs px-2"
      disabled={isPending}
      onClick={handleClick}
    >
      Retry
    </Button>
  );
});

function buildEventColumns(
  canManage: boolean,
  isRetrying: boolean,
  onRetry: (id: number) => void,
): DataTableColumn<WebhookEvent>[] {
  return [
    {
      key: "eventType",
      header: "Event",
      cell: (ev) => WEBHOOK_EVENT_LABELS[ev.eventType] ?? ev.eventType,
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[90px]",
      cell: (ev) => (
        <Badge
          variant="outline"
          className={
            ev.status === "DELIVERED"
              ? "h-4 text-[9px] px-1.5 py-0 border border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:bg-emerald-500/10"
              : ev.status === "FAILED"
                ? "h-4 text-[9px] px-1.5 py-0 border border-red-200 text-red-700 bg-red-50 dark:border-red-500/30 dark:text-red-300 dark:bg-red-500/10"
                : "h-4 text-[9px] px-1.5 py-0 border"
          }
        >
          {ev.status}
        </Badge>
      ),
    },
    {
      key: "attempts",
      header: "Tries",
      headerClassName: "w-[50px] text-right",
      className: "text-right tabular-nums",
      cell: (ev) => ev.attempts,
    },
    {
      key: "createdAt",
      header: "Date",
      headerClassName: "w-[110px]",
      className: "text-muted-foreground",
      cell: (ev) => format(new Date(ev.createdAt), "dd MMM HH:mm"),
    },
    {
      key: "retry",
      header: "",
      headerClassName: "w-[70px]",
      cell: (ev) =>
        ev.status === "FAILED" && canManage ? (
          <RetryEventButton eventId={ev.id} isPending={isRetrying} onRetry={onRetry} />
        ) : null,
    },
  ];
}

export interface WebhookDeliveryLogProps {
  webhookId: number;
  events: WebhookEvent[];
  isLoading: boolean;
  canManage: boolean;
  isRetrying: boolean;
  onRetry: (eventId: number) => void;
}

export function WebhookDeliveryLog({
  webhookId,
  events,
  isLoading,
  canManage,
  isRetrying,
  onRetry,
}: WebhookDeliveryLogProps) {
  const columns = buildEventColumns(canManage, isRetrying, onRetry);

  return (
    <div className="border-t px-4 py-3">
      <p className="text-xs font-semibold mb-2 text-muted-foreground">
        Recent Events (Webhook #{webhookId})
      </p>
      <DataTable
        data={events}
        columns={columns}
        getRowKey={(ev) => ev.id}
        isLoading={isLoading}
        emptyState={
          <div className="py-4 text-center text-xs text-muted-foreground">No events yet.</div>
        }
        minWidth="480px"
      />
    </div>
  );
}
