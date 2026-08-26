"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { RecordDetail } from "@/features/renderer";
import { useIssue } from "@/hooks/api/crm/issues";
import { formatRelativeTime, formatShortDate } from "@/lib/date-utils";
import {
  ISSUE_STAGES,
  STAGE_LABELS,
  type IssueRecord,
  type IssueTransition,
} from "@/types/crm/issues";
import { IssueStageControl } from "./issue-stage-control";

export interface IssueDetailSheetProps {
  issueRecordId: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (record: IssueRecord) => void;
  canManage: boolean;
  canEscalate: boolean;
}

/**
 * A stage's plain-language label, or the raw value.
 *
 * Narrowed rather than asserted: `stage` arrives as a string in a record shaped
 * by the layout, and a stage the client does not yet know about should read as
 * itself rather than as `undefined`.
 */
function stageLabel(stage: string): string {
  const known = ISSUE_STAGES.find((candidate) => candidate === stage);
  return known ? STAGE_LABELS[known] : stage;
}

function TransitionRow({ move }: { move: IssueTransition }) {
  const actor = move.actorName ?? move.actorLabel ?? "the system";

  return (
    <li className="flex min-w-0 flex-col gap-gap-inline border-b border-border/60 py-2 last:border-b-0">
      <p className="text-dense">
        <span className="font-medium">
          {move.fromStage ? `${STAGE_LABELS[move.fromStage]} → ` : ""}
          {STAGE_LABELS[move.toStage]}
        </span>
        <span className="text-muted-foreground"> · {actor}</span>
      </p>
      {move.reason ? <p className="text-dense text-muted-foreground">{move.reason}</p> : null}
      {/*
        Relative for reading, exact on hover. An accountability ledger has to be
        able to answer "when exactly", and "43 days ago" is arithmetic the reader
        would have to undo.
      */}
      <p
        className="text-micro tabular-nums text-muted-foreground"
        title={new Date(move.occurredAt).toISOString()}
      >
        {formatRelativeTime(move.occurredAt)} · {formatShortDate(move.occurredAt)}
      </p>
    </li>
  );
}

/**
 * One record, rendered from the layout the server sent with it.
 *
 * The record's own fields are the renderer's job entirely — there is no detail
 * card here, and adding a field to the description puts it on this sheet with no
 * change to this file. What is written by hand is the accountability ledger,
 * which is not a record surface: it is an ordered account of who moved this and
 * why, and it is the reason these three record types exist rather than being
 * three lists of rows.
 */
export function IssueDetailSheet({
  issueRecordId,
  onOpenChange,
  onEdit,
  canManage,
  canEscalate,
}: IssueDetailSheetProps) {
  const { data, isLoading, isError, refetch, access } = useIssue(issueRecordId);

  function handleRetry() {
    void refetch();
  }

  function handleEdit() {
    if (data && onEdit) onEdit(data.record);
  }

  const singular = data?.layout.singular ?? "Record";
  const stage = typeof data?.record.stage === "string" ? data.record.stage : "";

  return (
    <Sheet open={!!issueRecordId} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle>{singular}</SheetTitle>
            <SheetDescription>
              {stage ? stageLabel(stage) : singular}
            </SheetDescription>
          </SheetHeader>
          {data && onEdit && canManage ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={handleEdit}>
              Edit {singular.toLowerCase()}
            </Button>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-4">
          {access.denied ? (
            <NoPermissionState permission={access.permission} />
          ) : isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isError ? (
            <ErrorState
              className="flex-1"
              title={`Couldn't load this ${singular.toLowerCase()}`}
              onRetry={handleRetry}
            />
          ) : data ? (
            <>
              <RecordDetail layout={data.layout} record={data.record} />

              <IssueStageControl
                issueRecordId={data.record.issueRecordId}
                currentStage={stage}
                canManage={canManage}
                canEscalate={canEscalate}
              />

              <section className="flex flex-col gap-2">
                <h2 className="text-label font-medium text-muted-foreground">History</h2>
                {data.transitions.length === 0 ? (
                  /*
                    A record always has at least the move that opened it, so an
                    empty ledger means the history could not be read rather than
                    that nothing happened — say so instead of showing a blank.
                  */
                  <p className="text-dense text-muted-foreground">
                    No moves recorded yet.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {data.transitions.map((move) => (
                      <TransitionRow key={move.issueStageTransitionId} move={move} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
