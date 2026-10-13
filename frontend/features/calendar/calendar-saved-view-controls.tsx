"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import type { CalendarSavedView } from "@/hooks/api/calendar-saved-view-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { calendarUrl } from "./calendar-url-state";
import { CalendarSavedViewDialog } from "./calendar-saved-view-dialog";
import { calendarSavedViewFormSchema, type CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";
import { calendarSavedViewDefinition, calendarSavedViewFormValues } from "./calendar-saved-view-definition";

export function CalendarSavedViewControls({
  selectedId,
  currentDate,
  mode,
}: {
  selectedId: string | null;
  currentDate: Date;
  mode: "calendar" | "list" | "my-day";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canWrite = useCan("calendar:read");
  const canManageTeam = useCan("calendar:admin:manage");
  const query = useCalendarSavedViews();
  const create = useCreateCalendarSavedView();
  const update = useUpdateCalendarSavedView();
  const remove = useDeleteCalendarSavedView();
  const actorMembershipId = query.data?.pages[0]?.actorMembershipId ?? null;
  const views =
    query.data?.pages
      .flatMap((page) => page.items)
      .filter((view) => view.definition.mode === mode) ?? [];
  const selected = views.find((view) => view.id === selectedId);
  const [dialogMode, setDialogMode] = useState<"create" | "rename" | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const form = useForm<CalendarSavedViewFormValues>({
    resolver: zodResolver(calendarSavedViewFormSchema),
    defaultValues: calendarSavedViewFormValues(undefined, null),
  });

  const selectView = (id: string | null) => {
    router.push(
      calendarUrl(new URLSearchParams(searchParams.toString()), { filter: id }),
    );
  };

  const openCreate = () => {
    form.reset({ ...calendarSavedViewFormValues(selected, actorMembershipId), name: "", scope: "personal" });
    setDialogMode("create");
  };

  const openRename = () => {
    if (!selected) return;
    form.reset(calendarSavedViewFormValues(selected, actorMembershipId));
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
        const definition = calendarSavedViewDefinition(values, currentDate, actorMembershipId, mode);
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
          <SelectItem value="none">{mode === "my-day" ? "My Day" : "All events"}</SelectItem>
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
      <CalendarSavedViewDialog
        mode={dialogMode}
        form={form}
        actorMembershipId={actorMembershipId}
        canManageTeam={canManageTeam}
        viewMode={mode}
        isPending={create.isPending || update.isPending}
        onClose={() => setDialogMode(null)}
        onSubmit={submit}
      />
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
