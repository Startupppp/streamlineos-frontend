"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { downloadXlsx } from "@/lib/export/xlsx-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useBulkOnboardEmployees, useHrDepartments } from "@/hooks/api/hr";
import { useOrgDepartments } from "@/hooks/api/org-hierarchy";
import type { BulkOnboardEmployeeRow, BulkOnboardResult } from "@/types/hr";

/** Canonical template columns — keep in sync with backend bulkOnboardEmployeeRowSchema. */
export const BULK_ONBOARD_COLUMNS = [
  { key: "firstName", header: "firstName", required: true, width: 16, sample: "Priya" },
  { key: "lastName", header: "lastName", required: true, width: 16, sample: "Sharma" },
  { key: "email", header: "email", required: true, width: 28, sample: "priya.sharma@company.com" },
  { key: "phone", header: "phone", required: false, width: 16, sample: "+919876543210" },
  { key: "gender", header: "gender", required: false, width: 12, sample: "FEMALE" },
  { key: "designation", header: "designation", required: true, width: 20, sample: "Software Engineer" },
  { key: "department", header: "department", required: true, width: 18, sample: "Engineering" },
  { key: "role", header: "role", required: false, width: 16, sample: "ENGINEERING" },
  { key: "employeeId", header: "employeeId", required: false, width: 14, sample: "EMP-001" },
  { key: "joiningDate", header: "joiningDate", required: false, width: 14, sample: "2026-04-01" },
  { key: "dateOfBirth", header: "dateOfBirth", required: false, width: 14, sample: "1995-06-15" },
  { key: "taxId", header: "taxId", required: false, width: 14, sample: "ABCDE1234F" },
  { key: "monthlySalary", header: "monthlySalary", required: false, width: 14, sample: "75000" },
  { key: "bankAccountNumber", header: "bankAccountNumber", required: false, width: 18, sample: "123456789012" },
  { key: "bankName", header: "bankName", required: false, width: 16, sample: "HDFC Bank" },
  { key: "bankBranch", header: "bankBranch", required: false, width: 14, sample: "Koramangala" },
  { key: "ifsc", header: "ifsc", required: false, width: 14, sample: "HDFC0001234" },
  { key: "accountHolder", header: "accountHolder", required: false, width: 18, sample: "Priya Sharma" },
  { key: "pfUanNumber", header: "pfUanNumber", required: false, width: 14, sample: "100123456789" },
] as const;

type ColumnKey = (typeof BULK_ONBOARD_COLUMNS)[number]["key"];

type ParsedRow = Record<string, string>;

interface PreviewRow {
  _idx: number;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  department: string;
  phone: string;
  joiningDate: string;
  valid: boolean;
  errors: string[];
}

type Step = "upload" | "preview" | "done";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_VALUES = new Set(["MALE", "FEMALE", "OTHER"]);
const MAX_ROWS = 100;

const HEADER_ALIASES: Record<string, ColumnKey> = {
  firstname: "firstName",
  "first name": "firstName",
  first_name: "firstName",
  lastname: "lastName",
  "last name": "lastName",
  last_name: "lastName",
  email: "email",
  "e-mail": "email",
  phone: "phone",
  mobile: "phone",
  gender: "gender",
  designation: "designation",
  title: "designation",
  "job title": "designation",
  department: "department",
  "department name": "department",
  departmentid: "department",
  "department id": "department",
  role: "role",
  employeeid: "employeeId",
  "employee id": "employeeId",
  employee_id: "employeeId",
  joiningdate: "joiningDate",
  "joining date": "joiningDate",
  join_date: "joiningDate",
  dateofbirth: "dateOfBirth",
  "date of birth": "dateOfBirth",
  dob: "dateOfBirth",
  taxid: "taxId",
  "tax id": "taxId",
  pan: "taxId",
  monthlysalary: "monthlySalary",
  "monthly salary": "monthlySalary",
  salary: "monthlySalary",
  bankaccountnumber: "bankAccountNumber",
  "bank account number": "bankAccountNumber",
  "account number": "bankAccountNumber",
  bankname: "bankName",
  "bank name": "bankName",
  bankbranch: "bankBranch",
  "bank branch": "bankBranch",
  branch: "bankBranch",
  ifsc: "ifsc",
  accountholder: "accountHolder",
  "account holder": "accountHolder",
  pfuanumber: "pfUanNumber",
  "pf uan number": "pfUanNumber",
  uan: "pfUanNumber",
};

