"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReviewCycles } from "@/hooks/api/hr";
import { useCalibrationEntries, useUpsertCalibrationEntry } from "@/hooks/api/hr/calibration";
import { LoadingButton } from "@/components/ui/loading-button";

export function CalibrationTab() {
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const [editingEntry, setEditingEntry] = useState<Record<string, { preRating: string; postRating: string; note: string }>>({});

  const { data: cycles = [] } = useReviewCycles();
  const { data: entries = [], isLoading } = useCalibrationEntries(selectedCycleId);
  const upsert = useUpsertCalibrationEntry(selectedCycleId);

  function handleChange(employeeId: string, field: "preRating" | "postRating" | "note", value: string) {
    setEditingEntry((prev) => {
      const current = prev[employeeId] ?? { preRating: "", postRating: "", note: "" };
      return { ...prev, [employeeId]: { ...current, [field]: value } };
    });
  }

  async function handleSave(employeeId: string) {
    const data = editingEntry[employeeId] ?? {};
    try {
      await upsert.mutateAsync({ employeeId, ...data });
      toast.success("Calibration saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
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
      </div>

      {selectedCycleId > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Calibration Grid</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No entries yet for this cycle.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Employee</th>
                    <th className="text-left py-2 font-medium">Pre-Rating</th>
                    <th className="text-left py-2 font-medium">Post-Rating</th>
                    <th className="text-left py-2 font-medium">Note</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const editing = editingEntry[entry.employeeId] ?? {
                      preRating: entry.preRating ?? "",
                      postRating: entry.postRating ?? "",
                      note: entry.note ?? "",
                    };
                    return (
                      <tr key={entry.employeeId} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs text-muted-foreground">{entry.employeeId.slice(0, 8)}…</td>
                        <td className="py-2">
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            step="0.5"
                            className="w-20 h-7 text-sm"
                            value={editing.preRating}
                            onChange={(e) => handleChange(entry.employeeId, "preRating", e.target.value)}
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            step="0.5"
                            className="w-20 h-7 text-sm"
                            value={editing.postRating}
                            onChange={(e) => handleChange(entry.employeeId, "postRating", e.target.value)}
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            className="h-7 text-sm"
                            value={editing.note}
                            onChange={(e) => handleChange(entry.employeeId, "note", e.target.value)}
                          />
                        </td>
                        <td className="py-2">
                          <LoadingButton
                            size="sm"
                            variant="outline"
                            isPending={upsert.isPending}
                            onClick={() => handleSave(entry.employeeId)}
                          >
                            Save
                          </LoadingButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {selectedCycleId === 0 && (
        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
          Select a review cycle to view calibration entries
        </div>
      )}
    </div>
  );
}
