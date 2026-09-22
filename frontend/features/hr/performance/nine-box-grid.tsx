"use client";

import { useCallback, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useReviewCycles } from "@/hooks/api/hr";
import { useNineBox, type NineBoxEntry } from "@/hooks/api/hr/calibration";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyLeaderboardIllustration } from "@/components/illustrations";
import { numericSelectChange } from "@/lib/numeric-field";

const GRID_LABELS: Record<string, { label: string; bg: string }> = {
  "3-3": { label: "Star", bg: "bg-status-info-surface border-status-info-rule" },
  "3-2": { label: "High Performer", bg: "bg-status-info-surface border-status-info-rule" },
  "3-1": { label: "Consistent Star", bg: "bg-status-info-surface border-status-info-rule" },
  "2-3": { label: "High Potential", bg: "bg-status-success-surface border-status-success-rule" },
  "2-2": { label: "Core Player", bg: "bg-muted border-border" },
  "2-1": { label: "Solid Contributor", bg: "bg-muted border-border" },
  "1-3": { label: "Enigma", bg: "bg-status-warning-surface border-status-warning-rule" },
  "1-2": { label: "Growth Employee", bg: "bg-status-warning-surface border-status-warning-rule" },
  "1-1": { label: "Under Performer", bg: "bg-status-danger-surface border-status-danger-rule" },
};

const BOX_ORDER = [
  ["3-1", "3-2", "3-3"],
  ["2-1", "2-2", "2-3"],
  ["1-1", "1-2", "1-3"],
];

export function NineBoxGrid() {
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const { data: cycles = [], isError: cyclesError, error: cyclesErrorData, refetch: refetchCycles } = useReviewCycles();
  const { data: entries = [], isError: nineBoxError, error: nineBoxErrorData, refetch: refetchNineBox } = useNineBox(selectedCycleId);
  const { data: membersData } = useOrgMembers(1, 200);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : userId;
    },
    [memberById],
  );

  const grouped = new Map<string, NineBoxEntry[]>();
  for (const entry of entries) {
    const cell = grouped.get(entry.box) ?? [];
    cell.push(entry);
    grouped.set(entry.box, cell);
  }

  if (cyclesError) {
    return (
      <ErrorState
        title="Couldn't load review cycles"
        description={getErrorMessage(cyclesErrorData)}
        onRetry={() => void refetchCycles()}
        className="flex-1"
      />
    );
  }

  if (selectedCycleId > 0 && nineBoxError) {
    return (
      <ErrorState
        title="Couldn't load 9-box data"
        description={getErrorMessage(nineBoxErrorData)}
        onRetry={() => void refetchNineBox()}
        className="flex-1"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={String(selectedCycleId)} onValueChange={numericSelectChange(setSelectedCycleId)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select review cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">X axis: Performance · Y axis: Potential</span>
      </div>

      {selectedCycleId > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {BOX_ORDER.flat().map((box) => {
            const cellEntries = grouped.get(box) ?? [];
            const meta = GRID_LABELS[box] ?? { label: box, bg: "bg-muted border-border" };
            return (
              <div key={box} className={`border rounded-lg p-3 min-h-24 ${meta.bg}`}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{meta.label}</p>
                <div className="flex flex-wrap gap-1">
                  {cellEntries.map((e) => (
                    <Badge key={e.employeeId} variant="secondary" className="text-xs bg-card border border-border text-foreground">
                      {resolveMemberName(e.employeeId)}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration className="h-full w-full" />}
          title="No 9-box data yet"
          description="Select a review cycle above to view the performance vs potential grid."
        />
      )}
    </div>
  );
}
