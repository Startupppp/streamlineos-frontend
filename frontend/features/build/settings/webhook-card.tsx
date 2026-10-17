"use client";


import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import {
  ChevronDownIcon,
  SendIcon,
} from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { type ProjectWebhook } from "@/hooks/api/build/webhooks";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCanState } from "@/hooks/api/access";
import { WebhookDeliveryPanel } from "@/features/build/settings/webhook-delivery-panel";
import {
  LastDeliveryMeta,
  secretAgeLabel,
} from "./webhook-last-delivery-meta";
import { WebhookCardMenu } from "./webhook-card-menu";
import { WebhookCardDeleteTrigger } from "./webhook-card-delete-trigger";
import { WebhookSecretRevealPanel } from "./webhook-secret-reveal-panel";
import { useWebhookCard } from "./use-webhook-card";

interface WebhookCardProps {
  webhook: ProjectWebhook;
  projectId: number;
  onDelete: (id: number) => void;
  onToggle?: (
    webhook: Pick<ProjectWebhook, "id" | "version">,
    isActive: boolean,
  ) => void;
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
  const {
    expanded,
    menuOpen,
    setMenuOpen,
    revealedSecret,
    secretCopied,
    sendTest,
    rotateSecret,
    sendIconRef,
    sendHoverHandlers,
    chevronIconRef,
    chevronHoverHandlers,
    handleToggleExpanded,
    handleSendTest,
    handleActiveToggle,
    handleSelectedChange,
    handleContextMenu,
    handleCopyUrl,
    handleRotateSecret,
    handleCopySecret,
    handleDismissSecret,
    handleEditFromMenu,
    handleToggleFromMenu,
  } = useWebhookCard({
    webhook,
    projectId,
    expandedProp,
    onExpandedChange,
    onToggle,
    onDelete,
    onEdit,
    onSelectedChange,
  });

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
          onClick={handleToggleExpanded}
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
          <WebhookCardDeleteTrigger
            webhookId={webhook.id}
            projectId={projectId}
            onDelete={onDelete}
          />
        )}
        <WebhookCardMenu
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
          canManage={canManage}
          hasSecret={webhook.hasSecret}
          isActive={webhook.isActive}
          onCopyUrl={handleCopyUrl}
          onEdit={onEdit ? handleEditFromMenu : undefined}
          onRotateSecret={webhook.hasSecret ? handleRotateSecret : undefined}
          rotatePending={rotateSecret.isPending}
          onToggleActive={onToggle ? handleToggleFromMenu : undefined}
        />
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
            <WebhookDeliveryPanel
              projectId={projectId}
              webhookId={webhook.id}
              expanded={expanded}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <WebhookSecretRevealPanel
        revealedSecret={revealedSecret}
        secretCopied={secretCopied}
        onCopy={handleCopySecret}
        onDismiss={handleDismissSecret}
      />
    </motion.div>
  );
}
