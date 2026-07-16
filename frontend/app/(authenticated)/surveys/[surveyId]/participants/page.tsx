"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { UserPlusIcon, SendIcon, BellIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { getApiError } from "@/lib/api-client";
import {
  useParticipants,
  useInviteParticipants,
  useRemindParticipants,
  type SurveyParticipant,
  type ParticipantStatus,
} from "@/hooks/api/surveys/participants";
import { ParticipantStatusBadge } from "@/features/surveys/participants/participant-status-badge";
import { AddParticipantsDialog } from "@/features/surveys/participants/add-participants-dialog";

export default function SurveyParticipantsPage() {
  const params = useParams<{ surveyId: string }>();
  const surveyId = Number(params.surveyId);

  const [status, setStatus] = useState<ParticipantStatus | "all">("all");
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  const { data: participants, isLoading } = useParticipants(surveyId, {
    status: status === "all" ? undefined : status,
    pageSize: 100,
  });
  const invite = useInviteParticipants(surveyId);
  const remind = useRemindParticipants(surveyId);

  const columns: DataTableColumn<SurveyParticipant>[] = useMemo(
    () => [
      { key: "name", header: "Name", cell: (row) => row.name || row.email || "—" },
      { key: "email", header: "Email", cell: (row) => row.email || "—" },
      { key: "status", header: "Status", cell: (row) => <ParticipantStatusBadge status={row.status} /> },
      { key: "invitedAt", header: "Invited", cell: (row) => (row.invitedAt ? new Date(row.invitedAt).toLocaleDateString() : "—") },
      { key: "completedAt", header: "Completed", cell: (row) => (row.completedAt ? new Date(row.completedAt).toLocaleDateString() : "—") },
    ],
    [],
  );

  async function handleInvite() {
    if (selected.size === 0) return;
    try {
      await invite.mutateAsync(Array.from(selected, Number));
      toast.success("Invitations sent");
      setSelected(new Set());
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  async function handleRemind() {
    if (selected.size === 0) return;
    try {
      await remind.mutateAsync(Array.from(selected, Number));
      toast.success("Reminders sent");
      setSelected(new Set());
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  const hasParticipants = (participants?.length ?? 0) > 0;

  return (
    <DashboardGate permission="surveys:participants:view">
      <RequireModule module="SURVEYS">
        <PageWrapper
          title="Participants"
          backHref={`/surveys/${surveyId}`}
          actions={
            <AnimatedIconButton icon={UserPlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={() => setAddOpen(true)}>
              Add participants
            </AnimatedIconButton>
          }
          filters={
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <AnimatedIconButton icon={SendIcon} iconSize={14} iconClassName="mr-1.5" variant="outline" size="sm" onClick={handleInvite} disabled={invite.isPending}>
                    Invite ({selected.size})
                  </AnimatedIconButton>
                  <AnimatedIconButton icon={BellIcon} iconSize={14} iconClassName="mr-1.5" variant="outline" size="sm" onClick={handleRemind} disabled={remind.isPending}>
                    Remind ({selected.size})
                  </AnimatedIconButton>
                </>
              )}
              <Select value={status} onValueChange={(v) => setStatus(v as ParticipantStatus | "all")}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        >
          {hasParticipants ? (
            <DataTable
              className="flex-1 min-h-0"
              data={participants ?? []}
              columns={columns}
              getRowKey={(row) => row.id}
              isLoading={isLoading}
              selection={{ selected, onChange: setSelected }}
            />
          ) : (
            <EmptyState
              title="No participants yet"
              description="Add participants by email to invite them to this survey."
              action={{ label: "Add participants", onClick: () => setAddOpen(true) }}
              className="flex-1"
            />
          )}
        </PageWrapper>
        <AddParticipantsDialog surveyId={surveyId} open={addOpen} onOpenChange={setAddOpen} />
      </RequireModule>
    </DashboardGate>
  );
}
