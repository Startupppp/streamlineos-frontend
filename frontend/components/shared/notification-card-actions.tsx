"use client";

import { Archive, Pin, PinOff } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BellMinusIcon, CheckCheckIcon, EllipsisIcon, ReplyIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { propagationShield } from "@/lib/keyboard-activation";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from "@/components/ui/responsive-popover";
import { getErrorMessage } from "@/lib/get-error-message";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

export interface SnoozePreset { label: string; getIso: () => string }
export const SNOOZE_PRESETS: readonly SnoozePreset[] = [
  { label: "1 hour", getIso: () => new Date(Date.now() + 60 * 60 * 1000).toISOString() },
  { label: "3 hours", getIso: () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() },
  { label: "Tomorrow, 9:00 AM", getIso: () => {
    const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(9, 0, 0, 0); return date.toISOString();
  } },
];
export interface NotificationTriageActions {
  isRead: boolean;
  isSnoozed: boolean;
  disabled: boolean;
  onRead: () => Promise<unknown>;
  onResolve: () => Promise<unknown>;
  onRestore: () => Promise<unknown>;
  onSnooze: (until: string) => Promise<unknown>;
  onUnsnooze: () => Promise<unknown>;
}
function TriageActions({ isArchived, actions }: { isArchived: boolean; actions: NotificationTriageActions }) {
  const { iconRef: lifecycleIconRef, hoverHandlers: lifecycleHoverHandlers } = useAnimatedIcon();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{ label: string; run: () => Promise<unknown> } | null>(null);
  const [pending, setPending] = useState(false);
  const mounted = useRef(false);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function run(command: () => Promise<unknown>) {
    if (pending || actions.disabled) return;
    setPending(true);
    try { await command(); if (mounted.current) { setConfirmation(null); setMenuOpen(false); } }
    catch (error: unknown) { if (mounted.current) toast.error(getErrorMessage(error)); }
    finally { if (mounted.current) setPending(false); }
  }
  function handleRead() { void run(actions.onRead); }
  function handleLifecycle() {
    setConfirmation({ label: isArchived ? "Restore" : "Resolve", run: isArchived ? actions.onRestore : actions.onResolve });
  }
  function handleUnsnooze() { setMenuOpen(false); setConfirmation({ label: "Unsnooze", run: actions.onUnsnooze }); }
  function handleConfirm() { if (confirmation) void run(confirmation.run); }
  function handleConfirmationChange(open: boolean) { if (!open) setConfirmation(null); }
  function renderPreset(preset: SnoozePreset) {
    function handleSnooze() {
      setMenuOpen(false);
      setConfirmation({ label: `Snooze for ${preset.label}`, run: () => actions.onSnooze(preset.getIso()) });
    }
    return <AnimatedIconButton key={preset.label} type="button" variant="ghost" icon={BellMinusIcon} iconSize={16} className="w-full justify-start" disabled={actions.disabled || pending} onClick={handleSnooze}>{preset.label}</AnimatedIconButton>;
  }
  return <div className="flex shrink-0 items-center gap-1" {...propagationShield}>
    <LoadingButton type="button" variant="ghost" size="icon" aria-label={isArchived ? "Restore notification" : "Resolve notification"} disabled={actions.disabled} isPending={pending} onClick={handleLifecycle} {...lifecycleHoverHandlers}>
      {isArchived ? <ReplyIcon ref={lifecycleIconRef} size={16} /> : <CheckCheckIcon ref={lifecycleIconRef} size={16} />}
    </LoadingButton>
    <ResponsivePopover open={menuOpen} onOpenChange={setMenuOpen}>
      <ResponsivePopoverTrigger asChild><AnimatedIconButton type="button" variant="ghost" size="icon" icon={EllipsisIcon} iconSize={16} aria-label="Notification actions" disabled={actions.disabled || pending} /></ResponsivePopoverTrigger>
      <ResponsivePopoverContent title="Notification actions" align="end" className="w-60 p-1">
        {!actions.isRead ? <LoadingButton type="button" variant="ghost" className="w-full justify-start" isPending={pending} disabled={actions.disabled} onClick={handleRead}>Mark read</LoadingButton> : null}
        {actions.isSnoozed ? <Button type="button" variant="ghost" className="w-full justify-start" disabled={actions.disabled || pending} onClick={handleUnsnooze}>Unsnooze</Button> : null}
        {!isArchived ? SNOOZE_PRESETS.map(renderPreset) : null}
      </ResponsivePopoverContent>
    </ResponsivePopover>
    <ConfirmDialog open={confirmation !== null} onOpenChange={handleConfirmationChange} title={`${confirmation?.label ?? "Update"} notification?`}
      description="This changes only your inbox notification. The linked work stays unchanged."
      confirmLabel={confirmation?.label} onConfirm={handleConfirm} isPending={pending} keepOpenOnConfirm destructive />
  </div>;
}

function TrashButton({
  onClick,
  isDeleting,
}: {
  onClick: (e: React.MouseEvent) => void;
  isDeleting?: boolean;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 hover:text-destructive"
      aria-label="Delete notification"
      onClick={onClick}
      disabled={isDeleting}
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={14} />
    </Button>
  );
}

export interface NotificationCardActionsProps {
  pinned: boolean;
  isArchived: boolean;
  isArchiving?: boolean;
  isPinning?: boolean;
  isDeleting?: boolean;
  onArchive?: (e: React.MouseEvent) => void;
  onPin?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  triage?: NotificationTriageActions;
}

export function NotificationCardActions({
  pinned,
  isArchived,
  isArchiving,
  isPinning,
  isDeleting,
  onArchive,
  onPin,
  onDelete,
  triage,
}: NotificationCardActionsProps) {
  if (triage) return <TriageActions isArchived={isArchived} actions={triage} />;
  const hasActions = Boolean((!isArchived && onArchive) || onPin || onDelete);
  if (!hasActions) return null;

  return (
    <div
      className="relative z-10 flex shrink-0 items-center gap-0.5"
      {...propagationShield}
    >
      {!isArchived && onArchive ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Archive notification"
          onClick={onArchive}
          disabled={isArchiving}
        >
          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ) : null}
      {onPin ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label={pinned ? "Unpin notification" : "Pin notification"}
          onClick={onPin}
          disabled={isPinning}
        >
          {pinned ? (
            <PinOff className="h-3.5 w-3.5 text-status-warning-ink" />
          ) : (
            <Pin className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      ) : null}
      {onDelete ? (
        <TrashButton onClick={onDelete} isDeleting={isDeleting} />
      ) : null}
    </div>
  );
}
