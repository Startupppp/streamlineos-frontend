"use client";

import { useState, memo, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useHrHolidaysForYear, useAddHoliday, useDeleteHoliday } from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, PartyPopper } from "lucide-react";

interface HolidayRowProps {
  id: number;
  name: string;
  date: string;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

const HolidayRow = memo(function HolidayRow({ id, name, date, onDelete, isDeleting }: HolidayRowProps) {
  const handleDelete = useCallback(() => onDelete(id), [id, onDelete]);
  return (
    <li className="flex items-center justify-between gap-2 py-2.5 px-3 first:pt-2 last:pb-2">
      <div>
        <span className="font-medium text-foreground">{name}</span>
        <span className="text-muted-foreground text-sm ml-2">{date}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Remove ${name}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
});

export const ManageHolidaysCard = memo(function ManageHolidaysCard() {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [message, setMessage] = useState("");

  const { data: holidaysList, isLoading } = useHrHolidaysForYear(currentYear);

  const addMutation = useAddHoliday();
  const deleteMutation = useDeleteHoliday();

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
    [name, date, message, addMutation]
  );

  const handleDelete = useCallback(
    (holidayId: number) => {
      deleteMutation.mutate(
        { holidayId },
        {
          onSuccess: () => toast.success("Holiday removed"),
          onError: (e) => toast.error(e.message),
        }
      );
    },
    [deleteMutation]
  );

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
                  className="flex items-center justify-between gap-2 py-2.5 px-3 first:pt-2 last:pb-2"
                >
                  <div>
                    <span className="font-medium text-foreground">{h.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">{h.date}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(h.id)}
                    disabled={deleteMutation.isPending}
                    aria-label={`Remove ${h.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
    </Card>
  );
});
