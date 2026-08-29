"use client";

import { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  SendIcon,
  UserPenIcon,
  Trash2Icon,
} from "@animateicons/react/lucide";
import {
  useBroadcasts,
  useCreateBroadcast,
  useUpdateBroadcast,
  usePublishBroadcast,
  useCancelBroadcast,
  useDeleteBroadcast,
} from "@/hooks/api/notifications";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_CONFIG,
} from "@/features/notifications/notification-types";
import { broadcastSchema, type BroadcastFormValues } from "@/features/notifications/broadcast-schema";
import type { Broadcast, BroadcastStatus } from "@/types/notifications";

export const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "SENDING", label: "Sending" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

export const STATUS_CONFIG: Record<BroadcastStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "border-border text-muted-foreground" },
  SCHEDULED: { label: "Scheduled", className: "border-status-info-rule text-status-info-ink" },
  QUEUED: { label: "Queued", className: "border-status-info-rule text-status-info-ink" },
  SENDING: { label: "Sending", className: "border-status-warning-rule text-status-warning-ink" },
  SENT: { label: "Sent", className: "border-status-success-rule text-status-success-ink" },
  CANCELLED: { label: "Cancelled", className: "border-border text-muted-foreground" },
  FAILED: { label: "Failed", className: "border-status-danger-rule text-status-danger-ink" },
};

export function formatDate(value: Date | string | null): string {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}