function normalizeHeader(h: string): ColumnKey | null {
  const key = h.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  // exact match on canonical keys (case-insensitive)
  const exact = BULK_ONBOARD_COLUMNS.find((c) => c.key.toLowerCase() === key.replace(/\s/g, ""));
  return exact?.key ?? null;
}

function cell(row: ParsedRow, key: ColumnKey): string {
  return (row[key] ?? "").trim();
}

function validateAndMap(
  raw: ParsedRow,
  deptNames: Set<string>,
): { payload: BulkOnboardEmployeeRow | null; errors: string[]; preview: Omit<PreviewRow, "_idx"> } {
  const errors: string[] = [];
  const firstName = cell(raw, "firstName");
  const lastName = cell(raw, "lastName");
  const email = cell(raw, "email").toLowerCase();
  const designation = cell(raw, "designation");
  const department = cell(raw, "department");
  const phone = cell(raw, "phone");
  const genderRaw = cell(raw, "gender").toUpperCase();
  const role = cell(raw, "role");
  const employeeId = cell(raw, "employeeId");
  const joiningDate = cell(raw, "joiningDate");
  const dateOfBirth = cell(raw, "dateOfBirth");
  const taxId = cell(raw, "taxId");
  const monthlySalaryRaw = cell(raw, "monthlySalary");
  const bankAccountNumber = cell(raw, "bankAccountNumber");
  const bankName = cell(raw, "bankName");
  const bankBranch = cell(raw, "bankBranch");
  const ifsc = cell(raw, "ifsc");
  const accountHolder = cell(raw, "accountHolder");
  const pfUanNumber = cell(raw, "pfUanNumber");

  if (!firstName) errors.push("firstName is required");
  if (!lastName) errors.push("lastName is required");
  if (!email) errors.push("email is required");
  else if (!EMAIL_RE.test(email)) errors.push("invalid email");
  if (!designation) errors.push("designation is required");
  if (!department) errors.push("department is required");
  else if (deptNames.size > 0 && !deptNames.has(department.toLowerCase()) && !/^\d+$/.test(department)) {
    errors.push(`unknown department "${department}" — use an Organization department name or code`);
  }
  if (genderRaw && !GENDER_VALUES.has(genderRaw)) {
    errors.push("gender must be MALE, FEMALE, or OTHER");
  }

  if (dateOfBirth) {
    const dob = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? new Date(`${dateOfBirth}T00:00:00`)
      : new Date(dateOfBirth);
    const minAgeMs = 16 * 365.25 * 24 * 60 * 60 * 1000;
    if (Number.isNaN(dob.getTime())) {
      errors.push("invalid dateOfBirth (use YYYY-MM-DD)");
    } else if (dob >= new Date()) {
      errors.push("dateOfBirth cannot be in the future");
    } else if (Date.now() - dob.getTime() < minAgeMs) {
      errors.push("Employee must be at least 16 years old");
    }
  }

  let monthlySalary: number | undefined;
  if (monthlySalaryRaw) {
    const n = Number(monthlySalaryRaw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) errors.push("invalid monthlySalary");
    else monthlySalary = n;
  }

  let departmentId: number | undefined;
  let departmentName: string | undefined = department || undefined;
  if (/^\d+$/.test(department)) {
    departmentId = Number(department);
    departmentName = undefined;
  }

  const preview = {
    firstName,
    lastName,
    email,
    designation,
    department,
    phone,
    joiningDate,
    valid: errors.length === 0,
    errors,
  };

  if (errors.length > 0) {
    return { payload: null, errors, preview };
  }

  const hasBank =
    bankAccountNumber || bankName || bankBranch || ifsc || accountHolder || pfUanNumber;

  const payload: BulkOnboardEmployeeRow = {
    firstName,
    lastName,
    email,
    designation,
    ...(departmentId != null ? { departmentId } : { department: departmentName }),
    ...(phone ? { phone } : {}),
    ...(genderRaw ? { gender: genderRaw as "MALE" | "FEMALE" | "OTHER" } : {}),
    ...(role ? { role } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(joiningDate ? { joiningDate } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(taxId ? { taxId } : {}),
    ...(monthlySalary != null ? { monthlySalary } : {}),
    ...(hasBank
      ? {
          bankDetails: {
            ...(bankAccountNumber ? { accountNumber: bankAccountNumber } : {}),
            ...(bankName ? { bankName } : {}),
            ...(bankBranch ? { branch: bankBranch } : {}),
            ...(ifsc ? { ifsc } : {}),
            ...(accountHolder ? { accountHolder } : {}),
            ...(pfUanNumber ? { pfUanNumber } : {}),
          },
        }
      : {}),
  };

  return { payload, errors, preview };
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  if (file.name.endsWith(".csv") || file.type === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return mapRawRows(result.meta.fields ?? [], result.data);
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  // Prefer the "Employees" sheet if present (template has Instructions + Employees)
  const worksheet =
    workbook.getWorksheet("Employees") ?? workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in file");

  const firstRow = worksheet.getRow(1);
  const headers: string[] = [];
  firstRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.text ?? "").trim();
  });

  const dataRows: Record<string, string>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const entry: Record<string, string> = {};
    let empty = true;
    headers.forEach((header, idx) => {
      if (!header) return;
      const val = excelCellToString(row.getCell(idx + 1));
      if (val) empty = false;
      entry[header] = val;
    });
    if (!empty) dataRows.push(entry);
  });

  return mapRawRows(headers.filter(Boolean), dataRows);
}

