"use client";

import { useCallback } from "react";
import { CheckCircle2, AlertCircle, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { Trash2Icon, CopyIcon } from "@animateicons/react/lucide";
import type { SlackConnection } from "@/hooks/api/slack-integration";

interface SlackConnectionRowProps {
  connection: SlackConnection;
  onDelete: (id: number) => void;
}

export function SlackConnectionRow({ connection, onDelete }: SlackConnectionRowProps) {
  const handleDelete = useCallback(() => onDelete(connection.id), [connection.id, onDelete]);
  const handleCopyWebhook = useCallback(() => {
    void navigator.clipboard.writeText(connection.webhookUrl);
    toast.success("Webhook URL copied");
  }, [connection.webhookUrl]);

  const hasRecentError =
    connection.lastErrorAt !== null &&
    (connection.lastEventAt === null ||
      new Date(connection.lastErrorAt) > new Date(connection.lastEventAt));

  return (
    <div className={cn(PM_PANEL, "overflow-hidden")}>
      <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-border/50">
            <Hash className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <TruncatedText
              text={connection.teamName ?? connection.teamId}
              className="text-sm font-medium"
            />
            <p className="mt-0.5 text-xs text-muted-foreground">
              Team ID: {connection.teamId}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasRecentError ? (
            <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-label="Last event failed" />
          ) : connection.lastEventAt !== null ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-label="Receiving events" />
          ) : null}
          <Badge
            variant={connection.isActive ? "default" : "secondary"}
            className="text-micro"
          >
            {connection.isActive ? "Active" : "Paused"}
          </Badge>
          <AnimatedIconButton
            variant="ghost"
            size="icon"
            className="w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete Slack connection"
            icon={Trash2Icon}
            iconSize={16}
          />
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Webhook URL</Label>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
            <code className={cn(TEXT_ONE_LINE, "flex-1 font-mono text-xs")}>
              {connection.webhookUrl}
            </code>
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              className="w-7 shrink-0"
              onClick={handleCopyWebhook}
              aria-label="Copy webhook URL"
              icon={CopyIcon}
              iconSize={14}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
