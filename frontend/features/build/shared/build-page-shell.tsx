"use client";

import * as React from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterGroup } from "./filter-group";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import type { FilterEnvelopeV1 } from "@/lib/filter-envelope/filter-envelope-v1";
import { buildEmptyEnvelope } from "@/lib/filter-envelope/filter-envelope-v1";

interface BuildPageShellProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
  filterEnvelope?: FilterEnvelopeV1;
  onFilterEnvelopeChange?: (next: FilterEnvelopeV1) => void;
  onClearFilters?: () => void;
  fieldLabels?: Record<string, string>;
  children: React.ReactNode;
  className?: string;
  resolution?: PageStateResolution;
  dataUpdatedAt?: number;
}

export function BuildPageShell({
  title,
  actions,
  filterBar,
  filterEnvelope,
  onFilterEnvelopeChange,
  onClearFilters,
  fieldLabels,
  children,
  className,
  resolution,
  dataUpdatedAt,
}: BuildPageShellProps) {
  const handleChange = React.useCallback(
    (next: FilterEnvelopeV1) => onFilterEnvelopeChange?.(next),
    [onFilterEnvelopeChange],
  );

  const activeFilterBar =
    filterEnvelope && filterEnvelope.filters.length > 0 ? (
      <FilterGroup
        envelope={filterEnvelope}
        onChange={handleChange}
        onClear={
          onClearFilters ??
          (() => onFilterEnvelopeChange?.(buildEmptyEnvelope(filterEnvelope.logic)))
        }
        fieldLabels={fieldLabels}
      />
    ) : (filterBar ?? null);

  return (
    <PageShell
      title={title}
      actions={actions}
      filterBar={activeFilterBar ?? undefined}
      className={className}
      resolution={resolution}
      dataUpdatedAt={dataUpdatedAt}
    >
      {children}
    </PageShell>
  );
}