/** Normalize ExcelJS cell values (dates, rich text, formulas) to plain strings. */
function formatLocalDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function excelCellToString(cell: { text?: string; value?: unknown }): string {
  const value = cell.value;
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    // Local calendar date — toISOString() shifts DOB/joiningDate in non-UTC zones
    return formatLocalDate(value);
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    const result = (value as { result?: unknown }).result;
    if (result instanceof Date) return formatLocalDate(result);
    if (result != null) return String(result).trim();
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: string }).text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "richText" in value) {
    const parts = (value as { richText: Array<{ text?: string }> }).richText;
    return parts.map((p) => p.text ?? "").join("").trim();
  }
  const text = cell.text;
  if (text != null && String(text).trim() !== "") return String(text).trim();
  return String(value).trim();
}

function mapRawRows(headers: string[], data: Record<string, string>[]): ParsedRow[] {
  const keyMap = new Map<string, ColumnKey>();
  for (const h of headers) {
    const mapped = normalizeHeader(h);
    if (mapped) keyMap.set(h, mapped);
  }

  return data.map((row) => {
    const out: ParsedRow = {};
    for (const [header, value] of Object.entries(row)) {
      const key = keyMap.get(header) ?? normalizeHeader(header);
      if (key) out[key] = value ?? "";
    }
    return out;
  });
}

