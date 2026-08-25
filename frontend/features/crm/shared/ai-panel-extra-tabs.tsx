"use client";

import { useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useNextBestActionsAcrossPipeline } from "@/hooks/api/crm";
import { MeetingFollowUpComposer } from "./meeting-follow-up-composer";

type AiEntityType = "lead" | "deal" | "contact";

interface AiDisabledBannerProps { href: string }

function AiDisabledBanner({ href }: AiDisabledBannerProps) {
  return (
    <div className="py-2 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg px-3">
      This AI feature is disabled for your organization. Enable it in{" "}
      <a href={href} className="text-primary hover:underline">AI Settings</a>.
    </div>
  );
}

const URGENCY_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "default",
  medium: "outline",
  low: "secondary",
};

interface NbaEvidenceItem { kind: string; label: string; value: string }
interface NbaAction {
  leadId: number;
  leadName: string;
  action: string;
  urgency: string;
  reasoning: string;
  evidence?: NbaEvidenceItem[];
  rationale?: string;
}

export function MeetingFollowUpTab({
  entityType,
  entityId,
  entityName,
  emailEnabled,
}: {
  entityType: AiEntityType;
  entityId: number;
  entityName?: string;
  emailEnabled: boolean;
}) {
  if (!emailEnabled) return <AiDisabledBanner href="/crm/settings/ai" />;
  const attendeeType = entityType === "deal" ? "lead" : entityType === "lead" ? "lead" : "client";
  return (
    <MeetingFollowUpComposer
      attendeeType={attendeeType as "lead" | "client"}
      attendeeId={entityId}
      attendeeName={entityName}
    />
  );
}

export function NextActionsTab({ chatEnabled }: { chatEnabled: boolean }) {
  const [result, setResult] = useState<{ actions: NbaAction[] } | null>(null);
  const { mutate: getActions, isPending } = useNextBestActionsAcrossPipeline();

  const handleGetActions = useCallback(() => {
    getActions(3, {
      onSuccess: (data) => setResult(data as { actions: NbaAction[] }),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [getActions]);

  if (!chatEnabled) return <AiDisabledBanner href="/crm/settings/ai" />;

  return (
    <div className="space-y-3">
      <LoadingButton
        size="sm"
        isPending={isPending}
        loadingText="Fetching..."
        onClick={handleGetActions}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Get Next Best Actions
      </LoadingButton>
      {result && (
        <div className="space-y-2">
          {result.actions.map((action, i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant={URGENCY_VARIANT[action.urgency] ?? "secondary"}
                  className="text-[9px] h-4 px-1 capitalize"
                >
                  {action.urgency}
                </Badge>
                <span className="text-micro text-muted-foreground">{action.leadName}</span>
              </div>
              <p className="text-xs font-medium text-foreground">{action.action}</p>
              <p className="text-dense text-muted-foreground leading-snug">{action.reasoning}</p>
              {action.evidence && action.evidence.length > 0 && (
                <ul className="space-y-0.5 pt-0.5">
                  {action.evidence.map((ev, j) => (
                    <li key={j} className="text-micro text-muted-foreground flex gap-1">
                      <span className="font-medium">{ev.label}:</span>
                      <span>{ev.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
