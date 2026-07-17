"use client";

import { PhoneCall, StickyNote, Mail, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ActivityTimeline } from "./activity-timeline";
import { MeetingsCard } from "./meetings-card";
import { DealAiInsightsCard } from "./deal-ai-insights-card";
import { DealHealthChip } from "./deal-health-chip";
import { DealNextStepInline } from "./deal-next-step-inline";
import { DealApprovalBanner } from "./deal-approval-banner";
import { DealCompetitorsCard } from "./deal-competitors-card";
import { DealStakeholdersCard } from "./deal-stakeholders-card";
import type { DealActivity, DealMeeting } from "@/hooks/api/crm";

interface AssignedTo {
  name?: string | null;
}

interface Lead {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Client {
  name?: string | null;
}

interface KeyDate {
  label: string;
  value: string | null | undefined;
}

interface DealSidebarCardsProps {
  assignedTo?: AssignedTo | null;
  lead?: Lead | null;
  client?: Client | null;
  keyDates: KeyDate[];
  meetings?: DealMeeting[];
  activities: DealActivity[];
  onQuickActionClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onAddMeeting: () => void;
  onDeleteMeeting: (meetingId: number) => void;
  dealId: number;
  dealName?: string | null;
  healthScore?: number | null;
  nextStep?: string | null;
  pipelineId?: string | null;
  dealValue?: string | null;
  dealStage?: string | null;
  forecastCategory?: string | null;
  approvalPending?: boolean;
}

const QUICK_ACTIONS = [
  { label: "Log Call", icon: PhoneCall, type: "call" as const },
  { label: "Add Note", icon: StickyNote, type: "note" as const },
  { label: "Log Email", icon: Mail, type: "email" as const },
  { label: "Log Meeting", icon: Video, type: "meeting" as const },
] as const;

export function DealSidebarCards({
  assignedTo,
  lead,
  client,
  keyDates,
  meetings,
  activities,
  onQuickActionClick,
  onAddMeeting,
  onDeleteMeeting,
  dealId,
  dealName,
  healthScore,
  nextStep,
  approvalPending,
}: DealSidebarCardsProps) {
  return (
    <>
      {assignedTo && (
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base">Assigned To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {assignedTo.name?.[0] ?? "?"}
              </div>
              <TruncatedText text={assignedTo.name ?? ""} className="text-sm font-medium min-w-0 flex-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {lead && (
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base">Linked Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/crm/leads/${lead.id}`}
              className="flex items-center gap-3 group min-w-0"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {lead.name?.[0] ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <TruncatedText text={lead.name ?? ""} className="text-sm font-medium group-hover:text-primary transition-colors" />
                {lead.email && (
                  <p className="text-xs text-muted-foreground break-all">{lead.email}</p>
                )}
                {lead.phone && (
                  <p className="text-xs text-muted-foreground">{lead.phone}</p>
                )}
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {client && (
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base">Linked Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm font-semibold text-emerald-400 shrink-0">
                {client.name?.[0] ?? "?"}
              </div>
              <TruncatedText text={client.name ?? ""} className="text-sm font-medium min-w-0 flex-1" />
            </div>
          </CardContent>
        </Card>
      )}

      {approvalPending && (
        <DealApprovalBanner dealId={dealId} />
      )}

      {typeof healthScore === "number" && (
        <DealHealthChip score={healthScore} dealId={dealId} />
      )}

      {nextStep !== undefined && (
        <DealNextStepInline
          dealId={dealId}
          nextStep={nextStep ?? null}
        />
      )}

      <DealCompetitorsCard dealId={dealId} />
      <DealStakeholdersCard dealId={dealId} />

      <Card className="shadow-noir">
        <CardHeader>
          <CardTitle className="text-base">Key Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {keyDates
            .filter((d) => d.value)
            .map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{d.label}</span>
                <span>{new Date(d.value!).toLocaleDateString("en-IN")}</span>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card className="shadow-noir">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.type}
                variant="outline"
                size="sm"
                className="justify-start gap-2 text-xs"
                data-action-type={action.type}
                data-action-label={action.label}
                onClick={onQuickActionClick}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <MeetingsCard
        meetings={meetings}
        onAddMeeting={onAddMeeting}
        onDeleteMeeting={onDeleteMeeting}
      />

      <Card className="shadow-noir">
        <CardHeader>
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>

      <DealAiInsightsCard dealId={dealId} dealName={dealName} />
    </>
  );
}
