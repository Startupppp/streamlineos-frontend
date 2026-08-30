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


export function PreviewDialog({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: NotificationTemplate | null;
  onClose: () => void;
}) {
  const preview = usePreviewTemplate();
  const [result, setResult] = useState<{
    subject: string | null;
    body: string;
  } | null>(null);

  function handlePreview() {
    if (!template) return;
    const vars: Record<string, string> = {};
    template.variables.forEach((v) => {
      vars[v] = `{{${v}}}`;
    });
    preview.mutate(
      { id: template.id, variables: vars },
      {
        onSuccess: (data) => setResult(data),
        onError: () => toast.error("Failed to preview template"),
      },
    );
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setResult(null);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview — {template?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {result ? (
            <>
              {result.subject && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Subject
                  </p>
                  <p className="text-sm font-medium">{result.subject}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Body
                </p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {result.body}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Variables:{" "}
                <span className="font-mono">
                  {template?.variables.join(", ") || "none"}
                </span>
              </p>
              <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {template?.body}
              </div>
            </div>
          )}
          <LoadingButton
            className="w-full"
            variant="outline"
            onClick={handlePreview}
            isPending={preview.isPending}
            loadingText="Generating..."
          >
            Render with sample variables
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Only these channels gate sending on a provider-approved template. */
