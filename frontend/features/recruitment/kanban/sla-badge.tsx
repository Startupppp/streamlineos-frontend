"use client";

import { memo } from "react";
import { Clock } from "lucide-react";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import type { SlaCandidateStatus } from "@/types/hr";

interface SlaBadgeProps {
  status: SlaCandidateStatus;
}

const SLA_BADGE_CONFIG: Record<SlaCandidateStatus, { label: string; tone: BadgeTone; title: string }> = {
  ON_TRACK: { label: "On Track", tone: "success", title: "SLA: On Track" },
  AT_RISK: { label: "At Risk", tone: "warning", title: "SLA: At Risk" },
  BREACHED: { label: "Breached", tone: "danger", title: "SLA: Breached" },
};

export const SlaBadge = memo(function SlaBadge({ status }: SlaBadgeProps) {
  const cfg = SLA_BADGE_CONFIG[status];
  return (
    <span title={cfg.title}>
      <SemanticBadge
        tone={cfg.tone}
        label={cfg.label}
        icon={<Clock className="h-2.5 w-2.5 shrink-0" />}
        size="xs"
        className="rounded-full"
      />
    </span>
  );
});
