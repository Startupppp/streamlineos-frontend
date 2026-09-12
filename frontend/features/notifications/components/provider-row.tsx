"use client";

import { useCallback } from "react";
import { FlaskConical, Server } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  UserPenIcon,
  Trash2Icon,
} from "@animateicons/react/lucide";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type {
  NotificationProvider,
} from "@/types/notifications";

function HealthDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        status === "healthy" && "bg-status-success-fill",
        status === "unhealthy" && "bg-status-danger-fill",
        status !== "healthy" && status !== "unhealthy" && "bg-muted-foreground/40",
      )}
      title={status}
    />
  );
}

export function ProviderRow({
  provider,
  idx,
  canManage,
  testingId,
  onTest,
  onEdit,
  onDelete,
}: {
  provider: NotificationProvider;
  idx: number;
  canManage: boolean;
  testingId: number | null;
  onTest: (p: NotificationProvider) => void;
  onEdit: (p: NotificationProvider) => void;
  onDelete: (p: NotificationProvider) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const editAnim = useAnimatedIcon();
  const deleteAnim = useAnimatedIcon();

  const handleTestClick = useCallback(() => onTest(provider), [onTest, provider]);
  const handleEditClick = useCallback(() => onEdit(provider), [onEdit, provider]);
  const handleDeleteClick = useCallback(() => onDelete(provider), [onDelete, provider]);

  const isTesting = testingId === provider.id;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(idx, 10) * 0.04, ease: "easeOut" }}
      className="group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-2 mt-0.5 shrink-0">
        <HealthDot status={provider.healthStatus} />
        <Server className="h-3.5 w-3.5 text-muted-foreground/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{provider.displayName}</span>
          <Badge
            variant="outline"
            className="text-micro h-4 px-1.5 shrink-0"
          >
            {provider.channel}
          </Badge>
          <Badge
            variant="secondary"
            className="text-micro h-4 px-1.5 shrink-0"
          >
            {provider.provider}
          </Badge>
          {provider.isDefault && (
            <Badge
              variant="outline"
              className="text-micro h-4 px-1.5 shrink-0 border-primary/30 text-primary"
            >
              Default
            </Badge>
          )}
          {provider.sandboxMode && (
            <Badge
              variant="outline"
              className="text-micro h-4 px-1.5 shrink-0 border-status-warning-rule text-status-warning-ink"
            >
              Sandbox
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "text-micro h-4 px-1.5 shrink-0",
              provider.enabled
                ? "border-status-success-rule text-status-success-ink"
                : "text-muted-foreground",
            )}
          >
            {provider.enabled ? "Enabled" : "Disabled"}
          </Badge>
          {!provider.hasCredentials && (
            <Badge
              variant="outline"
              className="text-micro h-4 px-1.5 shrink-0 border-destructive/40 text-destructive"
            >
              No credentials
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 flex-wrap">
          {provider.dailySendLimit != null && (
            <span className="text-dense text-muted-foreground/70">
              Limit: {provider.dailySendLimit.toLocaleString()}/day
            </span>
          )}
          {provider.monthlyCostLimit != null && (
            <span className="text-dense text-muted-foreground/70">
              Cost cap: ${provider.monthlyCostLimit}/mo
            </span>
          )}
          {provider.lastTestedAt && (
            <span className="text-dense text-muted-foreground/50">
              Tested {formatRelativeTime(provider.lastTestedAt)}
            </span>
          )}
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Test provider"
            onClick={handleTestClick}
            disabled={isTesting}
          >
            <FlaskConical className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Edit provider"
            onClick={handleEditClick}
            {...editAnim.hoverHandlers}
          >
            <UserPenIcon ref={editAnim.iconRef} size={12} className="text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            aria-label="Delete provider"
            onClick={handleDeleteClick}
            {...deleteAnim.hoverHandlers}
          >
            <Trash2Icon ref={deleteAnim.iconRef} size={12} className="text-muted-foreground" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
