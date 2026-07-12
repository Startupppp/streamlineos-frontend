"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReviewCycles } from "@/hooks/api/hr";
import { useCalibrationEntries, useUpsertCalibrationEntry, type CalibrationEntry } from "@/hooks/api/hr/calibration";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

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

  const columns: DataTableColumn<CalibrationEntry>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.employeeId.slice(0, 8)}…</span>
      ),
    },
    {
      key: "preRating",
      header: "Pre-Rating",
      cell: (row) => {
        const editing = editingEntry[row.employeeId] ?? {
          preRating: row.preRating ?? "",
          postRating: row.postRating ?? "",
          note: row.note ?? "",
        };
        return (
          <Input
            type="number"
            min="1"
            max="5"
            step="0.5"
            className="w-20 h-7 text-sm"
            value={editing.preRating}
            onChange={(e) => handleChange(row.employeeId, "preRating", e.target.value)}
          />
        );
      },
    },
    {
      key: "postRating",
      header: "Post-Rating",
      cell: (row) => {
        const editing = editingEntry[row.employeeId] ?? {
          preRating: row.preRating ?? "",
          postRating: row.postRating ?? "",
          note: row.note ?? "",
        };
        return (
          <Input
            type="number"
            min="1"
            max="5"
            step="0.5"
            className="w-20 h-7 text-sm"
            value={editing.postRating}
            onChange={(e) => handleChange(row.employeeId, "postRating", e.target.value)}
          />
        );
      },
    },
    {
      key: "note",
      header: "Note",
      cell: (row) => {
        const editing = editingEntry[row.employeeId] ?? {
          preRating: row.preRating ?? "",
          postRating: row.postRating ?? "",
          note: row.note ?? "",
        };
        return (
          <Input
            className="h-7 text-sm"
            value={editing.note}
            onChange={(e) => handleChange(row.employeeId, "note", e.target.value)}
          />
        );
      },
    },
    {
      key: "save",
      header: "",
      cell: (row) => (
        <LoadingButton
          size="sm"
          variant="outline"
          isPending={upsert.isPending}
          onClick={() => handleSave(row.employeeId)}
        >
          Save
        </LoadingButton>
      ),
    },
  ];

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
            <DataTable
              data={entries}
              columns={columns}
              getRowKey={(row) => row.employeeId}
              isLoading={isLoading}
              emptyState={
                <p className="text-sm text-muted-foreground py-4 text-center">No entries yet for this cycle.</p>
              }
            />
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
