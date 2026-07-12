"use client";

import { CsvFieldMapper } from "@/features/crm/leads/csv-field-mapper";

export interface ParsedDeal {
  name: string;
  value?: number;
  stage?: string;
  ownerEmail?: string;
  expectedCloseDate?: string;
  contactEmail?: string;
  companyName?: string;
  description?: string;
}

export const DEAL_FIELDS: { value: string; label: string }[] = [
  { value: "_skip", label: "— Skip —" },
  { value: "name", label: "Deal Name (required)" },
  { value: "value", label: "Value / Amount" },
  { value: "stage", label: "Stage (NEW/QUALIFIED/PROPOSAL/…)" },
  { value: "owner_email", label: "Owner Email" },
  { value: "expected_close_date", label: "Expected Close Date" },
  { value: "contact_email", label: "Contact Email" },
  { value: "company_name", label: "Company Name" },
  { value: "description", label: "Description" },
];

export const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "deal name", "dealname", "title", "deal title", "dealtitle"],
  value: ["value", "amount", "deal value", "dealvalue", "budget", "price"],
  stage: ["stage", "deal stage", "dealstage", "status", "pipeline stage"],
  owner_email: [
    "owner email",
    "owneremail",
    "owner",
    "assigned to",
    "assignedto",
    "sales rep email",
    "rep email",
  ],
  expected_close_date: [
    "expected close date",
    "expectedclosedate",
    "close date",
    "closedate",
    "closing date",
    "closingdate",
    "due date",
    "duedate",
  ],
  contact_email: [
    "contact email",
    "contactemail",
    "customer email",
    "customeremail",
    "client email",
    "clientemail",
  ],
  company_name: [
    "company name",
    "companyname",
    "company",
    "organization",
    "account",
    "account name",
    "accountname",
  ],
  description: ["description", "notes", "details", "summary", "remarks"],
};

export function matchHeader(header: string): string | null {
  const h = header.toLowerCase().trim().replace(/[_-]/g, "");
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const normalizedAliases = aliases.map((a) => a.replace(/[_-]/g, ""));
    if (normalizedAliases.includes(h)) return field;
  }
  return null;
}

export function extractCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/['"]/g, ""));
  const rows = lines
    .slice(1)
    .map((l) => l.split(",").map((c) => c.trim().replace(/^["']|["']$/g, "")));
  return { headers, rows };
}

export async function extractExcel(
  buffer: ArrayBuffer,
): Promise<{ headers: string[]; rows: string[][] }> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: string[][] = [];
  for (let rowIdx = 2; rowIdx <= sheet.rowCount; rowIdx++) {
    const row = sheet.getRow(rowIdx);
    const cols: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cols[colNumber - 1] = String(cell.value ?? "").trim();
    });
    if (!cols.every((c) => !c)) rows.push(cols);
  }
  return { headers, rows };
}

interface DealsMappingStepProps {
  fileName: string;
  rawHeaders: string[];
  rawRows: string[][];
  fieldMappings: Record<number, string>;
  hasNameMapped: boolean;
  onMappingChange: (mappings: Record<number, string>) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function DealsMappingStep({
  fileName,
  rawHeaders,
  rawRows,
  fieldMappings,
  hasNameMapped,
  onMappingChange,
  onConfirm,
  onBack,
}: DealsMappingStepProps) {
  return (
    <CsvFieldMapper
      fields={DEAL_FIELDS}
      requiredFieldLabel="Deal Name"
      fileName={fileName}
      rawHeaders={rawHeaders}
      rawRows={rawRows}
      fieldMappings={fieldMappings}
      hasNameMapped={hasNameMapped}
      onMappingChange={onMappingChange}
      onConfirm={onConfirm}
      onBack={onBack}
    />
  );
}