export async function downloadBulkOnboardTemplate(departmentNames: string[] = []) {
  const sampleRow: Record<string, unknown> = {};
  for (const col of BULK_ONBOARD_COLUMNS) {
    sampleRow[col.key] = col.sample;
  }
  if (departmentNames[0]) {
    sampleRow.department = departmentNames[0];
  }

  const blankRow: Record<string, unknown> = {};
  for (const col of BULK_ONBOARD_COLUMNS) {
    blankRow[col.key] = "";
  }

  const instructionRows = [
    { field: "firstName", required: "Yes", notes: "Employee first name" },
    { field: "lastName", required: "Yes", notes: "Employee last name" },
    { field: "email", required: "Yes", notes: "Work email — must be unique in the org" },
    { field: "phone", required: "No", notes: "Phone with country code preferred" },
    { field: "gender", required: "No", notes: "MALE, FEMALE, or OTHER" },
    { field: "designation", required: "Yes", notes: "Job title (e.g. Software Engineer)" },
    {
      field: "department",
      required: "Yes",
      notes: departmentNames.length
        ? `Exact department name. Yours: ${departmentNames.join(", ")}`
        : "Exact department name as configured in HR (or numeric department id)",
    },
    { field: "role", required: "No", notes: "Org role slug (default ENGINEERING)" },
    { field: "employeeId", required: "No", notes: "External employee code" },
    { field: "joiningDate", required: "No", notes: "YYYY-MM-DD" },
    { field: "dateOfBirth", required: "No", notes: "YYYY-MM-DD — employee must be 16+" },
    { field: "taxId", required: "No", notes: "PAN format e.g. ABCDE1234F" },
    { field: "monthlySalary", required: "No", notes: "Number only, no currency symbol" },
    { field: "bankAccountNumber", required: "No", notes: "9–18 digits" },
    { field: "bankName", required: "No", notes: "Bank name" },
    { field: "bankBranch", required: "No", notes: "Branch name" },
    { field: "ifsc", required: "No", notes: "e.g. HDFC0001234" },
    { field: "accountHolder", required: "No", notes: "Name on the bank account" },
    { field: "pfUanNumber", required: "No", notes: "12-digit UAN" },
    { field: "", required: "", notes: "" },
    {
      field: "Limits",
      required: "",
      notes: `Up to ${MAX_ROWS} employees per upload. Keep header row as-is. Delete the sample row before importing production data if needed.`,
    },
  ];

  await downloadXlsx("employee-onboard-template.xlsx", [
    {
      name: "Employees",
      columns: BULK_ONBOARD_COLUMNS.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.width,
      })),
      rows: [sampleRow, blankRow, blankRow],
    },
    {
      name: "Instructions",
      columns: [
        { header: "Field", key: "field", width: 22 },
        { header: "Required", key: "required", width: 12 },
        { header: "Notes", key: "notes", width: 70 },
      ],
      rows: instructionRows,
    },
  ]);
}

