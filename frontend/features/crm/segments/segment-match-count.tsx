"use client";

import { useMemo } from "react";
import { useSegmentPreview } from "@/hooks/api/crm/segments";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { Skeleton } from "@/components/ui/skeleton";
import type { SegmentCriterionDraft } from "./segment-criteria";
import { toSegmentCriteria } from "./segment-criteria";

/**
 * How many rows the criteria currently match, asked while they are being drawn.
 *
 * This is the control that makes a segment comprehensible. A saved set nobody
 * can size until after they have named it is a guess; a number that moves as
 * criteria are added is the difference between "lapsed enterprise accounts" and
 * "an empty list somebody will notice in three weeks".
 *
 * It is a query, not a mutation — the server stores nothing and re-asking the
 * same question is what a cache is for — and it is debounced, because the
 * criteria change on every keystroke in a value box and each change is a real
 * `COUNT` against the tenant's parties.
 *
 * Incomplete criteria ask nothing. `toSegmentCriteria` returns `null` for a row
 * with no field or an unparseable value, and a `null` here disables the query
 * rather than sending a tree the server would refuse — a half-typed filter is
 * not a question, and answering it with a 400 in the middle of the form would
 * read as the form being broken.
 */

const DEBOUNCE_MS = 400;

interface SegmentMatchCountProps {
  source: string;
  rows: readonly SegmentCriterionDraft[];
}

export function SegmentMatchCount({ source, rows }: SegmentMatchCountProps) {
  const criteria = useMemo(() => toSegmentCriteria(rows), [rows]);
  /**
   * Debounced on the built tree, not on the form rows. Two keystrokes that both
   * leave the criteria incomplete produce the same `null` and therefore no new
   * request, and a row added by clicking Add does not fire until it has a field.
   */
  const debounced = useDebouncedValue(criteria, DEBOUNCE_MS);

  const input = useMemo(
    () => (source === "" || debounced === null ? null : { source, criteria: debounced }),
    [source, debounced],
  );

  const { data, isFetching, isError, error, access } = useSegmentPreview(input);

  if (!access.allowed) return null;

  if (input === null)
    return (
      <p className="text-sm text-muted-foreground">
        Add a criterion to see how many records match.
      </p>
    );

  if (isError) return <p className="text-sm text-destructive">{getErrorMessage(error)}</p>;

  if (isFetching && data === undefined) return <Skeleton className="h-5 w-32" />;

  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-mono tabular-nums font-medium text-foreground">
        {data?.total ?? 0}
      </span>{" "}
      {data?.total === 1 ? "record matches" : "records match"} right now.
    </p>
  );
}
