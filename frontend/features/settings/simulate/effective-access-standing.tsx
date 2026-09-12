"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { MODULE_LABELS } from "@/components/rbac/permission-matrix-types";
import type {
  ExplainedModuleStanding,
  OrgStanding,
} from "@/hooks/api/roles-schema";
import type { ModuleGrantable } from "@/hooks/api/module-access/module-access-schema";
import {
  MODULE_STANDING_LABELS,
  MODULE_STANDING_TONES,
  ORG_STANDING_DESCRIPTIONS,
  ORG_STANDING_LABELS,
  ORG_STANDING_TONES,
  SCOPE_LABELS,
  UNAVAILABLE_MODULE_EXPLANATION,
  grantableRankLabel,
} from "./effective-access-labels";

interface OrgStandingCardProps {
  standing: OrgStanding;
  personName: string;
  permissionCount: number;
  isRefreshing: boolean;
}

export function OrgStandingCard({
  standing,
  personName,
  permissionCount,
  isRefreshing,
}: OrgStandingCardProps) {
  const tone = statusToneClasses(ORG_STANDING_TONES[standing]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Organization standing</h2>
          <Badge
            variant="outline"
            className={cn("h-5 px-2 py-0.5 text-xs", tone.surface, tone.ink, tone.rule)}
          >
            {ORG_STANDING_LABELS[standing]}
          </Badge>
          {isRefreshing ? (
            <Badge
              variant="outline"
              className="h-5 px-2 py-0.5 text-xs"
              aria-live="polite"
            >
              Pending — re-resolving access…
            </Badge>
          ) : null}
        </div>
        <p className="text-[13px] text-muted-foreground">
          {ORG_STANDING_DESCRIPTIONS[standing]}
        </p>
        <p className="text-[13px] text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">
            {permissionCount}
          </span>{" "}
          effective permission{permissionCount === 1 ? "" : "s"} resolved for{" "}
          <span className="font-medium text-foreground">{personName}</span>.
        </p>
      </CardContent>
    </Card>
  );
}

interface ModuleStandingListProps {
  moduleStandings: ExplainedModuleStanding[];
}

export function ModuleStandingList({ moduleStandings }: ModuleStandingListProps) {
  const hasUnavailable = moduleStandings.some((standing) => !standing.available);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold">Standing per module</h2>
        <div className="flex flex-wrap gap-2">
          {moduleStandings.map((standing) => (
            <ModuleStandingChip key={standing.moduleKey} standing={standing} />
          ))}
        </div>
        {hasUnavailable ? (
          <p className="text-[13px] text-muted-foreground">
            {UNAVAILABLE_MODULE_EXPLANATION}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface ModuleStandingChipProps {
  standing: ExplainedModuleStanding;
}

function ModuleStandingChip({ standing }: ModuleStandingChipProps) {
  const tone = statusToneClasses(MODULE_STANDING_TONES[standing.standing]);
  const unavailable = statusToneClasses("warning");
  const label = MODULE_LABELS[standing.moduleKey] ?? standing.moduleKey;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <Badge
        variant="outline"
        className={cn("h-5 px-2 py-0.5 text-[10px]", tone.surface, tone.ink, tone.rule)}
      >
        {MODULE_STANDING_LABELS[standing.standing]}
      </Badge>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {standing.permissionCount}
      </span>
      {standing.available ? null : (
        <Badge
          variant="outline"
          className={cn(
            "h-5 px-2 py-0.5 text-[10px]",
            unavailable.surface,
            unavailable.ink,
            unavailable.rule,
          )}
        >
          Unavailable — module not enabled
        </Badge>
      )}
    </div>
  );
}

interface ModuleGrantabilityNoteProps {
  moduleKey: string;
  grantable: ModuleGrantable | undefined;
  isPending: boolean;
  isError: boolean;
}

/**
 * What the VIEWER may hand out in this module, never what the subject holds.
 * The screen offers only these options, so an administrator is not shown a
 * control whose grant the API would refuse.
 */
export function ModuleGrantabilityNote({
  moduleKey,
  grantable,
  isPending,
  isError,
}: ModuleGrantabilityNoteProps) {
  const label = MODULE_LABELS[moduleKey] ?? moduleKey;

  if (isPending)
    return (
      <div className="flex items-center gap-2" aria-live="polite">
        <span className="text-[13px] text-muted-foreground">
          Pending — checking what you can grant in {label}…
        </span>
        <Skeleton className="h-4 w-40" />
      </div>
    );

  if (isError || !grantable)
    return (
      <p className="text-[13px] text-muted-foreground">
        Your grant options in {label} could not be read, so none are offered
        here.
      </p>
    );

  const ranks = grantable.grantableRanks.map(grantableRankLabel);
  const options = grantable.canGrantModuleOwnership
    ? ["Module owner", ...ranks]
    : ranks;

  if (options.length === 0)
    return (
      <p className="text-[13px] text-muted-foreground">
        You cannot grant standing in {label}.
      </p>
    );

  return (
    <p className="text-[13px] text-muted-foreground">
      You may grant in {label}:{" "}
      <span className="text-foreground">{options.join(", ")}</span> — up to{" "}
      <span className="text-foreground">
        {SCOPE_LABELS[grantable.scopeCeiling]}
      </span>
      .
    </p>
  );
}
