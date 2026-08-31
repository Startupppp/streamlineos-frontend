"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { SendIcon, UserPenIcon, Trash2Icon } from "@animateicons/react/lucide";
import { NOTIFICATION_CATEGORY_CONFIG } from "@/features/notifications/notification-types";
import type { Broadcast } from "@/types/notifications";
import { STATUS_CONFIG, formatDate } from "./broadcast-config";

export function BroadcastRow({
  broadcast,
  idx,
  onPublish,
  onCancel,
  onEdit,
  onDelete,
  canManage = false,
}: {
  broadcast: Broadcast;
  idx: number;
  onPublish: (b: Broadcast) => void;
  onCancel: (b: Broadcast) => void;
  onEdit: (b: Broadcast) => void;
  onDelete: (b: Broadcast) => void;
  canManage?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const sendAnim = useAnimatedIcon();
  const editAnim = useAnimatedIcon();
  const deleteAnim = useAnimatedIcon();

  const statusCfg = STATUS_CONFIG[broadcast.status] ?? STATUS_CONFIG.DRAFT;
  const canPublish = broadcast.status === "DRAFT" || broadcast.status === "SCHEDULED";
  const canCancel =
    broadcast.status === "QUEUED" ||
    broadcast.status === "SENDING" ||
    broadcast.status === "SCHEDULED";
  const canEdit = broadcast.status === "DRAFT" || broadcast.status === "SCHEDULED";
  const canDelete =
    broadcast.status === "DRAFT" ||
    broadcast.status === "FAILED" ||
    broadcast.status === "CANCELLED" ||
    broadcast.status === "SENT";

  const handlePublishClick = useCallback(
    () => onPublish(broadcast),
    [onPublish, broadcast],
  );
  const handleCancelClick = useCallback(
    () => onCancel(broadcast),
    [onCancel, broadcast],
  );
  const handleEditClick = useCallback(
    () => onEdit(broadcast),
    [onEdit, broadcast],
  );
  const handleDeleteClick = useCallback(
    () => onDelete(broadcast),
    [onDelete, broadcast],
  );

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(idx, 10) * 0.04, ease: "easeOut" }}
      className="group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate">{broadcast.title}</span>
          <Badge variant="outline" className={cn("text-micro h-4 px-1.5 shrink-0", statusCfg.className)}>
            {statusCfg.label}
          </Badge>
          <Badge variant="secondary" className="text-micro h-4 px-1.5 shrink-0">
            {NOTIFICATION_CATEGORY_CONFIG[broadcast.category]?.label ?? broadcast.category}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{broadcast.message}</p>
        <div className="flex items-center gap-3 mt-0.5 text-dense text-muted-foreground/60">
          {broadcast.status === "SENT" && (
            <span>{broadcast.deliveredCount} / {broadcast.recipientCount} delivered</span>
          )}
          {broadcast.scheduledAt && <span>Scheduled {formatDate(broadcast.scheduledAt)}</span>}
          {broadcast.sentAt && <span>Sent {formatDate(broadcast.sentAt)}</span>}
          <span>Audience: {broadcast.audience?.type ?? "all"}</span>
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {canPublish && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 px-2"
              onClick={handlePublishClick}
              {...sendAnim.hoverHandlers}
            >
              <SendIcon ref={sendAnim.iconRef} size={12} />
              Send
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Cancel broadcast"
              onClick={handleCancelClick}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Edit broadcast"
              onClick={handleEditClick}
              {...editAnim.hoverHandlers}
            >
              <UserPenIcon ref={editAnim.iconRef} size={12} className="text-muted-foreground" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              aria-label="Delete broadcast"
              onClick={handleDeleteClick}
              {...deleteAnim.hoverHandlers}
            >
              <Trash2Icon ref={deleteAnim.iconRef} size={12} className="text-muted-foreground" />
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
