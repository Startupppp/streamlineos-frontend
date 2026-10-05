"use client";

import { useState, useCallback, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Ellipsis, Copy, Check } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  ChevronDownIcon,
  SendIcon,
  Trash2Icon,
} from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useSendTestWebhook,
  useRotateWebhookSecret,
  useProjectWebhookImpact,
  type ProjectWebhook,
} from "@/hooks/api/build/webhooks";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCanState } from "@/hooks/api/access";
import { WebhookDeliveryPanel } from "@/features/build/settings/webhook-delivery-panel";

function LastDeliveryMeta({
  lastDeliveryAt,
  lastDeliveryStatus,
  failureRate,
}: {
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: "success" | "failed" | "pending" | null;
  failureRate?: number | null;
}) {
  if (!lastDeliveryAt) return null;
  const statusColor =
    lastDeliveryStatus === "success"
      ? "bg-status-success-fill"
      : lastDeliveryStatus === "failed"
        ? "bg-status-danger-fill"
        : "bg-status-warning-fill";
  const failurePct =
    failureRate !== null && failureRate !== undefined
      ? `${Math.round(failureRate * 100)}% failure`
      : null;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusColor)} aria-hidden />
      <span className="text-micro text-muted-foreground">
        {new Date(lastDeliveryAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </span>
      {failurePct && (
        <span className="text-micro text-status-danger-ink-strong font-mono">
          {failurePct}
        </span>
      )}
    </div>
  );
}

function secretAgeLabel(
  webhook: Pick<ProjectWebhook, "hasSecret" | "secretSetAt">,
): string {
  if (!webhook.hasSecret) return "no signing secret";
  if (!webhook.secretSetAt) return "secret age unknown";
  return `secret since ${new Date(webhook.secretSetAt).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })}`;
}

interface WebhookCardProps {
  webhook: ProjectWebhook;
  projectId: number;
  onDelete: (id: number) => void;
  onToggle?: (webhook: Pick<ProjectWebhook, "id" | "version">, isActive: boolean) => void;
  onEdit?: (webhook: ProjectWebhook) => void;
  canManage?: boolean;
  density?: "compact" | "comfortable";
  selected?: boolean;
  onSelectedChange?: (webhookId: number, selected: boolean) => void;
  focused?: boolean;
  expanded?: boolean;
  onExpandedChange?: (webhookId: number, expanded: boolean) => void;
}

