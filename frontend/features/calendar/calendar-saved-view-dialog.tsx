"use client";

import type { FormEvent } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { AppDialog } from "@/components/shared/app-dialog";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarSavedViewFilterFields } from "./calendar-saved-view-filter-fields";
import type { CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";

const DATE_KINDS = [
  "today",
  "next-seven-days",
  "this-week",
  "this-month",
  "custom",
] as const;
const SCOPES = ["personal", "team"] as const;

function isDateKind(value: string): value is CalendarSavedViewFormValues["dateKind"] {
  return DATE_KINDS.some((kind) => kind === value);
}

function isScope(value: string): value is CalendarSavedViewFormValues["scope"] {
  return SCOPES.some((scope) => scope === value);
}

function viewTitle(mode: "create" | "rename" | null, viewMode: "calendar" | "list" | "my-day"): string {
  if (mode === "rename") return "Rename view";
  if (viewMode === "my-day") return "Save My Day view";
  return `Save ${viewMode} view`;
}

export function CalendarSavedViewDialog({
  mode,
  form,
  actorMembershipId,
  canManageTeam,
  viewMode,
  isPending,
  onClose,
  onSubmit,
}: {
  mode: "create" | "rename" | null;
  form: UseFormReturn<CalendarSavedViewFormValues>;
  actorMembershipId: number | null;
  canManageTeam: boolean;
  viewMode: "calendar" | "list" | "my-day";
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const dateKind = form.watch("dateKind");
  const scope = form.watch("scope");
  const nameError = form.formState.errors.name?.message;

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleDateKindChange(value: string) {
    if (isDateKind(value)) form.setValue("dateKind", value);
  }

  function handleScopeChange(value: string) {
    if (isScope(value)) form.setValue("scope", value);
  }

  const fields = (
    <form id="calendar-saved-view-form" onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="calendar-view-name">Name</Label>
        <Input id="calendar-view-name" {...form.register("name")} maxLength={100} />
        {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
      </div>
      {mode === "create" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date range</Label>
              <Select value={dateKind} onValueChange={handleDateKindChange}>
                <SelectTrigger aria-label="Saved view date range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="next-seven-days">Next seven days</SelectItem>
                  <SelectItem value="this-week">This week</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="custom">Selected day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canManageTeam ? (
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select value={scope} onValueChange={handleScopeChange}>
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
          </div>
          <CalendarSavedViewFilterFields actorMembershipId={actorMembershipId} />
        </>
      ) : null}
    </form>
  );
  const footer = (
    <div className="grid w-full grid-cols-2 gap-2">
      <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
      <LoadingButton
        form="calendar-saved-view-form"
        type="submit"
        isPending={isPending}
        loadingText={mode === "rename" ? "Renaming…" : "Saving…"}
      >
        {mode === "rename" ? "Rename" : "Save view"}
      </LoadingButton>
    </div>
  );

  return (
    <FormProvider {...form}>
      {mode === "create" ? (
        <AppSheet
          open
          onOpenChange={handleOpenChange}
          title={viewTitle(mode, viewMode)}
          description="Keep this date range and these filters so you can open them again."
          footer={footer}
          className="md:max-w-xl"
        >
          {fields}
        </AppSheet>
      ) : (
        <AppDialog
          open={mode === "rename"}
          onOpenChange={handleOpenChange}
          title={viewTitle(mode, viewMode)}
          description="The saved date range and filters stay the same."
          footer={footer}
        >
          {fields}
        </AppDialog>
      )}
    </FormProvider>
  );
}
