"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CalendarBookingRule } from "@/hooks/api/calendar/booking-rules-schema";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<CalendarBookingRule["status"], StatusTone> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  revoked: "danger",
};

interface BookingPageCardProps {
  rule: CalendarBookingRule;
  busy: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onDistribution: () => void;
  onPolls: () => void;
  onRouting: () => void;
  onPayments: () => void;
  onBookings: () => void;
  onActivate: () => void;
  onPause: () => void;
  onRevoke: () => void;
}

export function BookingPageCard({
  rule,
  busy,
  onEdit,
  onPreview,
  onDistribution,
  onPolls,
  onRouting,
  onPayments,
  onBookings,
  onActivate,
  onPause,
  onRevoke,
}: BookingPageCardProps) {
  const tone = statusToneClasses(STATUS_TONE[rule.status]);
  const active = rule.status === "active";
  const revoked = rule.status === "revoked";
  const actions = [
    { key: "edit", label: "Edit", onClick: onEdit, disabled: revoked, primary: false },
    { key: "preview", label: "Preview", onClick: onPreview, disabled: false, primary: false },
    { key: "bookings", label: "Bookings", onClick: onBookings, disabled: false, primary: false },
    ...(rule.status === "draft" || rule.status === "paused"
      ? [{ key: "activate", label: "Activate", onClick: onActivate, disabled: busy, primary: true }]
      : []),
    ...(active
      ? [{ key: "pause", label: "Pause", onClick: onPause, disabled: busy, primary: false }]
      : []),
  ];
  const lastIsWide = actions.length % 2 === 1;

  return (
    <article className="space-y-3 rounded-lg bg-muted p-3 dark:border dark:border-background">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{rule.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {rule.durationMinutes} minutes · {rule.timeZone} · Version {rule.version}
          </p>
        </div>
        <Badge variant="outline" className={cn("capitalize", tone.surface, tone.ink, tone.rule)}>
          {rule.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, index) => (
          <Button
            key={action.key}
            size="sm"
            variant={action.primary ? "default" : "outline"}
            className={cn(lastIsWide && index === actions.length - 1 && "col-span-2")}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </Button>
        ))}
      </div>
      {active ? (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={onDistribution}>Publish links</Button>
          <Button size="sm" variant="outline" onClick={onPolls}>Polls</Button>
          <Button size="sm" variant="outline" onClick={onRouting}>Team routing</Button>
          <Button size="sm" variant="outline" onClick={onPayments}>Payments</Button>
        </div>
      ) : null}
      {revoked ? null : (
        <ConfirmDialog
          title={`Revoke “${rule.title}”?`}
          description="Its public link will stop working."
          confirmLabel="Revoke page"
          destructive
          isPending={busy}
          onConfirm={onRevoke}
          trigger={
            <Button
              size="sm"
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
            >
              Revoke
            </Button>
          }
        />
      )}
    </article>
  );
}
