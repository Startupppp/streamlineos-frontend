"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordDetail, type RecordValue } from "@/features/renderer";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import { useParty } from "@/hooks/api/party/parties";
import { usePartySubjects } from "@/hooks/api/party/subjects";
import { ActivityTimeline } from "@/features/crm/timeline/activity-timeline";

export interface PartyDetailSheetProps {
  partyId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Opens the subject on the other end of a link. */
  onOpenSubject?: (subjectId: string) => void;
}

/**
 * One party, rendered from the same description that produced its list.
 *
 * The linked subjects are the reverse of the subject surface's linked parties —
 * the same `subject_party_links` rows, read from this end. Following a link in
 * either direction lands on the record, which is what makes the relationship
 * navigable rather than merely stored.
 */
export function PartyDetailSheet({ partyId, onOpenChange, onOpenSubject }: PartyDetailSheetProps) {
  const party = useParty(partyId);
  const subjects = usePartySubjects(partyId);

  const links = subjects.data?.data ?? [];

  function handleRetry() {
    void party.refetch();
  }

  return (
    <Sheet open={!!partyId} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle>{party.data?.name ?? "Party"}</SheetTitle>
            <SheetDescription>
              {party.data?.legalName ?? "Customer, vendor or partner"}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-4">
          {party.isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : party.isError ? (
            <ErrorState className="flex-1" title="Couldn't load this party" onRetry={handleRetry} />
          ) : party.data ? (
            <>
              <RecordDetail
                layout={PARTY_LAYOUT}
                record={party.data as unknown as RecordValue}
              />

              <section className="flex flex-col gap-2">
                <h2 className="text-label font-medium text-muted-foreground">Linked records</h2>
                {subjects.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : links.length === 0 ? (
                  <EmptyState
                    className="min-h-[8rem] border-0 bg-transparent"
                    title="Nothing linked"
                    description="Properties, candidates, shipments and anything else this organisation transacts will appear here once linked."
                  />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {links.map((link) => (
                      <li
                        key={link.subjectPartyLinkId}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        {onOpenSubject ? (
                          <button
                            type="button"
                            className="min-w-0 truncate text-left text-sm font-medium text-status-info-ink hover:underline"
                            onClick={() => onOpenSubject(link.subjectId)}
                          >
                            {link.title}
                          </button>
                        ) : (
                          <span className="min-w-0 truncate text-sm font-medium">{link.title}</span>
                        )}
                        <Badge variant="outline" className="h-5 shrink-0 px-2 py-0.5 text-micro">
                          {link.relationship}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="text-label font-medium text-muted-foreground">Timeline</h2>
                <ActivityTimeline
                  anchor={partyId ? { kind: "party", partyId } : null}
                  emptyDescription="Calls, emails, meetings, notes and tasks with this party will appear here as they happen."
                />
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
