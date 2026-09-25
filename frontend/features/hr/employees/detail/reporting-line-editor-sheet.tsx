"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { useSetReportingLine } from "@/hooks/api/hr/reporting-lines";
import type { ReportingLineView } from "@/hooks/api/hr/reporting-lines-schema";
import { getApiErrorCode } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { ReportingLineChangeWarning } from "./reporting-line-change-warning";
import { ReportingLineEditorFields } from "./reporting-line-editor-fields";
import {
  ERROR_FIELD,
  editorDefaults,
  editorPayload,
  exceedsChangeThreshold,
  reportingLineEditorSchema,
  type ReportingLineEditorValues,
} from "./reporting-line-editor-schema";

const FORM_ID = "reporting-line-editor";

interface ReportingLineEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeUserId: string;
  line: ReportingLineView;
}

function PrimaryPreview({ from, to }: { from: string | null; to: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">Primary manager</span>
      <span className="font-medium">{from ?? "None"}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="changes to" />
      <span className="font-medium">{to ?? "None"}</span>
    </div>
  );
}

/**
 * HR edits one employee's primary and additional managers (PRD §7.6, single
 * employee). Mount it only while open: defaults are read from `line` at mount,
 * so a background refetch never wipes an edit in progress.
 */
export function ReportingLineEditorSheet({ open, onOpenChange, employeeUserId, line }: ReportingLineEditorSheetProps) {
  const setLine = useSetReportingLine();
  const form = useForm<ReportingLineEditorValues>({
    resolver: zodResolver(reportingLineEditorSchema),
    defaultValues: editorDefaults(line),
  });

  const topLevel = form.watch("topLevel");
  const primaryId = form.watch("primaryManagerUserId");
  const primaryRef = form.watch("primaryManagerRef");
  const currentId = line.current?.managerUserId ?? null;
  const nextId = topLevel ? null : primaryId;
  const primaryChanges = nextId !== currentId;
  const reasonRequired = exceedsChangeThreshold(line, primaryChanges);
  const canOverride = line.permittedActions.override;

  useEffect(() => {
    form.setValue("reasonRequired", reasonRequired);
  }, [form, reasonRequired]);

  function handleCancel() {
    onOpenChange(false);
  }

  function handleSubmit(values: ReportingLineEditorValues) {
    setLine.mutate(editorPayload(employeeUserId, values), {
      onSuccess: (result) => {
        toast.success(values.effectiveFrom ? "Reporting line change scheduled" : "Reporting line updated");
        for (const warning of result.warnings) toast.warning(warning);
        onOpenChange(false);
      },
      onError: (error) => {
        const field = ERROR_FIELD[getApiErrorCode(error) ?? ""];
        if (field) form.setError(field, { message: getErrorMessage(error) });
        else toast.error(getErrorMessage(error));
      },
    });
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit reporting line"
      description="Changes are effective-dated; earlier lines stay in the history."
      footer={
        <>
          <Button type="button" variant="outline" className="flex-1" onClick={handleCancel} disabled={setLine.isPending}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form={FORM_ID}
            className="flex-1"
            isPending={setLine.isPending}
            disabled={reasonRequired && !canOverride}
          >
            Save
          </LoadingButton>
        </>
      }
    >
      <Form {...form}>
        <form id={FORM_ID} onSubmit={form.handleSubmit(handleSubmit)} noValidate className="flex flex-col gap-4">
          {primaryChanges ? (
            <PrimaryPreview from={line.current?.managerName ?? null} to={topLevel ? "Top-level role" : (primaryRef?.name ?? null)} />
          ) : null}
          {reasonRequired ? (
            <ReportingLineChangeWarning
              changesLast24h={line.primaryChangesLast24h}
              threshold={line.changeThreshold}
              canOverride={canOverride}
            />
          ) : null}
          <ReportingLineEditorFields
            form={form}
            employeeUserId={employeeUserId}
            maxSecondaryManagers={line.maxSecondaryManagers}
            canOverride={canOverride}
          />
        </form>
      </Form>
    </AppSheet>
  );
}
