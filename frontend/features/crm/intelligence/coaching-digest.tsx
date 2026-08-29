"use client";

import { Info } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type {
  CoachingBand,
  CoachingDigestResponse,
  ObjectionHandling,
} from "@/types/crm/call-intelligence";

interface CoachingDigestViewProps {
  response: CoachingDigestResponse;
}

const HANDLING_LABEL: Record<ObjectionHandling, string> = {
  answered: "Answered",
  acknowledged: "Acknowledged",
  deflected: "Deflected",
  unaddressed: "Unaddressed",
};

/**
 * The team digest over a trailing window.
 *
 * Two absences are reported rather than hidden, because both change what the
 * numbers mean. `suppressed` says the cohort was too small to summarise without
 * describing individuals — every metric is null and that is the answer, not a
 * failure. `embargoed` says how many analyses are still inside their rep's
 * private window; without it a manager draws conclusions from a partial cohort
 * without knowing it is partial.
 *
 * The embargoed figure is deliberately a bare count. Broken down by rep, by band
 * or by day it would become the per-rep leaderboard the private window exists to
 * prevent, arrived at from the other direction.
 */
export function CoachingDigestView({ response }: CoachingDigestViewProps) {
  const { data: digest, meta } = response;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Calls analysed"
          value={digest.cohort}
          featured
          hint={`Last ${meta.sinceDays} days`}
        />
        <StatCard
          label="Still private"
          value={digest.embargoed}
          hint={`Rep's first ${meta.privateWindowHours}h`}
        />
        <StatCard
          label="Next step agreed"
          value={
            digest.nextStepCommittedBps === null
              ? "—"
              : `${(digest.nextStepCommittedBps / 100).toFixed(0)}%`
          }
          hint="Share ending in a commitment"
        />
        <StatCard
          label="No speaker labels"
          value={digest.withoutSpeakerMetrics}
          hint="Talk ratio unavailable"
        />
      </div>

      {digest.suppressed ? (
        <div
          className="flex items-start gap-3 rounded-lg border border-status-info-rule bg-status-info-surface px-4 py-3"
          role="status"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-status-info-ink" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Too few calls to summarise</p>
            <p className="text-sm text-muted-foreground">
              {`This window has ${digest.cohort} readable ${
                digest.cohort === 1 ? "analysis" : "analyses"
              }, below the minimum of ${meta.minimumCohort}. A breakdown this small would describe individuals rather than the team.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <BandChart title="Talk ratio" caption="Share of the call the rep spoke" bands={digest.talkRatio} />
          <BandChart
            title="Question rate"
            caption="Questions per rep turn"
            bands={digest.questionRate}
          />
          <ObjectionChart handling={digest.objectionHandling} />
          <CompetitorList
            competitors={digest.competitors}
          />
        </div>
      )}

      {meta.truncated ? (
        <p className="text-sm text-muted-foreground">
          This window held more analyses than one digest reads. Narrow the range for
          a complete picture.
        </p>
      ) : null}
    </div>
  );
}

function BandChart({
  title,
  caption,
  bands,
}: {
  title: string;
  caption: string;
  bands: CoachingBand[] | null;
}) {
  if (bands === null || bands.length === 0)
    return (
      <Section title={title} caption={caption}>
        <p className="text-sm text-muted-foreground">Not available for this cohort.</p>
      </Section>
    );

  const max = bands.reduce((peak, band) => Math.max(peak, band.calls), 0) || 1;

  return (
    <Section title={title} caption={caption}>
      <ul className="flex flex-col gap-2">
        {bands.map((band) => (
          <li key={band.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm text-muted-foreground">{band.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${(band.calls / max) * 100}%` }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-sm tabular-nums">{band.calls}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ObjectionChart({
  handling,
}: {
  handling: Record<ObjectionHandling, number> | null;
}) {
  if (handling === null)
    return (
      <Section title="Objection handling" caption="How raised objections were dealt with">
        <p className="text-sm text-muted-foreground">Not available for this cohort.</p>
      </Section>
    );

  const entries = Object.entries(handling) as [ObjectionHandling, number][];
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <Section title="Objection handling" caption="How raised objections were dealt with">
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No objections recorded in this window.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map(([key, count]) => (
            <li key={key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm text-muted-foreground">
                {HANDLING_LABEL[key]}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-sm tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function CompetitorList({
  competitors,
}: {
  competitors: { name: string; calls: number }[] | null;
}) {
  return (
    <Section title="Competitors named" caption="Rivals mentioned by customers">
      {competitors === null || competitors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No competitor was named in this window.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {competitors.map((competitor) => (
            <li key={competitor.name} className="flex items-center justify-between gap-3">
              <span className="text-sm">{competitor.name}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {`${competitor.calls} ${competitor.calls === 1 ? "call" : "calls"}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{caption}</p>
      </div>
      {children}
    </section>
  );
}
