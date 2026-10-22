"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  useBulkOnboardEmployees,
  useBulkOnboardPreview,
} from "@/hooks/api/hr/employee-profile";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  BulkOnboardEmployeeRow,
  BulkOnboardPreviewRow,
  BulkOnboardResult,
  BulkOnboardSeats,
} from "@/types/hr";
import { MAX_ROWS, sourceRowOf } from "./bulk-onboard-columns";
import { missingRequiredHeaders, parseFile, ParseStructuralError } from "./bulk-onboard-parse";
import { validateAndMap, type PreviewRow } from "./bulk-onboard-template";
import {
  fetchEmployeeAdmissionCheck,
  employeeAdmissionGuidance,
} from "@/components/hr/check-employee-email";
import type { AssignedDefault } from "@/components/hr/reporting-lines/policy-default-primary";

export type BulkOnboardStep = "upload" | "preview" | "done";

export interface BulkOnboardFlowRow {
  fileRow: number;
  preview: PreviewRow;
  payload: BulkOnboardEmployeeRow | null;
  server: BulkOnboardPreviewRow | null;
  dependsOnFileRow: number | null;
}

export interface BulkOnboardCommit {
  result: BulkOnboardResult;
  fileRows: number[];
}

const COMMITTABLE = new Set(["READY", "WARNING"]);

export function isCommittable(row: BulkOnboardFlowRow): boolean {
  return (
    row.payload !== null &&
    row.server !== null &&
    COMMITTABLE.has(row.server.status)
  );
}

function checkFile(
  parsed: Array<Record<string, string>>,
  deptNames: Set<string>,
  secondaryCap: number | null,
  assignedDefault: AssignedDefault | null,
): BulkOnboardFlowRow[] {
  const seenEmails = new Set<string>();
  return parsed.map((raw, i) => {
    const { payload, preview } = validateAndMap(
      raw,
      deptNames,
      secondaryCap,
      assignedDefault,
    );
    if (preview.email && seenEmails.has(preview.email)) {
      preview.errors = [...preview.errors, "Duplicate email in this file"];
      preview.valid = false;
    } else if (preview.email) {
      seenEmails.add(preview.email);
    }
    const fileRow = sourceRowOf(raw, i + 1);
    return {
      fileRow,
      preview: { ...preview, _idx: fileRow },
      payload: preview.valid ? payload : null,
      server: null,
      dependsOnFileRow: null,
    };
  });
}

async function batchAdmissionCheck(
  rows: BulkOnboardFlowRow[],
): Promise<BulkOnboardFlowRow[]> {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const toCheck = rows.filter(
    (row) => row.payload === null && EMAIL_RE.test(row.preview.email),
  );
  if (toCheck.length === 0) return rows;
  const checks = await Promise.all(
    toCheck.map(async (row) => {
      try {
        const result = await fetchEmployeeAdmissionCheck(row.preview.email);
        return { fileRow: row.fileRow, result };
      } catch {
        return { fileRow: row.fileRow, result: null };
      }
    }),
  );
  const admissionByFileRow = new Map(
    checks.flatMap(({ fileRow, result }) =>
      result ? [[fileRow, result]] : [],
    ),
  );
  return rows.map((row) => {
    const admission = admissionByFileRow.get(row.fileRow);
    if (!admission) return row;
    const guidance = employeeAdmissionGuidance(admission.status);
    if (!guidance.blocking || !guidance.message) return row;
    const updatedPreview = {
      ...row.preview,
      errors: [...row.preview.errors, guidance.message],
      valid: false,
    };
    return { ...row, preview: updatedPreview };
  });
}

export function mergeServerPreview(
  rows: BulkOnboardFlowRow[],
  serverRows: BulkOnboardPreviewRow[],
): BulkOnboardFlowRow[] {
  const submitted = rows.filter((row) => row.payload !== null);
  const fileRowOf = (serverRow: number | null) =>
    serverRow === null ? null : (submitted[serverRow - 1]?.fileRow ?? null);
  const byFileRow = new Map<number, BulkOnboardPreviewRow>();
  for (const serverRow of serverRows) {
    const fileRow = fileRowOf(serverRow.row);
    if (fileRow !== null) byFileRow.set(fileRow, serverRow);
  }
  return rows.map((row) => {
    const server = byFileRow.get(row.fileRow) ?? null;
    return {
      ...row,
      server,
      dependsOnFileRow: server ? fileRowOf(server.dependsOnRow) : null,
    };
  });
}

