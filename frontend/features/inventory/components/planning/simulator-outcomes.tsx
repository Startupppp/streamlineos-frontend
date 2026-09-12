"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { SimulationOutcome, SimulationResult } from "@/hooks/api/inventory/planning";
import {
  formatQuantity,
  formatServiceLevel,
  formatSignedQuantity,
  formatWeeks,
} from "./forecast-format";

function deltaTone(value: number): StatusTone {
  if (value > 0) return "warning";
  if (value < 0) return "info";
  return "neutral";
}

interface AssumptionTileProps {
  label: string;
  value: string;
}

const AssumptionTile = memo(function AssumptionTile({ label, value }: AssumptionTileProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/40 px-2 py-1.5">
      <span className="text-micro text-muted-foreground">{label}</span>
      <span className="font-mono text-xs font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
});

interface DeltaFigureProps {
  label: string;
  delta: number;
  absolute: number;
}

const DeltaFigure = memo(function DeltaFigure({ label, delta, absolute }: DeltaFigureProps) {
  const tone = statusToneClasses(deltaTone(delta));
  return (
    <div className={cn("rounded-md border px-3 py-2", tone.surface, tone.rule)}>
      <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("font-mono text-lg font-semibold tabular-nums", tone.inkStrong)}>
        {formatSignedQuantity(delta)}
      </p>
      <p className="font-mono text-micro tabular-nums text-muted-foreground">
        {formatQuantity(absolute)} in this scenario
      </p>
    </div>
  );
});

interface OutcomeAssumptionsProps {
  outcome: SimulationOutcome;
}

const OutcomeAssumptions = memo(function OutcomeAssumptions({ outcome }: OutcomeAssumptionsProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      <AssumptionTile label="Weekly demand" value={formatQuantity(outcome.demandMean)} />
      <AssumptionTile label="Lead time" value={formatWeeks(outcome.leadTimeWeeks)} />
      <AssumptionTile label="Service level" value={formatServiceLevel(outcome.serviceLevel)} />
    </div>
  );
});

interface BaselineStripProps {
  outcome: SimulationOutcome;
}

const BaselineStrip = memo(function BaselineStrip({ outcome }: BaselineStripProps) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="h-5 shrink-0 px-2 py-0.5 text-micro font-semibold">
          Measured
        </Badge>
        <p className="text-dense font-medium text-foreground">
          Today&rsquo;s policy, recomputed from the ledger
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <AssumptionTile label="Safety stock" value={formatQuantity(outcome.safetyStock)} />
        <AssumptionTile label="Reorder point" value={formatQuantity(outcome.reorderPoint)} />
      </div>
      <OutcomeAssumptions outcome={outcome} />
    </div>
  );
});

interface ScenarioCardProps {
  outcome: SimulationOutcome;
}

const ScenarioCard = memo(function ScenarioCard({ outcome }: ScenarioCardProps) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      <p className="text-dense font-semibold text-foreground">{outcome.label}</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        <DeltaFigure
          label="Safety stock"
          delta={outcome.deltaSafetyStock}
          absolute={outcome.safetyStock}
        />
        <DeltaFigure
          label="Reorder point"
          delta={outcome.deltaReorderPoint}
          absolute={outcome.reorderPoint}
        />
      </div>
      <OutcomeAssumptions outcome={outcome} />
    </div>
  );
});

interface SimulatorOutcomesProps {
  result: SimulationResult;
}

export const SimulatorOutcomes = memo(function SimulatorOutcomes({
  result,
}: SimulatorOutcomesProps) {
  const warning = statusToneClasses("warning");

  if (!result.applicable || result.baseline === null) {
    return (
      <div className={cn("space-y-2 rounded-xl border p-4", warning.surface, warning.rule)}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn("h-5 shrink-0 px-2 py-0.5 text-micro font-semibold", warning.rule, warning.ink)}
          >
            Not simulated
          </Badge>
          <p className={cn("text-sm font-semibold", warning.inkStrong)}>
            There is no valid policy to vary
          </p>
        </div>
        <p className="text-dense leading-relaxed text-muted-foreground">
          {result.reason ??
            "The safety-stock model does not describe this demand, so a what-if built on it would be a more confident version of the same mistake."}
        </p>
        {result.caveats.length > 0 ? (
          <ul className="space-y-1">
            {result.caveats.map((caveat) => (
              <li key={caveat} className={cn("text-dense leading-relaxed", warning.ink)}>
                {caveat}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BaselineStrip outcome={result.baseline} />
      {result.scenarios.map((outcome, index) => (
        <ScenarioCard key={`${outcome.label}-${index}`} outcome={outcome} />
      ))}
      {result.caveats.length > 0 ? (
        <ul className={cn("space-y-1.5 rounded-md border p-3", warning.surface, warning.rule)}>
          {result.caveats.map((caveat) => (
            <li key={caveat} className={cn("text-dense leading-relaxed", warning.ink)}>
              {caveat}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
