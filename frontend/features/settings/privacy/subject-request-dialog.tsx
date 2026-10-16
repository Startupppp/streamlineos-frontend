"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { subjectRequestSchema, type SubjectRequestInput, type SubjectRequestValues } from "./subject-request-schema";

const DEFAULT_VALUES: SubjectRequestInput = { kind: "export", subjectEmail: "", dueBy: "", backupsExpireBy: "" };

interface SubjectRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (values: SubjectRequestValues) => void;
}

/** Files a data-subject request by email. An erasure goes on to the typed-email confirm. */
export function SubjectRequestDialog({ open, onOpenChange, isSubmitting, onSubmit }: SubjectRequestDialogProps) {
  return (
    <EntityFormDialog<SubjectRequestInput, SubjectRequestValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Run a subject request"
      description="Runs across every region this platform stores data in and files the result."
      resolver={zodResolver(subjectRequestSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Continue"
      resetOnOpen
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Request</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value="export">Export (access request)</SelectItem>
                    <SelectItem value="erasure">Erasure (right to be forgotten)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subjectEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statutory due date (optional)</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} clearable dateFormat="dd MMM yyyy" ariaLabel="Statutory due date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="backupsExpireBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Backups expire by (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 2026-12-31" {...field} />
                </FormControl>
                <FormDescription className="text-xs">From your backup retention policy; recorded with the request.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </EntityFormDialog>
  );
}
