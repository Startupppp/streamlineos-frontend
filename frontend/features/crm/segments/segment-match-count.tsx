"use client";

import { useMemo } from "react";
import { useSegmentPreview } from "@/hooks/api/crm/segments";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { Skeleton } from "@/components/ui/skeleton";
import type { SegmentCriterionDraft } from "./segment-criteria";
import { toSegmentCriteria } from "./segment-criteria";


const DEBOUNCE_MS = 400;

interface SegmentMatchCountProps {
  source: string;
  rows: readonly SegmentCriterionDraft[];
}

export function SegmentMatchCount({ source, rows }: SegmentMatchCountProps) {
  const criteria = useMemo(() => toSegmentCriteria(rows), [rows]);
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
