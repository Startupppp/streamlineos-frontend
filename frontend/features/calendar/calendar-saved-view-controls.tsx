"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  search,
  onSearchChange,
  sources,
  source,
  onSourceChange,
}: {
  selectedId: string | null;
  currentDate: Date;
  mode: "calendar" | "list" | "my-day";
  search?: string;
  onSearchChange?: (value: string) => void;
  sources?: ReadonlyArray<{ value: string; label: string }>;
  source?: string;
  onSourceChange?: (value: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canWrite = useCan("calendar:read");
  const canManageTeam = useCan("calendar:admin:manage");
  const query = useCalendarSavedViews();
  const { hasNextPage, isFetchingNextPage, dataUpdatedAt, fetchNextPage } = query;
  const create = useCreateCalendarSavedView();
  const update = useUpdateCalendarSavedView();
  const remove = useDeleteCalendarSavedView();
  const actorMembershipId = query.data?.pages[0]?.actorMembershipId ?? null;
  const views =
    query.data?.pages
      .flatMap((page) => page.items)
      .filter((view) => Boolean(view && view.definition.mode === mode)) ?? [];
  const selected = views.find((view) => view.id === selectedId);
  const [selectOpen, setSelectOpen] = useState(false);
  const nextPageSentinelRef = useRef<HTMLDivElement | null>(null);
  const lastRequestedUpdateRef = useRef<number | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "rename" | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const form = useForm<CalendarSavedViewFormValues>({
    resolver: zodResolver(calendarSavedViewFormSchema),
    defaultValues: calendarSavedViewFormValues(undefined, null),
  });

  useEffect(() => {
    if (
      !selectOpen ||
      !hasNextPage ||
      isFetchingNextPage ||
      !dataUpdatedAt
    ) return;
    const sentinel = nextPageSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const update = dataUpdatedAt;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || lastRequestedUpdateRef.current === update) return;
      lastRequestedUpdateRef.current = update;
      void fetchNextPage();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectOpen, hasNextPage, isFetchingNextPage, dataUpdatedAt, fetchNextPage]);

  const selectView = (id: string | null) => {
    onSearchChange?.("");
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
    <div className="flex shrink-0 flex-nowrap items-center gap-2">
      <Select
        value={selectedId ?? "none"}
        onOpenChange={setSelectOpen}
        onValueChange={(value) => selectView(value === "none" ? null : value)}
      >
        <SelectTrigger
          aria-label="Saved calendar view"
          className="h-9 w-40 text-sm"
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
          {query.hasNextPage ? (
            <div ref={nextPageSentinelRef} className="px-2 py-1 text-xs text-muted-foreground" role="status">
              {query.isFetchingNextPage ? "Loading more views…" : "Scroll to see more views"}
            </div>
          ) : null}
        </SelectContent>
      </Select>
      {search !== undefined && onSearchChange ? (
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search events"
          aria-label="Search calendar events"
          className="h-9 min-w-40 max-w-64 text-sm"
          maxLength={200}
        />
      ) : null}
      {sources && onSourceChange ? (
        <Select value={source || "all"} onValueChange={onSourceChange}>
          <SelectTrigger aria-label="Filter by calendar source" className="h-9 w-44 text-sm">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sources.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {query.isError ? <div role="alert" className="text-xs text-destructive">Saved views are unavailable. <Button type="button" size="sm" variant="ghost" onClick={() => { void query.refetch(); }}>Retry</Button></div> : null}
      {canWrite ? (
        <Button type="button" size="sm" variant="outline" disabled={query.isError} onClick={openCreate} aria-label="Save view" className="px-2.5 sm:px-3">
          <BookmarkPlus className="size-4 sm:hidden" aria-hidden />
          <span className="sr-only sm:not-sr-only">Save view</span>
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
