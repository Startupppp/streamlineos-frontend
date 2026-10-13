"use client";

import type { FormEvent } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarSavedViewFilterFields } from "./calendar-saved-view-filter-fields";
import type { CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";

export function CalendarSavedViewDialog({
  mode,
  form,
  actorMembershipId,
  canManageTeam,
  isPending,
  onClose,
  onSubmit,
}: {
  mode: "create" | "rename" | null;
  form: UseFormReturn<CalendarSavedViewFormValues>;
  actorMembershipId: number | null;
  canManageTeam: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "rename" ? "Rename view" : "Save My Day view"}</DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="calendar-view-name">Name</Label>
              <Input id="calendar-view-name" {...form.register("name")} maxLength={100} />
              {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
            </div>
            {mode === "create" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Date range</Label>
                  <Select value={form.watch("dateKind")} onValueChange={(value) => form.setValue("dateKind", value as CalendarSavedViewFormValues["dateKind"])}>
                    <SelectTrigger aria-label="Saved view date range"><SelectValue /></SelectTrigger>
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
                    <Select value={form.watch("scope")} onValueChange={(value) => form.setValue("scope", value as CalendarSavedViewFormValues["scope"])}>
                      <SelectTrigger aria-label="Saved view visibility"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Only me</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <CalendarSavedViewFilterFields actorMembershipId={actorMembershipId} />
              </>
            ) : null}
            <Button type="submit" disabled={isPending}>{mode === "rename" ? "Rename" : "Save view"}</Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
