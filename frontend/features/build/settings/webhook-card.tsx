"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  ChevronDownIcon,
  SendIcon,
  Trash2Icon,
} from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useWebhookDeliveries,
  useSendTestWebhook,
  type ProjectWebhook,
  type WebhookDelivery,
} from "@/hooks/api/build/webhooks";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCanState } from "@/hooks/api/access";

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const statusColor =
    delivery.status === "success"
      ? "bg-status-success-fill"
      : delivery.status === "failed"
        ? "bg-status-danger-fill"
        : "bg-status-warning-fill";
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
          {new Date(delivery.deliveredAt).toLocaleTimeString()}
        </span>
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

interface WebhookCardProps {
  webhook: ProjectWebhook;
  projectId: number;
  onDelete: (id: number) => void;
  canManage?: boolean;
}

export function WebhookCard({
  webhook,
  projectId,
  onDelete,
  canManage = false,
}: WebhookCardProps) {
  const accessState = useCanState("build:manage");
  const [expanded, setExpanded] = useState(false);
  const { data: deliveries = [], isLoading } = useWebhookDeliveries(
    projectId,
    webhook.id,
    expanded,
  );
  const sendTest = useSendTestWebhook(projectId);
  const { iconRef: sendIconRef, hoverHandlers: sendHoverHandlers } =
    useAnimatedIcon();
  const { iconRef: chevronIconRef, hoverHandlers: chevronHoverHandlers } =
    useAnimatedIcon();

  const handleToggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  const handleConfirmDelete = useCallback(
    () => onDelete(webhook.id),
    [onDelete, webhook.id],
  );

  const handleSendTest = useCallback(() => {
    sendTest.mutate(webhook.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success("Test delivery succeeded");
        } else {
          toast.error(
            `Test delivery failed (HTTP ${result.responseCode ?? "—"})`,
          );
        }
        setExpanded(true);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [sendTest, webhook.id]);

  if (accessState === "denied" || accessState === "loading") return null;

  return (
    <motion.div
      layout
      className={cn(
        PM_PANEL,
        "overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
      )}
    >
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TruncatedText
              text={webhook.url}
              className="text-sm font-medium text-foreground"
            />
            <Badge
              variant={webhook.isActive ? "default" : "outline"}
              className={cn(
                "shrink-0 text-micro py-0 px-1.5",
                webhook.isActive
                  ? "bg-status-success-fill text-status-success-ink-strong border-transparent"
                  : "bg-muted text-muted-foreground border-border",
              )}
            >
              {webhook.isActive ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {webhook.events.slice(0, 3).map((e) => (
              <Badge
                key={e}
                variant="secondary"
                className="text-micro py-0 px-1.5 bg-muted text-muted-foreground border-border font-mono"
              >
                {e}
              </Badge>
            ))}
            {webhook.events.length > 3 && (
              <Badge variant="secondary" className="text-micro py-0 px-1.5">
                +{webhook.events.length - 3} more
              </Badge>
            )}
            <span className="text-micro text-muted-foreground ml-auto shrink-0">
              since{" "}
              {new Date(webhook.createdAt).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSendTest}
          disabled={sendTest.isPending}
          aria-label="Send test webhook"
          className="w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          {...sendHoverHandlers}
        >
          <SendIcon
            ref={sendIconRef}
            size={14}
            className="text-muted-foreground"
          />
        </button>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={expanded ? "Hide deliveries" : "Show deliveries"}
          className="w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          {...chevronHoverHandlers}
        >
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDownIcon
              ref={chevronIconRef}
              size={16}
              className="text-muted-foreground"
            />
          </motion.div>
        </button>
        {canManage && (
          <ConfirmDialog
            title="Delete webhook?"
            description="Deliveries will stop immediately. This cannot be undone."
            confirmLabel="Delete"
            destructive
            onConfirm={handleConfirmDelete}
            trigger={
              <AnimatedIconButton
                variant="ghost"
                size="icon"
                aria-label="Delete webhook"
                className="w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                icon={Trash2Icon}
                iconSize={14}
              />
            }
          />
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-3.5">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Recent Deliveries
              </p>
              {isLoading ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : deliveries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No deliveries yet
                </p>
              ) : (
                <div className="rounded-md border border-border overflow-hidden bg-muted/20">
                  {deliveries.slice(0, 5).map((d) => (
                    <DeliveryRow key={d.id} delivery={d} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