export function WebhookCard({
  webhook,
  projectId,
  onDelete,
  onToggle,
  onEdit,
  canManage = false,
  density = "compact",
  selected = false,
  onSelectedChange,
  focused = false,
  expanded: expandedProp,
  onExpandedChange,
}: WebhookCardProps) {
  const accessState = useCanState("build:manage");
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = expandedProp ?? internalExpanded;
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const sendTest = useSendTestWebhook(projectId);
  const rotateSecret = useRotateWebhookSecret(projectId);
  const { data: impact } = useProjectWebhookImpact(projectId, webhook.id, deleteOpen);
  const { iconRef: sendIconRef, hoverHandlers: sendHoverHandlers } =
    useAnimatedIcon();
  const { iconRef: chevronIconRef, hoverHandlers: chevronHoverHandlers } =
    useAnimatedIcon();

  const handleToggle = useCallback(() => {
    if (onExpandedChange) {
      onExpandedChange(webhook.id, !expanded);
      return;
    }
    setInternalExpanded((v) => !v);
  }, [onExpandedChange, webhook.id, expanded]);

  const handleSendTest = useCallback(() => {
    sendTest.mutate(webhook.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success("Test delivery succeeded");
        } else {
          toast.error(
            `Test delivery failed (HTTP ${result.responseCode ?? "—"})`,
          );
        }
        if (onExpandedChange) onExpandedChange(webhook.id, true);
        else setInternalExpanded(true);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [sendTest, webhook.id, onExpandedChange]);

  const handleActiveToggle = useCallback(
    (checked: boolean) => {
      onToggle?.({ id: webhook.id, version: webhook.version }, checked);
    },
    [onToggle, webhook.id, webhook.version],
  );

  const handleSelectedChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onSelectedChange?.(webhook.id, checked === true);
    },
    [onSelectedChange, webhook.id],
  );

  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMenuOpen(true);
  }, []);

  const handleCopyUrl = useCallback(() => {
    void navigator.clipboard.writeText(webhook.url);
    toast.success("URL copied");
    setMenuOpen(false);
  }, [webhook.url]);

  const handleRotateSecret = useCallback(() => {
    setMenuOpen(false);
    rotateSecret.mutate(webhook.id, {
      onSuccess: (result) => {
        setRevealedSecret(result.secret);
        setSecretCopied(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [rotateSecret, webhook.id]);

  const handleCopySecret = useCallback(() => {
    if (!revealedSecret) return;
    void navigator.clipboard.writeText(revealedSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }, [revealedSecret]);

  const handleDismissSecret = useCallback(() => setRevealedSecret(null), []);

  const handleConfirmDelete = useCallback(() => onDelete(webhook.id), [onDelete, webhook.id]);

  const handleEditFromMenu = useCallback(() => {
    onEdit?.(webhook);
    setMenuOpen(false);
  }, [onEdit, webhook]);

  const handleToggleFromMenu = useCallback(() => {
    onToggle?.({ id: webhook.id, version: webhook.version }, !webhook.isActive);
    setMenuOpen(false);
  }, [onToggle, webhook]);

  if (accessState === "denied" || accessState === "loading") return null;

  return (
    <motion.div
      layout
      className={cn(
        PM_PANEL,
        "group/card overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
        focused && "ring-2 ring-inset ring-primary/40",
      )}
      onContextMenu={handleContextMenu}
    >
      <div
        className={cn(
          "flex items-center gap-3",
          density === "comfortable" ? "p-3.5" : "p-2",
        )}
      >
        {onSelectedChange && (
          <Checkbox
            checked={selected}
            onCheckedChange={handleSelectedChange}
            aria-label={`Select ${webhook.url}`}
            className="shrink-0"
          />
        )}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TruncatedText
              text={webhook.url}
              className="text-sm font-medium text-foreground"
            />
            <Badge
              variant={webhook.isActive ? "default" : "outline"}
              className={cn(
                "shrink-0 text-micro py-0 px-1.5",
                webhook.isActive
                  ? "bg-status-success-fill text-status-success-ink-strong border-transparent"
                  : "bg-muted text-muted-foreground border-border",
              )}
            >
              {webhook.isActive ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {webhook.events.slice(0, 3).map((e) => (
              <Badge
                key={e}
                variant="secondary"
                className="text-micro py-0 px-1.5 bg-muted text-muted-foreground border-border font-mono"
              >
                {e}
              </Badge>
            ))}
            {webhook.events.length > 3 && (
              <Badge variant="secondary" className="text-micro py-0 px-1.5">
                +{webhook.events.length - 3} more
              </Badge>
            )}
            <span className="text-micro text-muted-foreground ml-auto shrink-0">
              {secretAgeLabel(webhook)}
            </span>
          </div>
          <LastDeliveryMeta
            lastDeliveryAt={webhook.lastDeliveryAt}
            lastDeliveryStatus={webhook.lastDeliveryStatus}
            failureRate={webhook.failureRate}
          />
        </div>
        {canManage && onToggle && (
          <Switch
            checked={webhook.isActive}
            onCheckedChange={handleActiveToggle}
            aria-label={webhook.isActive ? "Disable webhook" : "Enable webhook"}
            className="shrink-0"
          />
        )}
        <button
          type="button"
          onClick={handleSendTest}
          disabled={sendTest.isPending}
          aria-label="Send test webhook"
          className="w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          {...sendHoverHandlers}
        >
          <SendIcon
            ref={sendIconRef}
            size={14}
            className="text-muted-foreground"
          />
        </button>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={expanded ? "Hide deliveries" : "Show deliveries"}
          className="w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          {...chevronHoverHandlers}
        >
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDownIcon
              ref={chevronIconRef}
              size={16}
              className="text-muted-foreground"
            />
          </motion.div>
        </button>
        {canManage && (
          <>
            <AnimatedIconButton
              variant="ghost"
              size="icon"
              aria-label="Delete webhook"
              className="w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              icon={Trash2Icon}
              iconSize={14}
              onClick={() => setDeleteOpen(true)}
            />
            <ConfirmDialog
              title="Delete webhook?"
              description={
                impact
                  ? `${impact.totalDeliveries} total deliveries on record (${impact.successfulDeliveries} successful). Deliveries will stop immediately. This cannot be undone.`
                  : "Deliveries will stop immediately. This cannot be undone."
              }
              confirmLabel="Delete"
              destructive
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              onConfirm={handleConfirmDelete}
            />
          </>
        )}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Webhook actions"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-opacity hover:bg-muted opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100 data-[state=open]:opacity-100"
            >
              <Ellipsis className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={handleCopyUrl}>Copy URL</DropdownMenuItem>
            {canManage && onEdit && (
              <DropdownMenuItem onSelect={handleEditFromMenu}>Edit</DropdownMenuItem>
            )}
            {canManage && webhook.hasSecret && (
              <DropdownMenuItem onSelect={handleRotateSecret} disabled={rotateSecret.isPending}>
                Rotate Secret
              </DropdownMenuItem>
            )}
            {canManage && onToggle && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleToggleFromMenu}>
                  {webhook.isActive ? "Disable" : "Enable"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <WebhookDeliveryPanel projectId={projectId} webhookId={webhook.id} expanded={expanded} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revealedSecret && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-muted/30"
          >
            <div className="p-3.5">
              <p className="text-xs font-normal text-muted-foreground mb-2">
                New signing secret — copy it now, it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-background border border-border rounded px-2 py-1 truncate">
                  {revealedSecret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  aria-label="Copy signing secret"
                  className="flex items-center justify-center h-7 w-7 rounded border border-border bg-background hover:bg-muted transition-colors shrink-0"
                >
                  {secretCopied ? (
                    <Check className="h-3.5 w-3.5 text-status-success-ink-strong" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDismissSecret}
                  aria-label="Dismiss secret"
                  className="text-micro text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
