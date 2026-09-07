"use client";

import { memo, useState, useCallback } from "react";
import { ChevronDown, GitBranch, Github, Gitlab } from "lucide-react";
import { Trash2Icon, CopyIcon, EyeIcon, EyeOffIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { GitConnection, GitProvider } from "@/hooks/api/git-integration";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SetupInstructions } from "./git-setup-instructions";

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
    <AnimatedIconButton
      type="button"
      variant="ghost"
      size="icon"
      className="w-7 shrink-0"
      onClick={handleCopy}
      aria-label={`Copy ${label.toLowerCase()}`}
      icon={CopyIcon}
      iconSize={14}
    />
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
  const [setupOpen, setSetupOpen] = useState(false);

  const handleToggleReveal = useCallback(() => setRevealed((v) => !v), []);
  const handleToggleSetup = useCallback(() => setSetupOpen((v) => !v), []);
  const handleToggle = useCallback(() => onToggle(connection), [connection, onToggle]);
  const handleDelete = useCallback(
    () => onDelete(connection.id),
    [connection.id, onDelete],
  );

  const displayName = connection.repoName || connection.repoUrl;
  const isGithub = connection.provider === "github";

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
            <TruncatedText text={displayName} className="text-sm font-semibold" />
            <TruncatedText text={connection.repoUrl} className="mt-0.5 text-xs text-muted-foreground" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge
              variant={connection.isActive ? "default" : "secondary"}
              className="text-micro"
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
          <AnimatedIconButton
            variant="ghost"
            size="icon"
            className="w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete connection"
            icon={Trash2Icon}
            iconSize={16}
          />
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
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              className="w-7 shrink-0"
              onClick={handleToggleReveal}
              aria-label={revealed ? "Hide secret" : "Reveal secret"}
              icon={revealed ? EyeOffIcon : EyeIcon}
              iconSize={14}
            />
          </div>
          <p className="text-dense text-muted-foreground/80">
            The full secret is shown only once at creation. Recreate the connection if it is lost.
          </p>
        </div>
        {isGithub ? (
          <div className="border-t border-border/50 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-between px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleToggleSetup}
              aria-expanded={setupOpen}
            >
              How it works
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  setupOpen && "rotate-180",
                )}
              />
            </Button>
            {setupOpen ? (
              <SetupInstructions compact className="px-1 pb-1 pt-2" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});
