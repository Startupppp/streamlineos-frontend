"use client";

import { useCallback, useState } from "react";
import type { Risk, RiskStatus, UpdateRiskInput } from "@/types/projects";

type BulkMutateFn = (input: UpdateRiskInput & { riskId: number }) => void;

export function useRisksBulk(filteredRisks: Risk[], mutate: BulkMutateFn) {
  const [selectedIds, setSelectedIds] = useState(new Set<string | number>());

  const handleBulkStatus = useCallback(
    (status: RiskStatus) => {
      selectedIds.forEach((id) => {
        const risk = filteredRisks.find((r) => r.id === Number(id));
        if (risk) mutate({ riskId: risk.id, status });
      });
      setSelectedIds(new Set());
    },
    [selectedIds, filteredRisks, mutate],
  );

  const handleBulkOwner = useCallback(
    (ownerId: string) => {
      selectedIds.forEach((id) => {
        const risk = filteredRisks.find((r) => r.id === Number(id));
        if (risk) mutate({ riskId: risk.id, ownerId });
      });
      setSelectedIds(new Set());
    },
    [selectedIds, filteredRisks, mutate],
  );

  const handleBulkClear = useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    setSelectedIds,
    handleBulkStatus,
    handleBulkOwner,
    handleBulkClear,
  };
}
