"use client";

import { useState, memo, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrHolidaysForYear, useAddHoliday, useDeleteHoliday, useUpdateHoliday } from "@/lib/api/hooks/hr";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Check, X, PartyPopper } from "lucide-react";

interface EditState {
  id: number;
  name: string;
  date: string;
  message: string;
}

export const ManageHolidaysCard = memo(function ManageHolidaysCard() {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [message, setMessage] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const { data: holidaysList, isLoading } = useHrHolidaysForYear(currentYear);

  const addMutation = useAddHoliday();
  const deleteMutation = useDeleteHoliday();
  const updateMutation = useUpdateHoliday();

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) { toast.error("Holiday name is required"); return; }
      if (trimmedName.length < 2) { toast.error("Holiday name must be at least 2 characters"); return; }
      if (trimmedName.length > 100) { toast.error("Holiday name must be at most 100 characters"); return; }
      if (!/[a-zA-Z]/.test(trimmedName)) { toast.error("Holiday name must contain at least one letter"); return; }
      if (/\s{2,}/.test(trimmedName)) { toast.error("Holiday name cannot have consecutive spaces"); return; }
      if (!date) { toast.error("Holiday date is required"); return; }
      const duplicate = (holidaysList ?? []).find(
        (h) => h.date === date || h.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) { toast.error("A holiday with this name or date already exists"); return; }
      addMutation.mutate(
        {
          name: trimmedName,
          date: date,
          message: message.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Holiday added");
            setName("");
            setDate(format(new Date(), "yyyy-MM-dd"));
            setMessage("");
          },
          onError: (e) => toast.error(e.message),
        }
      );
    },
    [name, date, message, addMutation, holidaysList]
  );

  const handleDeleteRequest = useCallback((holidayId: number) => {
    setDeleteConfirmId(holidayId);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirmId) return;
    deleteMutation.mutate(
      { holidayId: deleteConfirmId },
      {
        onSuccess: () => {
          toast.success("Holiday removed");
          setDeleteConfirmId(null);
        },
        onError: (e) => {
          toast.error(e.message);
          setDeleteConfirmId(null);
        },
      }
    );
  }, [deleteConfirmId, deleteMutation]);

  const handleEditStart = useCallback((h: { id: number; name: string; date: string; message: string | null }) => {
    setEditState({ id: h.id, name: h.name, date: h.date, message: h.message ?? "" });
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditState(null);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editState) return;
    const trimmedName = editState.name.trim();
    if (!trimmedName) { toast.error("Holiday name is required"); return; }
    if (trimmedName.length < 2) { toast.error("Holiday name must be at least 2 characters"); return; }
    if (trimmedName.length > 100) { toast.error("Holiday name must be at most 100 characters"); return; }
    if (!/[a-zA-Z]/.test(trimmedName)) { toast.error("Holiday name must contain at least one letter"); return; }
    if (/\s{2,}/.test(trimmedName)) { toast.error("Holiday name cannot have consecutive spaces"); return; }
    if (!editState.date) { toast.error("Holiday date is required"); return; }
    const duplicate = (holidaysList ?? []).find(
      (h) =>
        h.id !== editState.id &&
        (h.date === editState.date || h.name.trim().toLowerCase() === trimmedName.toLowerCase())
    );
    if (duplicate) { toast.error("A holiday with this name or date already exists"); return; }
    updateMutation.mutate(
      {
        holidayId: editState.id,
        name: trimmedName,
        date: editState.date,
        message: editState.message.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Holiday updated");
          setEditState(null);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  }, [editState, holidaysList, updateMutation]);

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <PartyPopper className="h-4 w-4 text-blue-600" />
          </div>
          Company Holidays
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Name</Label>
              <Input
                id="holiday-name"
                placeholder="e.g. Republic Day"
                value={name}
                onChange={handleNameChange}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Date</Label>
              <DatePicker id="holiday-date" value={date} onChange={setDate} placeholder="Select date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-message">Message (optional)</Label>
            <Input
              id="holiday-message"
              placeholder="Optional note for notification"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-background"
            />
          </div>
          <Button type="submit" disabled={addMutation.isPending} className="w-full sm:w-auto">
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Holiday
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Holidays for {currentYear}</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : holidaysList && holidaysList.length > 0 ? (
            <ul className="space-y-1.5 rounded-lg border border-border divide-y divide-border">
              {holidaysList.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-2 py-2.5 px-3 first:pt-2 last:pb-2"
                >
                  {editState?.id === h.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          value={editState.name}
                          onChange={(e) => setEditState((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                          placeholder="Holiday name"
                          className="h-8 text-sm"
                        />
                        <DatePicker
                          value={editState.date}
                          onChange={(val) => setEditState((prev) => prev ? { ...prev, date: val } : prev)}
                          placeholder="Select date"
                        />
                      </div>
                      <Input
                        value={editState.message}
                        onChange={(e) => setEditState((prev) => prev ? { ...prev, message: e.target.value } : prev)}
                        placeholder="Message (optional)"
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs px-3"
                          onClick={handleEditSave}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-3"
                          onClick={handleEditCancel}
                          disabled={updateMutation.isPending}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium text-foreground">{h.name}</span>
                        <span className="text-muted-foreground text-sm ml-2">{h.date}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleEditStart(h)}
                          disabled={deleteMutation.isPending || updateMutation.isPending}
                          aria-label={`Edit ${h.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteRequest(h.id)}
                          disabled={deleteMutation.isPending || updateMutation.isPending}
                          aria-label={`Remove ${h.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-dashed border-border">
              No holidays added yet. Add one above.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Employees see holidays on the calendar and get an in-app notification one day before.
        </p>
      </CardContent>

      <ConfirmActionDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Remove Holiday"
        description="Are you sure you want to remove this holiday? This action cannot be undone."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </Card>
  );
});
