"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadActivityTimeline } from "./lead-activity-timeline";

interface TimelineItem {
  id: number | string;
  type: string;
  timestamp?: string | Date | null;
  data: Record<string, unknown>;
}

interface LeadSidebarProps {
  lead: {
    assignedTo?: {
      name?: string | null;
      email?: string | null;
    } | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    assignedAt?: Date | string | null;
    convertedAt?: Date | string | null;
    [key: string]: unknown;
  };
  timeline: TimelineItem[] | undefined;
  timelineLoading: boolean;
}

export function LeadSidebar({
  lead,
  timeline,
  timelineLoading,
}: LeadSidebarProps) {
  const keyDates = [
    { label: "Created", value: lead.createdAt },
    { label: "Updated", value: lead.updatedAt },
    { label: "Assigned", value: lead.assignedAt },
    { label: "Converted", value: lead.convertedAt },
  ].filter((d) => d.value);

  return (
    <div className="space-y-6">
      {/* ── Assigned To ─────────────────────────────────────────────────── */}
      {lead.assignedTo && (
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base">Assigned To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#bd882c]/10 flex items-center justify-center text-sm font-semibold text-[#bd882c]">
                {lead.assignedTo.name?.[0] ?? "?"}
              </div>
              <div>
                <p className="text-sm font-medium">{lead.assignedTo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {lead.assignedTo.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Key Dates ───────────────────────────────────────────────────── */}
      <Card className="shadow-noir">
        <CardHeader>
          <CardTitle className="text-base">Key Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {keyDates.map((d) => (
            <div
              key={d.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{d.label}</span>
              <span>
                {new Date(d.value as string | Date).toLocaleDateString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Activity Timeline ───────────────────────────────────────────── */}
      <LeadActivityTimeline
        timeline={timeline}
        isLoading={timelineLoading}
      />
    </div>
  );
}
