"use client";

import {
  CalendarDays,
  Milestone,
  CheckSquare,
  Package,
  ClipboardList,
  Receipt,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type {
  PortalMilestone,
  PortalTask,
  PortalDeliverable,
  PortalApproval,
  PortalInvoice,
} from "@/features/portal/lib/portal-types";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-status-info-surface text-status-info-ink",
  completed: "bg-status-success-surface text-status-success-ink",
  on_hold: "bg-status-warning-surface text-status-warning-ink",
  cancelled: "bg-status-danger-surface text-status-danger-ink",
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-status-info-surface text-status-info-ink",
  done: "bg-status-success-surface text-status-success-ink",
};

export function formatPortalStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function portalStatusStyle(status: string): string {
  return STATUS_STYLES[status.toLowerCase()] ?? "bg-muted text-muted-foreground";
}

export function formatPortalDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SectionHeader({
  icon,
  title,
  count,
  titleId,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  titleId?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/5 text-muted-foreground">
        {icon}
      </div>
      <h2 id={titleId} className="text-sm font-semibold text-foreground">{title}</h2>
      {count !== undefined && (
        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

export function MilestonesSection({ milestones }: { milestones: PortalMilestone[] }) {
  return (
    <section aria-labelledby="milestones-heading">
      <SectionHeader
        icon={<Milestone className="h-3.5 w-3.5" />}
        titleId="milestones-heading"
        title="Milestones"
        count={milestones.length}
      />
      {milestones.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="default"
          title="No milestones"
          description="No milestone dates have been shared for this project."
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {milestones.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
              <span className="text-sm text-foreground min-w-0 truncate">{m.name}</span>
              <div className="flex items-center gap-3 shrink-0">
                {m.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {formatPortalDate(m.dueDate)}
                  </span>
                )}
                {m.status != null && (
                  <span
                    className={cn(
                      "inline-flex px-1.5 py-0.5 rounded text-micro font-semibold",
                      portalStatusStyle(m.status),
                    )}
                  >
                    {formatPortalStatus(m.status)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function DeliverablesSection({ deliverables }: { deliverables: PortalDeliverable[] }) {
  return (
    <section aria-labelledby="deliverables-heading">
      <SectionHeader
        icon={<Package className="h-3.5 w-3.5" />}
        titleId="deliverables-heading"
        title="Deliverables"
        count={deliverables.length}
      />
      <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {deliverables.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
            <span className="text-sm text-foreground min-w-0 truncate">{d.name}</span>
            <div className="flex items-center gap-3 shrink-0">
              {d.version && <span className="text-xs font-mono text-muted-foreground">v{d.version}</span>}
              {d.releaseDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {formatPortalDate(d.releaseDate)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TasksSection({ tasks }: { tasks: PortalTask[] }) {
  return (
    <section aria-labelledby="tasks-heading">
      <SectionHeader
        icon={<CheckSquare className="h-3.5 w-3.5" />}
        titleId="tasks-heading"
        title="Tasks"
        count={tasks.length}
      />
      {tasks.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="default"
          title="No tasks"
          description="No tasks have been shared for this project."
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-foreground truncate block">{t.title}</span>
                {t.assigneeName && (
                  <span className="text-xs text-muted-foreground">{t.assigneeName}</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {t.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {formatPortalDate(t.dueDate)}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex px-1.5 py-0.5 rounded text-micro font-semibold",
                    portalStatusStyle(t.status),
                  )}
                >
                  {formatPortalStatus(t.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ApprovalsSection({ approvals }: { approvals: PortalApproval[] }) {
  return (
    <section aria-labelledby="approvals-heading">
      <SectionHeader
        icon={<ClipboardList className="h-3.5 w-3.5" />}
        titleId="approvals-heading"
        title="Approvals"
        count={approvals.length}
      />
      {approvals.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="default"
          title="No approvals"
          description="No approvals have been shared for this project."
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {approvals.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
              <span className="text-sm text-foreground min-w-0 truncate">{a.title}</span>
              <div className="flex items-center gap-3 shrink-0">
                {a.dueAt && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {formatPortalDate(a.dueAt)}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex px-1.5 py-0.5 rounded text-micro font-semibold",
                    portalStatusStyle(a.status),
                  )}
                >
                  {formatPortalStatus(a.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function InvoicesSection({ invoices }: { invoices: PortalInvoice[] }) {
  return (
    <section aria-labelledby="invoices-heading">
      <SectionHeader
        icon={<Receipt className="h-3.5 w-3.5" />}
        titleId="invoices-heading"
        title="Invoices"
        count={invoices.length}
      />
      {invoices.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="default"
          title="No invoices"
          description="No invoices are available for this project."
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-sm text-foreground truncate block">
                  {inv.documentNumber ?? inv.id}
                </span>
                <span className="text-xs text-muted-foreground">
                  Issued {formatPortalDate(inv.issueDate)}
                  {inv.dueDate ? ` · Due ${formatPortalDate(inv.dueDate)}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-mono tabular-nums text-foreground">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: inv.currency,
                    minimumFractionDigits: 2,
                  }).format(inv.grossMinor / 100)}
                </span>
                <span
                  className={cn(
                    "inline-flex px-1.5 py-0.5 rounded text-micro font-semibold",
                    portalStatusStyle(inv.status),
                  )}
                >
                  {formatPortalStatus(inv.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
