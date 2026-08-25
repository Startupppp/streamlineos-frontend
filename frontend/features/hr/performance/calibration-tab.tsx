"use client";

import { useCallback, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReviewCycles } from "@/hooks/api/hr";
import { useCalibrationEntries, useUpsertCalibrationEntry, type CalibrationEntry } from "@/hooks/api/hr/calibration";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyChartIllustration } from "@/components/illustrations";
import { calibrationEntrySchema } from "./calibration-schema";
import { zodFieldErrors } from "./zod-field-errors";

export function CalibrationTab() {
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const [editingEntry, setEditingEntry] = useState<Record<string, { preRating: string; postRating: string; note: string }>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, Record<string, string>>>({});

  const { data: cycles = [] } = useReviewCycles();
  const { data: entries = [], isLoading } = useCalibrationEntries(selectedCycleId);
  const { data: membersData } = useOrgMembers(1, 200);
  const upsert = useUpsertCalibrationEntry(selectedCycleId);

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

  function handleChange(employeeId: string, field: "preRating" | "postRating" | "note", value: string) {
    setEditingEntry((prev) => {
      const current = prev[employeeId] ?? { preRating: "", postRating: "", note: "" };
      return { ...prev, [employeeId]: { ...current, [field]: value } };
    });
    setRowErrors((prev) => {
      const current = prev[employeeId];
      if (!current) return prev;
      const nextRow = { ...current };
      delete nextRow[field];
      return { ...prev, [employeeId]: nextRow };
    });
  }

  const handleSave = useCallback(async (employeeId: string) => {
    const row = entries.find((e) => e.employeeId === employeeId);
    const data = editingEntry[employeeId] ?? {
      preRating: row?.preRating ?? "",
      postRating: row?.postRating ?? "",
      note: row?.note ?? "",
    };
    const parsed = calibrationEntrySchema.safeParse(data);
    if (!parsed.success) {
      setRowErrors((prev) => ({ ...prev, [employeeId]: zodFieldErrors(parsed.error) }));
      return;
    }
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[employeeId];
      return next;
    });
    try {
      await upsert.mutateAsync({ employeeId, ...parsed.data });
      toast.success("Calibration saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [entries, editingEntry, upsert]);

  const columns: DataTableColumn<CalibrationEntry>[] = useMemo(() => [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <span className="text-sm font-medium">{resolveMemberName(row.employeeId)}</span>
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
        const error = rowErrors[row.employeeId]?.preRating;
        return (
          <div className="space-y-1">
            <Input
              type="number"
              min="1"
              max="5"
              step="0.5"
              className="w-20 text-sm"
              value={editing.preRating}
              onChange={(e) => handleChange(row.employeeId, "preRating", e.target.value)}
            />
            {error && <p className="text-micro text-destructive max-w-[8rem]">{error}</p>}
          </div>
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
        const error = rowErrors[row.employeeId]?.postRating;
        return (
          <div className="space-y-1">
            <Input
              type="number"
              min="1"
              max="5"
              step="0.5"
              className="w-20 text-sm"
              value={editing.postRating}
              onChange={(e) => handleChange(row.employeeId, "postRating", e.target.value)}
            />
            {error && <p className="text-micro text-destructive max-w-[8rem]">{error}</p>}
          </div>
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
        const error = rowErrors[row.employeeId]?.note;
        return (
          <div className="space-y-1">
            <Input
              className="text-sm"
              value={editing.note}
              onChange={(e) => handleChange(row.employeeId, "note", e.target.value)}
            />
            {error && <p className="text-micro text-destructive">{error}</p>}
          </div>
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
  ], [editingEntry, rowErrors, resolveMemberName, upsert.isPending, handleSave]);

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
                <EmptyState
                  illustration={<EmptyChartIllustration className="h-full w-full" />}
                  title="No calibration entries yet"
                  description="Entries will appear here once ratings are ready for this cycle."
                  compact
                />
              }
            />
          </CardContent>
        </Card>
      )}

      {selectedCycleId === 0 && (
        <EmptyState
          illustration={<EmptyChartIllustration className="h-full w-full" />}
          title="Select a review cycle"
          description="Choose a review cycle above to view and edit calibration entries."
        />
      )}
    </div>
  );
}
