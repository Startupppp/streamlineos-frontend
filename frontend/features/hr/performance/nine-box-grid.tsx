"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useReviewCycles } from "@/hooks/api/hr";
import { useNineBox, type NineBoxEntry } from "@/hooks/api/hr/calibration";

const GRID_LABELS: Record<string, { label: string; bg: string }> = {
  "3-3": { label: "Star", bg: "bg-blue-50 border-blue-200" },
  "3-2": { label: "High Performer", bg: "bg-blue-50 border-blue-100" },
  "3-1": { label: "Consistent Star", bg: "bg-sky-50 border-sky-200" },
  "2-3": { label: "High Potential", bg: "bg-emerald-50 border-emerald-200" },
  "2-2": { label: "Core Player", bg: "bg-slate-50 border-slate-200" },
  "2-1": { label: "Solid Contributor", bg: "bg-slate-50 border-slate-100" },
  "1-3": { label: "Enigma", bg: "bg-amber-50 border-amber-200" },
  "1-2": { label: "Growth Employee", bg: "bg-orange-50 border-orange-100" },
  "1-1": { label: "Under Performer", bg: "bg-red-50 border-red-200" },
};

const BOX_ORDER = [
  ["3-1", "3-2", "3-3"],
  ["2-1", "2-2", "2-3"],
  ["1-1", "1-2", "1-3"],
];

export function NineBoxGrid() {
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const { data: cycles = [] } = useReviewCycles();
  const { data: entries = [] } = useNineBox(selectedCycleId);

  const grouped = new Map<string, NineBoxEntry[]>();
  for (const entry of entries) {
    const cell = grouped.get(entry.box) ?? [];
    cell.push(entry);
    grouped.set(entry.box, cell);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={String(selectedCycleId)} onValueChange={(v) => setSelectedCycleId(Number(v))}>
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
            const meta = GRID_LABELS[box] ?? { label: box, bg: "bg-slate-50 border-slate-200" };
            return (
              <div key={box} className={`border rounded-lg p-3 min-h-24 ${meta.bg}`}>
                <p className="text-xs font-medium text-slate-600 mb-2">{meta.label}</p>
                <div className="flex flex-wrap gap-1">
                  {cellEntries.map((e) => (
                    <Badge key={e.employeeId} variant="secondary" className="text-xs bg-white border border-blue-200 text-blue-700">
                      {e.employeeId.slice(0, 8)}…
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
          Select a review cycle to view the 9-box grid
        </div>
      )}
    </div>
  );
}
