"use client";

import { useState } from "react";
import { addDays, startOfDay } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCan } from "@/hooks/api/access";
import {
  useCalendarSavedViews,
  useCreateCalendarSavedView,
  useDeleteCalendarSavedView,
  useUpdateCalendarSavedView,
} from "@/hooks/api/calendar-saved-views";
import type {
  CalendarSavedView,
  CalendarSavedViewDefinition,
} from "@/hooks/api/calendar-saved-view-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { calendarUrl } from "./calendar-url-state";

const formSchema = z.object({
  name: z.string().trim().min(1).max(100),
  scope: z.enum(["personal", "team"]),
  dateKind: z.enum([
    "today",
    "next-seven-days",
    "this-week",
    "this-month",
    "custom",
  ]),
});

type FormValues = z.infer<typeof formSchema>;

export function CalendarSavedViewControls({
  selectedId,
  currentDate,
}: {
  selectedId: string | null;
  currentDate: Date;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canWrite = useCan("calendar:write");
  const canManageTeam = useCan("calendar:admin:manage");
  const query = useCalendarSavedViews();
  const create = useCreateCalendarSavedView();
  const update = useUpdateCalendarSavedView();
  const remove = useDeleteCalendarSavedView();
  const views =
    query.data?.pages
      .flatMap((page) => page.items)
      .filter((view) => view.definition.mode === "my-day") ?? [];
  const selected = views.find((view) => view.id === selectedId);
  const [dialogMode, setDialogMode] = useState<"create" | "rename" | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", scope: "personal", dateKind: "today" },
  });

  const selectView = (id: string | null) => {
    router.push(
      calendarUrl(new URLSearchParams(searchParams.toString()), { filter: id }),
    );
  };

  const openCreate = () => {
    form.reset({
      name: "",
      scope: "personal",
      dateKind: selected?.definition.dateLogic.kind ?? "today",
    });
    setDialogMode("create");
  };

  const openRename = () => {
    if (!selected) return;
    form.reset({
      name: selected.name,
      scope: selected.scope,
      dateKind: selected.definition.dateLogic.kind,
    });
    setDialogMode("rename");
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      if (dialogMode === "rename" && selected) {
        await update.mutateAsync({
          id: selected.id,
          version: selected.version,
          name: values.name,
        });
      } else {
        const start = startOfDay(currentDate);
        const dateLogic: CalendarSavedViewDefinition["dateLogic"] =
          values.dateKind === "custom"
            ? {
                kind: "custom",
                start: start.toISOString(),
                end: addDays(start, 1).toISOString(),
              }
            : { kind: values.dateKind };
        const definition: CalendarSavedViewDefinition = {
          ...(selected?.definition ?? {}),
          dateLogic,
          mode: "my-day",
        };
        const created = await create.mutateAsync({
          name: values.name,
          scope: values.scope,
          definition,
        });
        selectView(created.id);
      }
      setDialogMode(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  const confirmDelete = async () => {
    if (!selected) return;
    try {
      await remove.mutateAsync({ id: selected.id, version: selected.version });
      setDeleteOpen(false);
      selectView(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      <Select
        value={selectedId ?? "none"}
        onValueChange={(value) => selectView(value === "none" ? null : value)}
      >
        <SelectTrigger
          aria-label="Saved calendar view"
          className="h-9 min-w-40 max-w-64 text-xs"
        >
          <SelectValue placeholder="Saved views" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">My Day</SelectItem>
          {views.map((view: CalendarSavedView) => (
            <SelectItem key={view.id} value={view.id}>
              {view.name}
              {view.scope === "team" ? " · Team" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {query.hasNextPage ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={query.isFetchingNextPage}
          onClick={() => {
            void query.fetchNextPage();
          }}
        >
          More views
        </Button>
      ) : null}
      {canWrite ? (
        <Button type="button" size="sm" variant="outline" onClick={openCreate}>
          Save view
        </Button>
      ) : null}
      {canWrite &&
      selected &&
      (selected.scope === "personal" || canManageTeam) ? (
        <Button type="button" size="sm" variant="ghost" onClick={openRename}>
          Rename
        </Button>
      ) : null}
      {canWrite &&
      selected &&
      (selected.scope === "personal" || canManageTeam) ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setDeleteOpen(true)}
        >
          Remove
        </Button>
      ) : null}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) setDialogMode(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "rename" ? "Rename view" : "Save My Day view"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="calendar-view-name">Name</Label>
              <Input
                id="calendar-view-name"
                {...form.register("name")}
                maxLength={100}
              />
              {form.formState.errors.name ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            {dialogMode === "create" ? (
              <div className="space-y-1.5">
                <Label>Date range</Label>
                <Select
                  value={form.watch("dateKind")}
                  onValueChange={(value) =>
                    form.setValue("dateKind", value as FormValues["dateKind"])
                  }
                >
                  <SelectTrigger aria-label="Saved view date range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="next-seven-days">
                      Next seven days
                    </SelectItem>
                    <SelectItem value="this-week">This week</SelectItem>
                    <SelectItem value="this-month">This month</SelectItem>
                    <SelectItem value="custom">Selected day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {dialogMode === "create" && canManageTeam ? (
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select
                  value={form.watch("scope")}
                  onValueChange={(value) =>
                    form.setValue("scope", value as FormValues["scope"])
                  }
                >
                  <SelectTrigger aria-label="Saved view visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Only me</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {dialogMode === "rename" ? "Rename" : "Save view"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Remove saved view?"
        description="This saved view will be removed."
        confirmLabel="Remove"
        destructive
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
