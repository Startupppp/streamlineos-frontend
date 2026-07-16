"use client";

import { useState, memo, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHrHolidaysForYear, useAddLegacyHoliday, useDeleteLegacyHoliday, useUpdateLegacyHoliday } from "@/hooks/api/hr";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Loader2, Pencil, PartyPopper } from "lucide-react";
import { PlusIcon, Trash2Icon, CheckIcon, XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface EditState {
  id: number;
  name: string;
  date: string;
  message: string;
}

interface PendingHoliday {
  name: string;
  date: string;
  message: string;
}

export const ManageHolidaysCard = memo(function ManageHolidaysCard() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [name, setName] = useState("");
  const [date, setDate] = useState(format(today, "yyyy-MM-dd"));
  const [message, setMessage] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [pendingHoliday, setPendingHoliday] = useState<PendingHoliday | null>(null);

  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const { data: holidaysList, isLoading } = useHrHolidaysForYear(selectedYear);

  const addMutation = useAddLegacyHoliday();
  const deleteMutation = useDeleteLegacyHoliday();
  const updateMutation = useUpdateLegacyHoliday();

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value), []);
  const handleYearChange = useCallback((v: string) => setSelectedYear(Number(v)), []);
  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditState((prev) => prev ? { ...prev, name: e.target.value } : prev), []);
  const handleEditDateChange = useCallback((val: string) => setEditState((prev) => prev ? { ...prev, date: val } : prev), []);
  const handleEditMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditState((prev) => prev ? { ...prev, message: e.target.value } : prev), []);
  const handlePendingOpenChange = useCallback((open: boolean) => { if (!open) setPendingHoliday(null); }, []);
  const handleDeleteConfirmOpenChange = useCallback((open: boolean) => { if (!open) setDeleteConfirmId(null); }, []);
  const handleDeleteRequest = useCallback((holidayId: number) => {
    setDeleteConfirmId(holidayId);
  }, []);
  const handleEditStart = useCallback((h: { id: number; name: string; date: string; message: string | null }) => {
    setEditState({ id: h.id, name: h.name, date: h.date, message: h.message ?? "" });
  }, []);
  const makeEditStartHandler = useCallback(
    (h: { id: number; name: string; date: string; message: string | null }) => {
      function handleClick() { handleEditStart(h); }
      return handleClick;
    },
    [handleEditStart]
  );
  const makeDeleteHandler = useCallback(
    (id: number) => {
      function handleClick() { handleDeleteRequest(id); }
      return handleClick;
    },
    [handleDeleteRequest]
  );

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
      setPendingHoliday({ name: trimmedName, date, message: message.trim() });
    },
    [name, date, message, holidaysList]
  );

  const handleAddConfirm = useCallback(() => {
    if (!pendingHoliday) return;
    addMutation.mutate(
      {
        name: pendingHoliday.name,
        date: pendingHoliday.date,
        message: pendingHoliday.message || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Holiday added");
          setName("");
          setDate(format(new Date(), "yyyy-MM-dd"));
          setMessage("");
          setPendingHoliday(null);
        },
        onError: (e) => {
          toast.error(e.message);
          setPendingHoliday(null);
        },
      }
    );
  }, [pendingHoliday, addMutation]);

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
    <Card className="rounded-2xl border border-border border-l-4 border-l-amber-500 bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <PartyPopper className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            Company Holidays
          </CardTitle>
          <Select value={String(selectedYear)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="holiday-name" className="text-xs font-semibold text-foreground/80">Name</Label>
              <Input
                id="holiday-name"
                placeholder="e.g. Republic Day"
                value={name}
                onChange={handleNameChange}
                className="bg-background h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date" className="text-xs font-semibold text-foreground/80">Date</Label>
              <DatePicker id="holiday-date" value={date} onChange={setDate} placeholder="Select date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="holiday-message" className="text-xs font-semibold text-foreground/80">Message (optional)</Label>
            <Input
              id="holiday-message"
              placeholder="Optional note for notification"
              value={message}
              onChange={handleMessageChange}
              className="bg-background h-8 text-sm"
            />
          </div>
          <Button type="submit" disabled={addMutation.isPending} size="sm" className="gap-1.5 duration-200">
            {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Add Holiday
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Holidays for {selectedYear}</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : holidaysList && holidaysList.length > 0 ? (
            <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {holidaysList.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start justify-between gap-2 py-2.5 px-3 first:pt-2 last:pb-2 hover:bg-muted/30 transition-colors duration-200"
                >
                  {editState?.id === h.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          value={editState.name}
                          onChange={handleEditNameChange}
                          placeholder="Holiday name"
                          className="text-sm"
                        />
                        <DatePicker
                          value={editState.date}
                          onChange={handleEditDateChange}
                          placeholder="Select date"
                        />
                      </div>
                      <Input
                        value={editState.message}
                        onChange={handleEditMessageChange}
                        placeholder="Message (optional)"
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="text-xs px-3 gap-1 duration-200"
                          onClick={handleEditSave}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs px-3 gap-1 duration-200"
                          onClick={handleEditCancel}
                          disabled={updateMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" aria-hidden />
                        <div className="min-w-0">
                          <span className="font-medium text-foreground text-sm">{h.name}</span>
                          <span className="text-muted-foreground text-xs ml-2">{h.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-7 text-muted-foreground hover:text-foreground duration-200"
                          onClick={makeEditStartHandler(h)}
                          disabled={deleteMutation.isPending || updateMutation.isPending}
                          aria-label={`Edit ${h.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-7 text-muted-foreground hover:text-destructive duration-200"
                          onClick={makeDeleteHandler(h.id)}
                          disabled={deleteMutation.isPending || updateMutation.isPending}
                          aria-label={`Remove ${h.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border gap-3">
              <div className="w-8 rounded-full bg-muted flex items-center justify-center">
                <PartyPopper className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No holidays added yet. Add one above.</p>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Employees see holidays on the calendar and get an in-app notification one day before.
        </p>
      </CardContent>

      <ConfirmDialog
        open={pendingHoliday !== null}
        onOpenChange={handlePendingOpenChange}
        title="Add Holiday"
        description={pendingHoliday ? `Add "${pendingHoliday.name}" on ${pendingHoliday.date} as a company holiday?` : ""}
        confirmLabel="Add"
        onConfirm={handleAddConfirm}
        isPending={addMutation.isPending}
      />

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={handleDeleteConfirmOpenChange}
        title="Remove Holiday"
        description="Are you sure you want to remove this holiday? This action cannot be undone."
        confirmLabel="Remove"
        destructive
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </Card>
  );
});
