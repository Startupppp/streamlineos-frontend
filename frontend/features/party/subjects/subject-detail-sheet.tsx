"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordDetail, type RecordValue } from "@/features/renderer";
import { subjectLayout, subjectRecord, type RenderableSubject } from "@/lib/renderer/subject-layout";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useSubject, useUnlinkParty } from "@/hooks/api/party/subjects";
import { getErrorMessage } from "@/lib/get-error-message";
import { LinkPartyControl } from "./link-party-control";
import { ActivityTimeline } from "@/features/crm/timeline/activity-timeline";
import type { SubjectType } from "@/types/party/subjects";

export interface SubjectDetailSheetProps {
  subjectId: string | null;
  type: SubjectType;
  onOpenChange: (open: boolean) => void;
  /** Absent when the viewer cannot manage subjects, so no control is rendered. */
  onEdit?: (subject: RenderableSubject) => void;
  canManage?: boolean;
}

/**
 * One subject, rendered from its tenant's own declaration.
 *
 * The linked parties are the other half of the ticket: the link table is read
 * from the subject's side here and from the party's side on the parties
 * surface, from the same rows. Each party is a link out, so a person following
 * a property to its owner lands on the owner, not on a dead label.
 */
export function SubjectDetailSheet({
  subjectId,
  type,
  onOpenChange,
  onEdit,
  canManage = false,
}: SubjectDetailSheetProps) {
  const { data, isLoading, isError, refetch } = useSubject(subjectId);
  const unlinkParty = useUnlinkParty();
  const layout = subjectLayout(type);

  function handleRetry() {
    void refetch();
  }

  function handleEdit() {
    if (data && onEdit) onEdit(data);
  }

  function handleUnlink(subjectPartyLinkId: string) {
    if (!subjectId) return;
    unlinkParty.mutate(
      { subjectPartyLinkId, subjectId },
      {
        onSuccess: () => toast.success("Party unlinked"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Sheet open={!!subjectId} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle>{data?.title ?? type.singular}</SheetTitle>
            <SheetDescription>
              {data?.reference ? `Reference ${data.reference}` : type.singular}
            </SheetDescription>
          </SheetHeader>
          {data && onEdit ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={handleEdit}>
              Edit {type.singular.toLowerCase()}
            </Button>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isError ? (
            <ErrorState
              className="flex-1"
              title={`Couldn't load this ${type.singular.toLowerCase()}`}
              onRetry={handleRetry}
            />
          ) : data ? (
            <>
              <RecordDetail layout={layout} record={subjectRecord(data) as RecordValue} />

              <section className="flex flex-col gap-2">
                <h2 className="text-label font-medium text-muted-foreground">
                  Linked parties
                </h2>
                {data.parties.length === 0 ? (
                  <EmptyState
                    className="min-h-[8rem] border-0 bg-transparent"
                    title="No parties linked"
                    description={`Link the people and organisations involved in this ${type.singular.toLowerCase()}.`}
                  />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {data.parties.map((link) => (
                      <li
                        key={link.subjectPartyLinkId}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <Link
                          href={`/parties?partyId=${link.partyId}`}
                          className="min-w-0 truncate text-sm font-medium text-status-info-ink hover:underline"
                        >
                          {link.name}
                        </Link>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro">
                            {link.relationship}
                          </Badge>
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7"
                              aria-label={`Unlink ${link.name}`}
                              onClick={() => handleUnlink(link.subjectPartyLinkId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {canManage && data ? (
                  <LinkPartyControl subjectId={data.subjectId} subjectSingular={type.singular} />
                ) : null}
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="text-label font-medium text-muted-foreground">Timeline</h2>
                <ActivityTimeline
                  anchor={data ? { kind: "subject", subjectId: data.subjectId } : null}
                  emptyDescription={`Calls, emails, meetings, notes and tasks about this ${type.singular.toLowerCase()} will appear here as they happen.`}
                />
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
