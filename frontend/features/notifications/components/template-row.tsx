"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";
import { TemplateApprovalDialog } from "@/features/notifications/components/template-approval-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EyeIcon, UserPenIcon, Trash2Icon } from "@animateicons/react/lucide";
import {
  useNotificationTemplates,
  useCreateNotificationTemplate,
  useUpdateNotificationTemplate,
  useDeleteNotificationTemplate,
  usePreviewTemplate,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
} from "@/features/notifications/notification-types";
import {
  templateSchema,
  type TemplateFormValues,
} from "@/features/notifications/template-schema";
import type {
  NotificationTemplate,
  NotificationChannel,
} from "@/types/notifications";

const NO_CATEGORY = "none";

const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: "IN_APP", label: "In-App" },
  { value: "EMAIL", label: "Email" },
  { value: "PUSH", label: "Push" },
  { value: "SMS", label: "SMS" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBHOOK", label: "Webhook" },
];


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
