"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Settings2, Bell } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared/error-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { SendIcon } from "@animateicons/react/lucide";
import {
  useNotificationEventCatalog,
  useUpdateNotificationEventPolicy,
  useEmitNotificationEvent,
} from "@/hooks/api/notifications";
import { useCan } from "@/hooks/api/access";
import { policySchema, type PolicyFormValues } from "@/features/notifications/policy-schema";
import type {
  NotificationEventDefinition,
  NotificationChannel,
  NotificationPriority,
} from "@/types/notifications";

import { PRIORITIES, QUIET_HOURS_OPTIONS, priorityBadgeClass } from "./event-config";

export function EventRow({
  event,
  canManage,
  onConfigure,
  onSendTest,
  sending,
}: {
  event: NotificationEventDefinition;
  canManage: boolean;
  onConfigure: (event: NotificationEventDefinition) => void;
  onSendTest: (event: NotificationEventDefinition) => void;
  sending: boolean;
}) {
  const updatePolicy = useUpdateNotificationEventPolicy();
  const sendAnim = useAnimatedIcon();

  const handleEnabledChange = useCallback(
    (checked: boolean) => {
      updatePolicy.mutate(
        { eventKey: event.eventKey, enabled: checked },
        {
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [event.eventKey, updatePolicy],
  );

  const handleConfigureClick = useCallback(() => {
    onConfigure(event);
  }, [event, onConfigure]);

  const handleSendTestClick = useCallback(() => {
    onSendTest(event);
  }, [event, onSendTest]);

  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{event.displayName}</span>
          <Badge variant="secondary" className="text-micro h-4 px-1.5 shrink-0">
            {event.category}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-micro h-4 px-1.5 shrink-0 border", priorityBadgeClass[event.defaultPriority])}
          >
            {event.defaultPriority}
          </Badge>
          {event.mandatory && (
            <Badge variant="outline" className="text-micro h-4 px-1.5 shrink-0 border-status-warning-rule text-status-warning-ink bg-status-warning-surface">
              Mandatory
            </Badge>
          )}
          {event.overridden && (
            <Badge variant="outline" className="text-micro h-4 px-1.5 shrink-0 border-primary/20 text-foreground bg-primary/10">
              Overridden
            </Badge>
          )}
          <div className="flex items-center gap-1 flex-wrap">
            {event.defaultChannels.map((ch) => (
              <span
                key={ch}
                className="inline-flex items-center text-micro px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium"
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
        <p className="text-dense font-mono text-muted-foreground/60">{event.eventKey}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={event.enabled}
          onCheckedChange={handleEnabledChange}
          disabled={event.mandatory || !canManage || updatePolicy.isPending}
          aria-label={`Toggle ${event.displayName}`}
        />
        {canManage && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleSendTestClick}
              disabled={sending}
              aria-label="Send test to me"
              {...sendAnim.hoverHandlers}
            >
              <SendIcon
                ref={sendAnim.iconRef}
                size={14}
                className={cn("text-muted-foreground", sending && "animate-pulse")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Configure event"
              onClick={handleConfigureClick}
            >
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

