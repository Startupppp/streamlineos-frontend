"use client";

import { memo, useState, useCallback } from "react";
import { GitBranch, Github, Gitlab, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { GitConnection, GitProvider } from "@/hooks/api/git-integration";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";

export function ProviderIcon({
  provider,
  className,
}: {
  provider: GitProvider;
  className?: string;
}) {
  if (provider === "github") return <Github className={className} />;
  if (provider === "gitlab") return <Gitlab className={className} />;
  return <GitBranch className={className} />;
}

export const CopyButton = memo(function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }, [value, label]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="w-7 shrink-0"
      onClick={handleCopy}
      aria-label={`Copy ${label.toLowerCase()}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
});

interface ConnectionRowProps {
  connection: GitConnection;
  onToggle: (connection: GitConnection) => void;
  onDelete: (id: number) => void;
  isToggling: boolean;
}

export const ConnectionRow = memo(function ConnectionRow({
  connection,
  onToggle,
  onDelete,
  isToggling,
}: ConnectionRowProps) {
  const [revealed, setRevealed] = useState(false);

  const handleToggleReveal = useCallback(() => setRevealed((v) => !v), []);
  const handleToggle = useCallback(() => onToggle(connection), [connection, onToggle]);
  const handleDelete = useCallback(
    () => onDelete(connection.id),
    [connection.id, onDelete],
  );

  const displayName = connection.repoName || connection.repoUrl;

  return (
    <div
      className={cn(
        PM_PANEL,
        "overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-md",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-4 border-b border-border/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-border/50">
            <ProviderIcon
              provider={connection.provider}
              className="h-4 w-4 text-foreground"
            />
          </div>
          <div className="min-w-0">
            <p className={cn(TEXT_ONE_LINE, "text-sm font-semibold")} title={displayName}>
              {displayName}
            </p>
            <p className={cn(TEXT_ONE_LINE, "mt-0.5 text-xs text-muted-foreground")} title={connection.repoUrl}>
              {connection.repoUrl}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge
              variant={connection.isActive ? "default" : "secondary"}
              className="text-[10px]"
            >
              {connection.isActive ? "Active" : "Paused"}
            </Badge>
            <Switch
              checked={connection.isActive}
              onCheckedChange={handleToggle}
              disabled={isToggling}
              aria-label={
                connection.isActive ? "Pause connection" : "Activate connection"
              }
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete connection"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Webhook URL</Label>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
            <code className={cn(TEXT_ONE_LINE, "flex-1 font-mono text-xs")}>
              {connection.webhookUrl}
            </code>
            <CopyButton value={connection.webhookUrl} label="Webhook URL" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Webhook secret</Label>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5">
            <code className={cn(TEXT_ONE_LINE, "flex-1 font-mono text-xs")}>
              {revealed ? connection.maskedSecret : "••••••••••••"}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-7 shrink-0"
              onClick={handleToggleReveal}
              aria-label={revealed ? "Hide secret" : "Reveal secret"}
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            The full secret is shown only once at creation. Recreate the connection if it is lost.
          </p>
        </div>
      </div>
    </div>
  );
});
