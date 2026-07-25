"use client";

import { useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useHrWebhookDeliveries,
  useRedeliverHrWebhook,
} from "@/hooks/api/hr/hr-webhooks";
import type { HrWebhookSubscription, HrWebhookDelivery, HrWebhookDeliveryStatus } from "@/types/hr/webhooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: HrWebhookSubscription;
}

function statusBadge(status: HrWebhookDeliveryStatus) {
  if (status === "delivered") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">
        Delivered
      </Badge>
    );
  }
  if (status === "dead") {
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[11px]">
        Dead
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]">
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px]">
      Pending
    </Badge>
  );
}

function DeliveryRow({
  delivery,
  subscriptionId,
}: {
  delivery: HrWebhookDelivery;
  subscriptionId: number;
}) {
  const redeliver = useRedeliverHrWebhook();

  const handleRedeliver = useCallback(async () => {
    try {
      await redeliver.mutateAsync({ subscriptionId, deliveryId: delivery.id });
      toast.success("Re-delivery queued");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }, [redeliver, subscriptionId, delivery.id]);

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge(delivery.status)}
          <code className="text-[11px] text-muted-foreground font-mono">{delivery.event}</code>
          {delivery.responseStatus && (
            <span className="text-[11px] text-muted-foreground">
              HTTP {delivery.responseStatus}
            </span>
          )}
        </div>
        {delivery.error && (
          <TruncatedText text={delivery.error} className="text-xs text-red-600 min-w-0" />
        )}
        <p className="text-[11px] text-muted-foreground">
          {delivery.lastAttemptAt
            ? formatDistanceToNow(new Date(delivery.lastAttemptAt), { addSuffix: true })
            : "Not attempted yet"}{" "}
          · {delivery.attempts} attempt{delivery.attempts !== 1 ? "s" : ""}
        </p>
      </div>
      {(delivery.status === "failed" || delivery.status === "dead") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <LoadingButton
              variant="ghost"
              size="icon"
              className="shrink-0 h-7 w-7"
              onClick={handleRedeliver}
              isPending={redeliver.isPending}
              aria-label="Re-deliver"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </LoadingButton>
          </TooltipTrigger>
          <TooltipContent>Re-deliver</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function WebhookDeliveriesSheet({ open, onOpenChange, subscription }: Props) {
  const { data: deliveries, isLoading } = useHrWebhookDeliveries(subscription.id, 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>
            <TruncatedText text={`Deliveries — ${subscription.name}`} className="min-w-0" />
          </SheetTitle>
          <TruncatedText
            text={subscription.url}
            className="text-xs text-muted-foreground font-mono min-w-0"
          />
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="px-4 py-3 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : !deliveries || deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-sm text-muted-foreground">
              <p>No deliveries yet.</p>
              <p className="text-xs mt-1">Use the Test button to send a sample payload.</p>
            </div>
          ) : (
            <div>
              {deliveries.map((d) => (
                <DeliveryRow key={d.id} delivery={d} subscriptionId={subscription.id} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
