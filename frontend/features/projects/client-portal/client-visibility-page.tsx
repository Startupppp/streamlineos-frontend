"use client";

import { useClientVisibility, useUpdateTicketVisibility, useUpdateMilestoneVisibility } from "@/hooks/api/projects/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { toast } from "sonner";
import type { ClientVisibilityTicket, ClientVisibilityMilestone } from "@/types/projects";

interface ClientVisibilityPageProps { projectId: number }

function TicketRow({ ticket, projectId }: { ticket: ClientVisibilityTicket; projectId: number }) {
  const update = useUpdateTicketVisibility(projectId);
  function handleChange(checked: boolean) {
    update.mutate(
      { id: ticket.id, clientVisible: checked },
      { onError: () => toast.error("Failed to update visibility") },
    );
  }
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/40 transition-colors">
      <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0">
        #{ticket.ticketNumber}
      </span>
      <span className="text-[11px] flex-1 min-w-0 truncate">{ticket.title}</span>
      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{ticket.type}</Badge>
      <Switch
        checked={ticket.clientVisible}
        onCheckedChange={handleChange}
        disabled={update.isPending}
        aria-label={`Toggle client visibility for ticket #${ticket.ticketNumber}`}
      />
    </div>
  );
}

function MilestoneRow({ milestone, projectId }: { milestone: ClientVisibilityMilestone; projectId: number }) {
  const update = useUpdateMilestoneVisibility(projectId);
  function handleChange(checked: boolean) {
    update.mutate(
      { id: milestone.id, clientVisible: checked },
      { onError: () => toast.error("Failed to update visibility") },
    );
  }
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/40 transition-colors">
      <span className="text-[11px] flex-1 min-w-0 truncate">{milestone.name}</span>
      <Switch
        checked={milestone.clientVisible}
        onCheckedChange={handleChange}
        disabled={update.isPending}
        aria-label={`Toggle client visibility for milestone ${milestone.name}`}
      />
    </div>
  );
}

export function ClientVisibilityPage({ projectId }: ClientVisibilityPageProps) {
  const { data, isLoading, isError, refetch } = useClientVisibility(projectId);

  return (
    <PageWrapper
      eyebrow="Project"
      title="Client Portal"
      subtitle="Control what clients see in their portal"
    >
      <div className="px-4 pb-4 space-y-6">
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40 px-4 py-3">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            Items toggled here appear in the client&apos;s portal. Only enabled tickets and milestones are visible to project clients.
          </p>
        </div>

        {isLoading ? (
          <SkeletonTable rows={6} columns={3} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <>
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Tickets
              </h2>
              {(data?.tickets ?? []).length === 0 ? (
                <EmptyState
                  illustrationPreset="ticket"
                  title="No tickets"
                  description="This project has no tickets yet."
                  compact
                  className="min-h-[120px]"
                />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="w-16 shrink-0">ID</span>
                    <span className="flex-1">Title</span>
                    <span className="w-16 shrink-0">Type</span>
                    <span className="w-10 shrink-0 text-right">Visible</span>
                  </div>
                  {data?.tickets.map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} projectId={projectId} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                Milestones
              </h2>
              {(data?.milestones ?? []).length === 0 ? (
                <EmptyState
                  illustrationPreset="calendar"
                  title="No milestones"
                  description="This project has no milestones yet."
                  compact
                  className="min-h-[120px]"
                />
              ) : (
                <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                  <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="flex-1">Name</span>
                    <span className="w-10 shrink-0 text-right">Visible</span>
                  </div>
                  {data?.milestones.map((milestone) => (
                    <MilestoneRow key={milestone.id} milestone={milestone} projectId={projectId} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
