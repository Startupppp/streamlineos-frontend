"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatMoney } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useProjects } from "@/hooks/api/build";
import { useRatePreview } from "@/hooks/api/timesheets-core/rate-preview";
import type { ResolvedRatePreview } from "@/features/timesheets/types";

const NONE = "__none__";

const SOURCE_LABEL: Record<NonNullable<ResolvedRatePreview["source"]>, string> = {
  RATE_CARD: "a rate card",
  PROJECT_MEMBER: "the project member rate",
};

/**
 * Exported so the four outcomes can be asserted directly.
 *
 * The panel only queries once a project or member is picked, and that selection
 * is component state a test cannot reach without driving a Radix Select through
 * jsdom. Testing the outcome renderer through the panel would mean testing the
 * combobox instead of the thing that matters, so the renderer is its own unit
 * and the panel keeps a reachability test.
 */
export function RatePreviewResult({ rate }: { rate: ResolvedRatePreview }) {
  const orgDisplay = useOrgDisplay();

  if (rate.source === null || rate.billRate === null) {
    const tone = statusToneClasses("warning");
    return (
      <div className={cn("rounded-lg border p-3", tone.surface, tone.rule)}>
        {/*
          The case worth building this for. No rate card matched and the person
          has no rate on the project, so work here bills at nothing — which is
          silent until an invoice comes out short.
        */}
        <p className={cn("text-sm font-medium", tone.ink)}>
          Nothing would be billed
        </p>
        <p className="mt-1 text-dense text-muted-foreground">
          No rate card matches this combination and there is no rate on the
          project member. Time logged against it resolves to no bill rate.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/70 p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-lg font-semibold tabular-nums">
          {formatMoney(rate.billRate, orgDisplay)}
        </span>
        <span className="text-dense text-muted-foreground">per hour</span>
        <Badge variant="outline" className="ml-auto">
          from {SOURCE_LABEL[rate.source]}
        </Badge>
      </div>
      <p className="mt-1 text-dense text-muted-foreground">
        {rate.costRate === null
          ? "No cost rate is set, so margin cannot be computed for this work."
          : `Cost ${formatMoney(rate.costRate, orgDisplay)} per hour.`}
        {rate.currency ? ` Priced in ${rate.currency}.` : ""}
      </p>
    </div>
  );
}

/**
 * TS. "Which rate actually applies here?"
 *
 * Rate cards overlap by design — one for the project, one for a person, one for
 * a window, each with a priority — so which card wins for a given combination
 * is genuinely hard to work out by reading the table above. The backend already
 * had the answer at `GET /timesheets/billing/rate-preview`, running the same
 * resolver that prices an entry at invoicing time, and nothing called it: the
 * only way to find out whether a card you had just written took effect was to
 * invoice and look.
 *
 * Deliberately read-only and beside the cards rather than inside the form. It
 * answers a question about the whole set, not about the row being edited.
 */
export function RatePreviewPanel() {
  const [projectId, setProjectId] = useState(NONE);
  const [userId, setUserId] = useState("");

  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];

  const input = {
    projectId: projectId === NONE ? undefined : Number(projectId),
    userId: userId || undefined,
  };
  const hasSelection = input.projectId != null || input.userId != null;
  const { data, isFetching, isError, error } = useRatePreview(input);

  return (
    <Card className="mb-3">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-medium">Which rate applies?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        <p className="text-dense text-muted-foreground">
          Runs the same resolver that prices an entry when it is invoiced, so
          this is what the combination would actually bill at — not a guess from
          reading the cards.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rate-preview-project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="rate-preview-project">
                <SelectValue placeholder="Any project" />
              </SelectTrigger>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                <SelectItem value={NONE}>Any project</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Member</Label>
            <UserCombobox
              value={userId}
              onChange={setUserId}
              placeholder="Any member"
              allowUnassigned
            />
          </div>
        </div>

        {!hasSelection ? (
          <p className="text-dense text-muted-foreground">
            Pick a project, a member, or both.
          </p>
        ) : isError ? (
          <p role="alert" className="text-dense text-destructive">
            {getErrorMessage(error)}
          </p>
        ) : isFetching && !data ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : data ? (
          <RatePreviewResult rate={data} />
        ) : null}
      </CardContent>
    </Card>
  );
}
