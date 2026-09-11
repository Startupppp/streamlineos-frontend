"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { SendIcon } from "@animateicons/react/lucide";
import {
  useUpdateNotificationEventPolicy
} from "@/hooks/api/notifications";
import type {
  NotificationEventDefinition,
} from "@/types/notifications";

import { priorityBadgeClass } from "./event-config";

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

