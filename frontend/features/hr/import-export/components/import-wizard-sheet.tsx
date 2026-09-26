"use client";

import { useState, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateImportJob,
  useCommitImportJob,
  type HrImportEntity,
  type HrImportJob,
} from "@/hooks/api/hr/import-export";
import { ImportResultSummary } from "@/features/hr/import-export/components/import-result-summary";
import { parseCsv } from "./import-csv";
import { ImportPreviewStep, ImportUploadStep, ImportValidateStep, ImportWizardStepIndicator } from "./import-wizard-steps";

interface ImportWizardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: HrImportEntity;
  entityLabel: string;
  columns: string[];
}

// Steps 1-3 are upload, preview and validate; 4 is the result of a commit.
type Step = 1 | 2 | 3 | 4;

export function ImportWizardSheet({
  open,
  onOpenChange,
  entity,
  entityLabel,
  columns,
}: ImportWizardSheetProps) {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [job, setJob] = useState<HrImportJob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createJob = useCreateImportJob();
  const commitJob = useCommitImportJob();

  const handleReset = useCallback(() => {
    setStep(1);
    setFileName("");
    setParsedRows([]);
    setParseError(null);
    setJob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) handleReset();
      onOpenChange(next);
    },
    [onOpenChange, handleReset],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result;
        if (typeof text !== "string") return;
        const rows = parseCsv(text);
        if (rows.length === 0) {
          setParseError("No rows found. Check the CSV has a header row.");
          setParsedRows([]);
        } else {
          setParseError(null);
          setParsedRows(rows);
          setStep(2);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [],
  );

  const handleValidate = useCallback(() => {
    createJob.mutate(
      {
        entity,
        fileName,
        rows: parsedRows,
      },
      {
        onSuccess: (result) => {
          setJob(result.job);
          setStep(3);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [createJob, entity, fileName, parsedRows]);

  const handleCommit = useCallback(() => {
    if (!job) return;
    commitJob.mutate(
      { jobId: job.id },
      {
        onSuccess: (result) => {
          setJob(result);
          setStep(4);
          if (result.status === "failed" || result.validRows === 0) toast.error(`Nothing was imported. ${result.errorRows} ${result.errorRows === 1 ? "row" : "rows"} failed.`);
          else if (result.errorRows > 0) toast.warning(`${entityLabel} imported with problems: ${result.validRows} written, ${result.errorRows} failed.`);
          else toast.success(`${entityLabel} imported: ${result.createdRows} new, ${result.updatedRows} changed, ${result.unchangedRows} already there.`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [commitJob, job, entityLabel]);

  const handleDone = useCallback(() => handleOpenChange(false), [handleOpenChange]);
  const handleChooseFile = useCallback(() => fileInputRef.current?.click(), []);
  const handleBackToUpload = useCallback(() => setStep(1), []);
  const handleBackToPreview = useCallback(() => setStep(2), []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>Import {entityLabel}</SheetTitle>
          <ImportWizardStepIndicator step={step} />
        </SheetHeader>

        <SheetBody className="space-y-4 px-6 py-4">
          {step === 1 ? (
            <ImportUploadStep entity={entity} columns={columns} parseError={parseError} onChooseFile={handleChooseFile} />
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
            aria-label={`Choose a CSV file of ${entityLabel}`}
          />
          {step === 2 ? <ImportPreviewStep fileName={fileName} rows={parsedRows} /> : null}
          {step === 3 && job ? <ImportValidateStep job={job} /> : null}
          {step === 4 && job ? <ImportResultSummary job={job} entityLabel={entityLabel} /> : null}
        </SheetBody>

        <SheetFooter className="flex shrink-0 gap-2 border-t border-border bg-muted/30 px-6 py-4">
          {step === 1 && (
            <Button type="button" variant="outline" onClick={handleDone}>
              Cancel
            </Button>
          )}
          {step === 2 && (
            <>
              <Button type="button" variant="outline" onClick={handleBackToUpload}>
                Back
              </Button>
              <LoadingButton
                isPending={createJob.isPending}
                loadingText="Validating…"
                onClick={handleValidate}
              >
                Validate {parsedRows.length} rows
              </LoadingButton>
            </>
          )}
          {step === 4 && (
            <Button onClick={handleDone}>
              Done
            </Button>
          )}
          {step === 3 && job && (
            <>
              <Button type="button" variant="outline" onClick={handleBackToPreview}>
                Back
              </Button>
              <LoadingButton
                isPending={commitJob.isPending}
                loadingText="Committing…"
                disabled={job.validRows === 0}
                onClick={handleCommit}
              >
                Commit {job.validRows} rows
              </LoadingButton>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
