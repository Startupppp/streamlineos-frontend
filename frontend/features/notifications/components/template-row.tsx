"use client";

import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EyeIcon, UserPenIcon, Trash2Icon } from "@animateicons/react/lucide";
import {
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/features/notifications/notification-types";
import type {
  NotificationTemplate
} from "@/types/notifications";

function requiresApproval(template: NotificationTemplate): boolean {
  return template.channel === "WHATSAPP" || template.channel === "SMS";
}

export function TemplateRow({
  template,
  idx,
  onPreview,
  onEdit,
  onDelete,
  onApproval,
}: {
  template: NotificationTemplate;
  idx: number;
  onPreview: (t: NotificationTemplate) => void;
  onEdit: (t: NotificationTemplate) => void;
  onDelete: (t: NotificationTemplate) => void;
  onApproval: (t: NotificationTemplate) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const previewAnim = useAnimatedIcon();
  const editAnim = useAnimatedIcon();
  const deleteAnim = useAnimatedIcon();

  const catConfig = template.category
    ? NOTIFICATION_CATEGORY_CONFIG[template.category]
    : null;

  const handlePreviewClick = useCallback(
    () => onPreview(template),
    [onPreview, template],
  );
  const handleEditClick = useCallback(
    () => onEdit(template),
    [onEdit, template],
  );
  const handleDeleteClick = useCallback(
    () => onDelete(template),
    [onDelete, template],
  );
  const handleApprovalClick = useCallback(
    () => onApproval(template),
    [onApproval, template],
  );

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: Math.min(idx, 10) * 0.04,
        ease: "easeOut",
      }}
      className="group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{template.name}</span>
          <Badge variant="outline" className="text-micro h-4 px-1.5 shrink-0">
            {template.channel}
          </Badge>
          {catConfig && (
            <Badge
              variant="secondary"
              className="text-micro h-4 px-1.5 shrink-0"
            >
              {catConfig.label}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={cn(
              "text-micro h-4 px-1.5 shrink-0",
              template.isActive
                ? "border-status-success-rule text-status-success-ink"
                : "text-muted-foreground",
            )}
          >
            {template.isActive ? "Active" : "Inactive"}
          </Badge>
          {/* COMP-004/005: WhatsApp and SMS refuse an unapproved template, so a template
              that looks Active can still send nothing. Say so on the card. */}
          {requiresApproval(template) &&
            template.approvalStatus !== "APPROVED" && (
              <Badge
                variant="outline"
                className="text-micro h-4 px-1.5 shrink-0 border-status-warning-rule text-status-warning-ink"
              >
                {template.approvalStatus === "REJECTED"
                  ? "Rejected"
                  : "Not approved"}
              </Badge>
            )}
        </div>
        <p className="mt-0.5 text-dense font-mono text-muted-foreground/70">
          {template.templateKey}
        </p>
        {template.subject && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">
            Subject: {template.subject}
          </p>
        )}
        <p className="text-dense text-muted-foreground/50 mt-0.5">
          v{template.version} Â· {template.locale}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Preview template"
          onClick={handlePreviewClick}
          {...previewAnim.hoverHandlers}
        >
          <EyeIcon
            ref={previewAnim.iconRef}
            size={12}
            className="text-muted-foreground"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Edit template"
          onClick={handleEditClick}
          {...editAnim.hoverHandlers}
        >
          <UserPenIcon
            ref={editAnim.iconRef}
            size={12}
            className="text-muted-foreground"
          />
        </Button>
        {requiresApproval(template) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Submit for provider approval"
            onClick={handleApprovalClick}
          >
            <BadgeCheck size={12} className="text-muted-foreground" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:text-destructive"
          aria-label="Delete template"
          onClick={handleDeleteClick}
          {...deleteAnim.hoverHandlers}
        >
          <Trash2Icon
            ref={deleteAnim.iconRef}
            size={12}
            className="text-muted-foreground"
          />
        </Button>
      </div>
    </motion.div>
  );
}
