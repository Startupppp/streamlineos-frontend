"use client";

import { memo } from "react";
import { AlertTriangle, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type {
  ReorderEvidenceLine,
  ReorderPosition,
  ReorderProposal,
} from "@/hooks/api/inventory/planning";
import { formatQuantity } from "./forecast-format";

interface RecommendationCopy {
  tone: StatusTone;
  badge: string;
  headline: string;
  body: string;
  /** Exact decimal string, as the API sends it. */
  quantity: string | null;
}

/**
 * The engine returns `null` with a reason in several shapes of demand. That
 * refusal is the answer, so each one gets its own sentence rather than
 * collapsing into a zero or an empty panel.
 */
export function describeRecommendation(proposal: ReorderProposal): RecommendationCopy {
  const modelDeclined = proposal.reorderPoint === null;

  if (proposal.recommendation === "hold") {
    return modelDeclined
      ? {
          tone: "neutral",
          badge: "Hold",
          headline: "No demand to buffer against",
          body: "Nothing sold in the measured window, so there is no reorder point and no quantity to propose.",
          quantity: null,
        }
      : {
          tone: "neutral",
          badge: "Hold",
          headline: "Position already covers the reorder point",
          body: "Available plus on order meets the reorder point, so ordering now would buy stock the warehouse does not need yet.",
          quantity: null,
        };
  }

  if (proposal.recommendation === "review") {
    return proposal.suggestedQuantity === null
      ? {
          tone: "warning",
          badge: "Review",
          headline: "The engine declined to put a number on this",
          body: "A normal-model safety stock does not describe this demand shape, and a number derived from it would look like a service level without being one. The caveats below say why; the quantity is a planner's call.",
          quantity: null,
        }
      : {
          tone: "warning",
          badge: "Review",
          headline: "Read the caveats before ordering",
          body: "The arithmetic holds, but at least one input is weaker than the figure suggests. This is not a proposal to approve unread.",
          quantity: proposal.suggestedQuantity,
        };
  }

  return {
    tone: "success",
    badge: "Propose",
    headline: "Ready to order",
    body: "Inventory position sits below the reorder point and no input raised a caveat.",
    quantity: proposal.suggestedQuantity,
  };
}

interface RecommendationBannerProps {
  proposal: ReorderProposal;
}

const RecommendationBanner = memo(function RecommendationBanner({
  proposal,
}: RecommendationBannerProps) {
  const copy = describeRecommendation(proposal);
  const tone = statusToneClasses(copy.tone);

  return (
    <div className={cn("rounded-xl border p-4", tone.surface, tone.rule)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn("h-5 shrink-0 px-2 py-0.5 text-micro font-semibold", tone.rule, tone.ink)}
        >
          {copy.badge}
        </Badge>
        <p className={cn("text-sm font-semibold", tone.inkStrong)}>{copy.headline}</p>
      </div>

      {copy.quantity === null ? (
        <p className={cn("mt-2 font-mono text-sm tabular-nums", tone.ink)}>
          No quantity proposed
        </p>
      ) : (
        <p className={cn("mt-2 font-mono text-lg font-semibold tabular-nums", tone.inkStrong)}>
          {formatQuantity(copy.quantity)}
          <span className="ml-1.5 text-dense font-normal">units</span>
        </p>
      )}

      <p className="mt-1.5 text-dense leading-relaxed text-muted-foreground">{copy.body}</p>
    </div>
  );
});

interface PositionTileProps {
  label: string;
  value: string;
}

const PositionTile = memo(function PositionTile({ label, value }: PositionTileProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-2 py-1.5">
      <span className="text-micro text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
        {formatQuantity(value)}
      </span>
    </div>
  );
});

interface PositionGridProps {
  position: ReorderPosition;
  reorderPoint: string | null;
}

const PositionGrid = memo(function PositionGrid({ position, reorderPoint }: PositionGridProps) {
  return (
    <div>
      <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-muted-foreground">
        Measured position
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        <PositionTile label="On hand" value={position.onHand} />
        <PositionTile label="Committed" value={position.committed} />
        <PositionTile label="On order" value={position.onOrder} />
        <PositionTile label="Available" value={position.available} />
        {reorderPoint === null ? (
          <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-2 py-1.5">
            <span className="text-micro text-muted-foreground">Reorder point</span>
            <span className="text-xs font-semibold text-muted-foreground">Not established</span>
          </div>
        ) : (
          <PositionTile label="Reorder point" value={reorderPoint} />
        )}
      </div>
    </div>
  );
});

interface EvidenceListProps {
  evidence: ReorderEvidenceLine[];
}

const EvidenceList = memo(function EvidenceList({ evidence }: EvidenceListProps) {
  if (evidence.length === 0) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <ListChecks className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Evidence
        </p>
      </div>
      <ul className="divide-y divide-border/60 rounded-md border border-border bg-card">
        {evidence.map((line) => (
          <li key={`${line.label}-${line.value}`} className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-dense font-medium text-foreground">{line.label}</span>
              <span className="shrink-0 font-mono text-dense tabular-nums text-foreground">
                {line.value}
              </span>
            </div>
            <p className="mt-0.5 text-micro leading-relaxed text-muted-foreground">{line.source}</p>
          </li>
        ))}
      </ul>
    </div>
  );
});

interface CaveatListProps {
  caveats: string[];
}

const CaveatList = memo(function CaveatList({ caveats }: CaveatListProps) {
  if (caveats.length === 0) return null;
  const tone = statusToneClasses("warning");

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <AlertTriangle className={cn("h-3.5 w-3.5", tone.ink)} aria-hidden />
        <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Caveats ({caveats.length})
        </p>
      </div>
      <ul className={cn("space-y-1.5 rounded-md border p-3", tone.surface, tone.rule)}>
        {caveats.map((caveat) => (
          <li key={caveat} className={cn("text-dense leading-relaxed", tone.ink)}>
            {caveat}
          </li>
        ))}
      </ul>
    </div>
  );
});

interface ForecastProposalDetailProps {
  proposal: ReorderProposal;
}

export const ForecastProposalDetail = memo(function ForecastProposalDetail({
  proposal,
}: ForecastProposalDetailProps) {
  return (
    <div className="space-y-4">
      <RecommendationBanner proposal={proposal} />
      <PositionGrid position={proposal.position} reorderPoint={proposal.reorderPoint} />
      <EvidenceList evidence={proposal.evidence} />
      <CaveatList caveats={proposal.caveats} />
    </div>
  );
});
