"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { QaStateBadge } from "./release-list-parts";
import type { ManagedProductRelationsGetReleaseResponse } from "@/contracts/build-contracts.generated";

type Evidence = NonNullable<ManagedProductRelationsGetReleaseResponse["evidence"]>;

interface EvidenceOwner {
  projectId: number | null;
  projectKey: string | null;
  returnParam: string;
}

interface EvidenceSectionProps {
  evidence: Evidence;
  owner: EvidenceOwner;
}

function hiddenNote(total: number, shown: number, restricted: boolean): string | null {
  if (restricted)
    return total === 1
      ? "1 record is linked. You do not have access to the owning project, so its detail is hidden."
      : `${String(total)} records are linked. You do not have access to the owning project, so their detail is hidden.`;
  const hidden = total - shown;
  if (hidden <= 0) return null;
  return `${String(hidden)} more not shown here.`;
}

function ownerHref(owner: EvidenceOwner, suffix: string): string | null {
  if (owner.projectId === null) return null;
  return `/build/${String(owner.projectId)}/${suffix}?ret=${owner.returnParam}`;
}

export function EvidenceTicketList({ evidence, owner }: EvidenceSectionProps) {
  const note = hiddenNote(
    evidence.ticketCount,
    evidence.tickets.length,
    evidence.restricted,
  );
  return (
    <section aria-labelledby="evidence-tickets-heading" className="flex flex-col gap-2">
      <h3 id="evidence-tickets-heading" className="text-sm font-semibold text-foreground">
        Tickets ({evidence.ticketCount})
      </h3>
      {evidence.tickets.length === 0 && !evidence.restricted ? (
        <p className="text-sm text-muted-foreground">No tickets linked.</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Linked tickets">
          {evidence.tickets.map((ticket) => {
            const href =
              owner.projectKey === null
                ? null
                : ownerHref(
                    owner,
                    `tickets/${owner.projectKey}-${String(ticket.ticketNumber)}`,
                  );
            return (
              <li key={ticket.ticketId} className="flex items-center gap-2 text-sm">
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                  #{ticket.ticketNumber}
                </span>
                {href === null ? (
                  <span className="truncate text-foreground">{ticket.title}</span>
                ) : (
                  <Link href={href} className="truncate text-foreground hover:underline">
                    {ticket.title}
                  </Link>
                )}
                <Badge variant="outline" className="ml-auto shrink-0 text-micro">
                  {ticket.status}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
      {note === null ? null : (
        <p className="text-xs text-muted-foreground">{note}</p>
      )}
    </section>
  );
}

export function EvidenceTestRunList({ evidence, owner }: EvidenceSectionProps) {
  const note = hiddenNote(
    evidence.testRunCount,
    evidence.testRuns.length,
    evidence.restricted,
  );
  return (
    <section aria-labelledby="evidence-test-runs-heading" className="flex flex-col gap-2">
      <h3 id="evidence-test-runs-heading" className="text-sm font-semibold text-foreground">
        Test runs ({evidence.testRunCount})
      </h3>
      {evidence.testRuns.length === 0 && !evidence.restricted ? (
        <p className="text-sm text-muted-foreground">No test runs recorded.</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Test runs">
          {evidence.testRuns.map((run) => {
            const href = ownerHref(owner, `qa/runs/${String(run.id)}`);
            return (
              <li key={run.id} className="flex items-center gap-2 text-sm">
                {href === null ? (
                  <span className="truncate text-foreground">{run.name}</span>
                ) : (
                  <Link href={href} className="truncate text-foreground hover:underline">
                    {run.name}
                  </Link>
                )}
                <Badge variant="outline" className="ml-auto shrink-0 text-micro">
                  {run.status}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
      {note === null ? null : (
        <p className="text-xs text-muted-foreground">{note}</p>
      )}
    </section>
  );
}

export function EvidenceIncidentList({ evidence, owner }: EvidenceSectionProps) {
  const note = hiddenNote(
    evidence.incidentCount,
    evidence.incidents.length,
    evidence.restricted,
  );
  return (
    <section aria-labelledby="evidence-incidents-heading" className="flex flex-col gap-2">
      <h3 id="evidence-incidents-heading" className="text-sm font-semibold text-foreground">
        Incidents ({evidence.incidentCount})
      </h3>
      {evidence.incidents.length === 0 && !evidence.restricted ? (
        <p className="text-sm text-muted-foreground">No incidents recorded.</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Incidents">
          {evidence.incidents.map((incident) => {
            const href = ownerHref(owner, `incidents/${String(incident.id)}`);
            return (
              <li key={incident.id} className="flex items-center gap-2 text-sm">
                {href === null ? (
                  <span className="truncate text-foreground">{incident.title}</span>
                ) : (
                  <Link href={href} className="truncate text-foreground hover:underline">
                    {incident.title}
                  </Link>
                )}
                <Badge variant="outline" className="ml-auto shrink-0 text-micro">
                  {incident.severity}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
      {note === null ? null : (
        <p className="text-xs text-muted-foreground">{note}</p>
      )}
    </section>
  );
}

interface EvidenceApprovalStateProps extends EvidenceSectionProps {
  qaState: string | null;
}

export function EvidenceApprovalState({ evidence, owner, qaState }: EvidenceApprovalStateProps) {
  const href = ownerHref(owner, "approvals");
  return (
    <section aria-labelledby="evidence-approval-heading" className="flex flex-col gap-2">
      <h3 id="evidence-approval-heading" className="text-sm font-semibold text-foreground">
        Project release approval
      </h3>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Product release QA state:
        {qaState ? <QaStateBadge qaState={qaState} /> : <span>Not set</span>}
      </p>
      {evidence.restricted ? (
        <p className="text-sm text-muted-foreground">
          Hidden — you do not have access to the owning project.
        </p>
      ) : evidence.approvalState === null ? (
        <p className="text-sm text-muted-foreground">No approval requested on the project release</p>
      ) : href === null ? (
        <p className="text-sm text-foreground">{evidence.approvalState}</p>
      ) : (
        <Link href={href} className="text-sm text-foreground hover:underline">
          {evidence.approvalState}
        </Link>
      )}
    </section>
  );
}