export function useBulkOnboardFlow(
  deptNames: Set<string>,
  secondaryCap: number | null,
  assignedDefault: AssignedDefault | null,
) {
  const preview = useBulkOnboardPreview();
  const bulkOnboard = useBulkOnboardEmployees();
  const [step, setStep] = useState<BulkOnboardStep>("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<BulkOnboardFlowRow[]>([]);
  const [commit, setCommit] = useState<BulkOnboardCommit | null>(null);
  const [parsing, setParsing] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [seats, setSeats] = useState<BulkOnboardSeats | null>(null);

  async function runServerPreview(checked: BulkOnboardFlowRow[]) {
    const payloads = checked.flatMap((row) =>
      row.payload ? [row.payload] : [],
    );
    setCheckFailed(false);
    if (payloads.length === 0) return;
    try {
      const response = await preview.mutateAsync(payloads);
      setRows(mergeServerPreview(checked, response.rows));
      setSeats(response.seats);
    } catch (error) {
      setCheckFailed(true);
      toast.error(getErrorMessage(error));
    }
  }

  async function handleFile(file: File) {
    setParsing(true);
    setFileError(null);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        setFileError(
          `${file.name}: no data rows found. Keep the header row and add employees below it.`,
        );
        return;
      }
      const missingHeaders = missingRequiredHeaders(parsed);
      if (missingHeaders.length > 0) {
        setFileError(
          `${file.name} is missing required columns: ${missingHeaders.join(", ")}. Download the template and keep its header row.`,
        );
        return;
      }
      if (parsed.length > MAX_ROWS) {
        setFileError(
          `${file.name} has too many rows (${parsed.length}). Maximum is ${MAX_ROWS} per upload.`,
        );
        return;
      }
      const checked = checkFile(
        parsed,
        deptNames,
        secondaryCap,
        assignedDefault,
      );
      const withAdmission = await batchAdmissionCheck(checked);
      setFileName(file.name);
      setRows(withAdmission);
      setStep("preview");
      await runServerPreview(withAdmission);
    } catch (err) {
      setFileError(
        err instanceof ParseStructuralError
          ? `${file.name}: ${getErrorMessage(err)}`
          : `${file.name} could not be read. Use the template (.xlsx) or a CSV with the same headers.`,
      );
    } finally {
      setParsing(false);
    }
  }

  function retryPreview() {
    void runServerPreview(rows);
  }

  const committable = rows.filter(isCommittable);

  function commitRows() {
    const toCommit = committable.flatMap((row) =>
      row.payload ? [{ fileRow: row.fileRow, payload: row.payload }] : [],
    );
    if (toCommit.length === 0) {
      toast.error(
        "No ready rows to create. Fix the errors in the file and re-upload.",
      );
      return;
    }
    bulkOnboard.mutate(
      toCommit.map((row) => row.payload),
      {
        onSuccess: (result) => {
          setCommit({ result, fileRows: toCommit.map((row) => row.fileRow) });
          setStep("done");
          if (result.created > 0 && result.failed === 0 && result.skipped === 0)
            toast.success(
              `Onboarded ${result.created} employee${result.created === 1 ? "" : "s"}`,
            );
          else if (result.created > 0)
            toast.warning(
              `Onboarded ${result.created}; ${result.failed} failed, ${result.skipped} skipped`,
            );
          else
            toast.error(
              "No employees were created. Download the error report for details.",
            );
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function reset() {
    setStep("upload");
    setFileName("");
    setRows([]);
    setCommit(null);
    setCheckFailed(false);
    setFileError(null);
    setSeats(null);
  }

  return {
    step,
    fileName,
    rows,
    commit,
    parsing,
    checking: preview.isPending,
    checkFailed,
    fileError,
    seats,
    committing: bulkOnboard.isPending,
    committableCount: committable.length,
    handleFile,
    retryPreview,
    commitRows,
    reset,
  };
}
