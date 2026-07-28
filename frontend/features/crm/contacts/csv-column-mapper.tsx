"use client";

import { useMemo } from "react";
import { CsvFieldMapper } from "@/features/crm/leads/csv-field-mapper";

const CONTACT_FIELDS: { value: string; label: string }[] = [
  { value: "_skip", label: "— Skip —" },
  { value: "first_name", label: "First Name (required)" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "title", label: "Job Title" },
  { value: "source", label: "Source" },
  { value: "notes", label: "Notes" },
];

interface CsvColumnMapperProps {
  fileName: string;
  rawHeaders: string[];
  rawRows: string[][];
  fieldMappings: Record<number, string>;
  onMappingChange: (mappings: Record<number, string>) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function CsvColumnMapper({
  fileName,
  rawHeaders,
  rawRows,
  fieldMappings,
  onMappingChange,
  onConfirm,
  onBack,
}: CsvColumnMapperProps) {
  const hasFirstNameMapped = useMemo(
    () => Object.values(fieldMappings).includes("first_name"),
    [fieldMappings],
  );

  return (
    <CsvFieldMapper
      fields={CONTACT_FIELDS}
      requiredFieldLabel="First Name"
      fileName={fileName}
      rawHeaders={rawHeaders}
      rawRows={rawRows}
      fieldMappings={fieldMappings}
      hasNameMapped={hasFirstNameMapped}
      onMappingChange={onMappingChange}
      onConfirm={onConfirm}
      onBack={onBack}
    />
  );
}