export function BulkOnboardPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: departments } = useHrDepartments();
  const { data: orgDepartments } = useOrgDepartments({ limit: 200, status: "ACTIVE" });
  const bulkOnboard = useBulkOnboardEmployees();

  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [payloads, setPayloads] = useState<BulkOnboardEmployeeRow[]>([]);
  const [result, setResult] = useState<BulkOnboardResult | null>(null);
  const [parsing, setParsing] = useState(false);

  const deptNames = useMemo(() => {
    const names = new Set<string>();
    for (const d of departments ?? []) {
      if (d.name?.trim()) names.add(d.name.trim().toLowerCase());
    }
    for (const d of orgDepartments?.data ?? []) {
      if (d.name?.trim()) names.add(d.name.trim().toLowerCase());
      if (d.code?.trim()) names.add(d.code.trim().toLowerCase());
    }
    return names;
  }, [departments, orgDepartments?.data]);

  const deptNameList = useMemo(() => {
    const labels = new Set<string>();
    for (const d of departments ?? []) {
      if (d.name?.trim()) labels.add(d.name.trim());
    }
    for (const d of orgDepartments?.data ?? []) {
      if (d.name?.trim()) labels.add(d.name.trim());
    }
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [departments, orgDepartments?.data]);

  const validCount = useMemo(() => previewRows.filter((r) => r.valid).length, [previewRows]);
  const invalidCount = previewRows.length - validCount;

  const handleDownloadTemplate = useCallback(async () => {
    try {
      await downloadBulkOnboardTemplate(deptNameList);
      toast.success("Template downloaded");
    } catch {
      toast.error("Could not download template");
    }
  }, [deptNameList]);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setPreviewRows([]);
    setPayloads([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setParsing(true);
      try {
        const parsed = await parseFile(file);
        if (parsed.length === 0) {
          toast.error("No data rows found. Keep the header row and add employees below it.");
          return;
        }
        if (parsed.length > MAX_ROWS) {
          toast.error(`Too many rows (${parsed.length}). Maximum is ${MAX_ROWS} per upload.`);
          return;
        }

        const nextPreview: PreviewRow[] = [];
        const nextPayloads: BulkOnboardEmployeeRow[] = [];
        const seenEmails = new Set<string>();

        parsed.forEach((row, i) => {
          const { payload, preview } = validateAndMap(row, deptNames);
          if (preview.email && seenEmails.has(preview.email)) {
            preview.errors = [...preview.errors, "Duplicate email in this file"];
            preview.valid = false;
          } else if (preview.email) {
            seenEmails.add(preview.email);
          }
          nextPreview.push({ ...preview, _idx: i + 1 });
          if (payload && preview.valid) nextPayloads.push(payload);
        });

        setFileName(file.name);
        setPreviewRows(nextPreview);
        setPayloads(nextPayloads);
        setStep("preview");
      } catch {
        toast.error("Failed to parse file. Use the template (.xlsx) or a CSV with the same headers.");
      } finally {
        setParsing(false);
      }
    },
    [deptNames],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleImport = useCallback(() => {
    if (payloads.length === 0) {
      toast.error("No valid rows to import. Fix errors in the file and re-upload.");
      return;
    }

    bulkOnboard.mutate(payloads, {
      onSuccess: (res) => {
        setResult(res);
        setStep("done");
        if (res.created > 0 && res.failed === 0) {
          toast.success(`Onboarded ${res.created} employee${res.created === 1 ? "" : "s"}`);
        } else if (res.created > 0) {
          toast.warning(`Onboarded ${res.created}, ${res.failed} failed`);
        } else {
          toast.error("No employees were created. Check the errors below.");
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [payloads, bulkOnboard]);

  const previewColumns = useMemo<DataTableColumn<PreviewRow>[]>(
    () => [
      {
        key: "_idx",
        header: "#",
        cell: (row) => <span className="text-muted-foreground tabular-nums">{row._idx}</span>,
        className: "w-10 text-xs",
      },
      {
        key: "name",
        header: "Name",
        cell: (row) => (
          <span className="text-xs font-medium">
            {row.firstName || "—"} {row.lastName}
          </span>
        ),
        className: "text-xs",
      },
      {
        key: "email",
        header: "Email",
        cell: (row) => <span className="text-xs max-w-[180px] truncate block">{row.email || "—"}</span>,
        className: "text-xs",
      },
      {
        key: "designation",
        header: "Designation",
        cell: (row) => <span className="text-xs">{row.designation || "—"}</span>,
        className: "text-xs",
      },
      {
        key: "department",
        header: "Department",
        cell: (row) => <span className="text-xs">{row.department || "—"}</span>,
        className: "text-xs",
      },
      {
        key: "status",
        header: "Status",
        cell: (row) =>
          row.valid ? (
            <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0">
              Ready
            </Badge>
          ) : (
            <span className="flex flex-col gap-0.5">
              <Badge variant="destructive" className="text-[10px] h-5 w-fit">
                Error
              </Badge>
              <span className="text-[10px] text-destructive max-w-[200px]">{row.errors.join("; ")}</span>
            </span>
          ),
        className: "text-xs",
      },
    ],
    [],
  );

  const failedResults = result?.results.filter((r) => !r.success) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Bulk onboard employees
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download the template, fill one row per employee, then upload to create up to {MAX_ROWS} accounts at once.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 shrink-0"
          onClick={() => void handleDownloadTemplate()}
        >
          <Download className="h-3.5 w-3.5" />
          Download template
        </Button>
      </div>

      {/* Required columns chip list */}
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Required columns
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BULK_ONBOARD_COLUMNS.filter((c) => c.required).map((c) => (
              <Badge key={c.key} variant="outline" className="text-[10px] h-5 font-mono font-normal">
                {c.header}
              </Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Optional: phone, gender, role, employeeId, joiningDate, dateOfBirth, taxId, monthlySalary, bank fields.
            {deptNameList.length > 0 && (
              <>
                {" "}
                Departments:{" "}
                <span className="text-foreground/80">{deptNameList.join(", ")}</span>
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {step === "upload" && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upload file</CardTitle>
            <CardDescription className="text-xs">
              CSV or Excel (.xlsx). Use the template headers for best results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-colors",
                "hover:border-primary/50 hover:bg-primary/[0.02]",
                parsing && "pointer-events-none opacity-70",
              )}
            >
              {parsing ? (
                <Loader2 className="h-9 w-9 mx-auto mb-3 text-primary animate-spin" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
              )}
              <p className="text-sm font-medium">
                {parsing ? "Parsing file…" : "Drag & drop or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                .csv, .xlsx — max {MAX_ROWS} employees
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileInput}
              aria-label="Upload employee onboard file"
            />
            <div className="mt-3 flex items-start gap-2 text-[11px] text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Prefer downloading the template first so columns match. The sample row can be edited or deleted.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Preview · {fileName}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {previewRows.length} row{previewRows.length === 1 ? "" : "s"} ·{" "}
                  <span className="text-emerald-600 dark:text-emerald-300">{validCount} ready</span>
                  {invalidCount > 0 && (
                    <>
                      {" · "}
                      <span className="text-destructive">{invalidCount} with errors</span>
                    </>
                  )}
                </CardDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={reset}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {invalidCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Rows with errors will be skipped. Fix them in your file and re-upload, or continue to import only the ready rows.
                </span>
              </div>
            )}

            <div className="rounded-lg border overflow-hidden">
              <DataTable
                data={previewRows}
                columns={previewColumns}
                getRowKey={(row) => row._idx}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="h-8" onClick={reset}>
                Back
              </Button>
              <LoadingButton
                type="button"
                size="sm"
                className="h-8 gap-1.5 min-w-[140px]"
                disabled={payloads.length === 0}
                isPending={bulkOnboard.isPending}
                loadingText="Onboarding…"
                onClick={handleImport}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Onboard {payloads.length} employee{payloads.length === 1 ? "" : "s"}
              </LoadingButton>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3",
                  result.created > 0
                    ? "bg-emerald-100 dark:bg-emerald-500/10"
                    : "bg-destructive/10",
                )}
              >
                {result.created > 0 ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <AlertCircle className="h-7 w-7 text-destructive" />
                )}
              </div>
              <p className="font-semibold text-base">
                {result.created > 0 ? "Bulk onboard complete" : "Onboard finished with errors"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Welcome emails are sent when email delivery is configured.
              </p>
            </div>

            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300 tabular-nums">
                  {result.created}
                </p>
                <p className="text-[11px] text-muted-foreground">Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive tabular-nums">{result.failed}</p>
                <p className="text-[11px] text-muted-foreground">Failed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground tabular-nums">{result.total}</p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </div>
            </div>

            {failedResults.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 mb-4 max-h-48 overflow-auto">
                <p className="text-xs font-medium text-destructive mb-2">Failed rows</p>
                <ul className="space-y-1.5">
                  {failedResults.map((r) => (
                    <li key={`${r.row}-${r.email}`} className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">Row {r.row}</span>
                      {" · "}
                      {r.email}
                      {" — "}
                      {r.error ?? "Unknown error"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" size="sm" className="h-8" onClick={reset}>
                Onboard more
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8" asChild>
                <Link href="/hr/employees">View employees</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
