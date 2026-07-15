"use client";

import { useState } from "react";
import {
  useClientVisibility,
  useUpdateTicketVisibility,
  useUpdateMilestoneVisibility,
} from "@/hooks/api/projects/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageTabsToolbar } from "@/components/ui/page-tabs-toolbar";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info } from "lucide-react";
import { toast } from "sonner";
import type { ClientVisibilityTicket, ClientVisibilityMilestone } from "@/types/projects";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_PANEL,
  PM_ROW,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

type VisibilityTab = "tickets" | "milestones";

interface ClientVisibilityPageProps {
  projectId: number;
}

function TicketRow({
  ticket,
  projectId,
}: {
  ticket: ClientVisibilityTicket;
  projectId: number;
}) {
  const update = useUpdateTicketVisibility(projectId);

  function handleChange(checked: boolean) {
    update.mutate(
      { id: ticket.id, clientVisible: checked },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }

  return (
    <div className={PM_ROW}>
      <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">
        #{ticket.ticketNumber}
      </span>
      <span className={cn(TEXT_ONE_LINE, "flex-1 text-[11px]")} title={ticket.title}>
        {ticket.title}
      </span>
      <Badge variant="outline" className="w-16 shrink-0 justify-center text-[10px] capitalize">
        {ticket.type}
      </Badge>
      <Switch
        checked={ticket.clientVisible}
        onCheckedChange={handleChange}
        disabled={update.isPending}
        aria-label={`Toggle client visibility for ticket #${ticket.ticketNumber}`}
      />
    </div>
  );
}

function MilestoneRow({
  milestone,
  projectId,
}: {
  milestone: ClientVisibilityMilestone;
  projectId: number;
}) {
  const update = useUpdateMilestoneVisibility(projectId);

  function handleChange(checked: boolean) {
    update.mutate(
      { id: milestone.id, clientVisible: checked },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }

  return (
    <div className={PM_ROW}>
      <span className={cn(TEXT_ONE_LINE, "flex-1 text-[11px]")} title={milestone.name}>
        {milestone.name}
      </span>
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
  const [activeTab, setActiveTab] = useState<VisibilityTab>("tickets");

  const ticketCount = data?.tickets.length ?? 0;
  const milestoneCount = data?.milestones.length ?? 0;

  const VISIBILITY_TABS = ["tickets", "milestones"] as const;

  function handleTabChange(value: string) {
    const found = VISIBILITY_TABS.find((t) => t === value);
    if (found) setActiveTab(found);
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Client Portal"
      subtitle="Control what clients see in their portal"
    >
      <PmPageShell>
        <PmSection index={0}>
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-relaxed text-foreground/80">
              Items toggled here appear in the client&apos;s portal. Only enabled tickets and
              milestones are visible to project clients.
            </p>
          </div>
        </PmSection>

        <PmSection index={1}>
          {isLoading ? (
            <div className={cn(PM_PANEL, "space-y-2 p-3")}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState className="min-h-[14rem]" onRetry={handleRetry} />
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col gap-3">
              <PageTabsToolbar
                tabsDensity="labeled"
                tabs={
                  <TabsList>
                    <TabsTrigger value="tickets">
                      Tickets
                      {ticketCount > 0 ? (
                        <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                          {ticketCount}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="milestones">
                      Milestones
                      {milestoneCount > 0 ? (
                        <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                          {milestoneCount}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                  </TabsList>
                }
              />

              <TabsContent value="tickets" className="mt-0 flex min-h-0 flex-1 flex-col">
                {(data?.tickets ?? []).length === 0 ? (
                  <EmptyState
                    illustrationPreset="ticket"
                    title="No tickets"
                    description="This project has no tickets yet."
                    compact
                    className={CONTENT_FILL_PANEL}
                  />
                ) : (
                  <PmPanel className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                    <div className="flex items-center gap-3 border-b border-border/50 bg-muted/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                      <span className="w-16 shrink-0">ID</span>
                      <span className="flex-1">Title</span>
                      <span className="w-16 shrink-0">Type</span>
                      <span className="w-10 shrink-0 text-right">Visible</span>
                    </div>
                    <ScrollArea fill hideScrollbar>
                      {data?.tickets.map((ticket) => (
                        <TicketRow key={ticket.id} ticket={ticket} projectId={projectId} />
                      ))}
                    </ScrollArea>
                  </PmPanel>
                )}
              </TabsContent>

              <TabsContent value="milestones" className="mt-0 flex min-h-0 flex-1 flex-col">
                {(data?.milestones ?? []).length === 0 ? (
                  <EmptyState
                    illustrationPreset="calendar"
                    title="No milestones"
                    description="This project has no milestones yet."
                    compact
                    className={CONTENT_FILL_PANEL}
                  />
                ) : (
                  <PmPanel className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                    <div className="flex items-center gap-3 border-b border-border/50 bg-muted/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                      <span className="flex-1">Name</span>
                      <span className="w-10 shrink-0 text-right">Visible</span>
                    </div>
                    <ScrollArea fill hideScrollbar>
                      {data?.milestones.map((milestone) => (
                        <MilestoneRow
                          key={milestone.id}
                          milestone={milestone}
                          projectId={projectId}
                        />
                      ))}
                    </ScrollArea>
                  </PmPanel>
                )}
              </TabsContent>
            </Tabs>
          )}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
