"use client";

import { useCallback } from "react";
import { ArrowRight, AlertCircle, ChevronLeft, FileText, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CRM_FIELDS: { value: string; label: string }[] = [
  { value: "_skip", label: "— Skip —" },
  { value: "name", label: "Name (required)" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "source", label: "Source" },
  { value: "notes", label: "Notes / Remarks" },
  { value: "city", label: "City / Location" },
  { value: "designation", label: "Designation / Title" },
  { value: "referredBy", label: "Referred By" },
  { value: "potentialValue", label: "Potential Value" },
  { value: "investmentInterest", label: "Investment Interest" },
  { value: "whatsappNumber", label: "WhatsApp Number" },
  { value: "website", label: "Website / URL" },
  { value: "priority", label: "Priority (HOT/WARM/COLD)" },
  { value: "tags", label: "Tags (comma-separated)" },
];

interface CsvFieldMapperProps {
  fields?: { value: string; label: string }[];
  requiredFieldLabel?: string;
  fileName: string;
  rawHeaders: string[];
  rawRows: string[][];
  fieldMappings: Record<number, string>;
  hasNameMapped: boolean;
  onMappingChange: (mappings: Record<number, string>) => void;
  onConfirm: () => void;
  onBack: () => void;
}

interface MappingRow {
  header: string;
  index: number;
  previewVal: string | undefined;
  currentMapping: string;
}

interface MappingSelectCellProps {
  row: MappingRow;
  fields: { value: string; label: string }[];
  onMappingChange: (idx: number, value: string) => void;
}

function MappingSelectCell({ row, fields, onMappingChange }: MappingSelectCellProps) {
  const handleChange = useCallback((v: string) => onMappingChange(row.index, v), [row.index, onMappingChange]);
  return (
    <Select value={row.currentMapping} onValueChange={handleChange}>
      <SelectTrigger className="text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {fields.map((f) => (
          <SelectItem key={f.value} value={f.value} className="text-xs">
            {f.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CsvFieldMapper({
  fields,
  requiredFieldLabel = "Name",
  fileName,
  rawHeaders,
  rawRows,
  fieldMappings,
  hasNameMapped,
  onMappingChange,
  onConfirm,
  onBack,
}: CsvFieldMapperProps) {
  const resolvedFields = fields ?? CRM_FIELDS;
  const handleSelectChange = useCallback((index: number, value: string) => {
    onMappingChange({ ...fieldMappings, [index]: value });
  }, [fieldMappings, onMappingChange]);

  const mappingRows: MappingRow[] = rawHeaders.map((header, i) => ({
    header,
    index: i,
    previewVal: rawRows[0]?.[i],
    currentMapping: fieldMappings[i] ?? "_skip",
  }));

  const columns: DataTableColumn<MappingRow>[] = [
    {
      key: "csvColumn",
      header: "CSV Column",
      headerClassName: "w-1/2",
      cell: (row) => (
        <span className="text-xs">
          <span className="font-medium">{row.header || `(column ${row.index + 1})`}</span>
          {row.previewVal && (
            <span className="block text-micro text-muted-foreground truncate max-w-[160px]">
              e.g. {row.previewVal}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "arrow",
      header: "",
      headerClassName: "w-8 text-center",
      className: "text-center text-muted-foreground px-1",
      cell: () => <ArrowRight className="h-3.5 w-3.5" />,
    },
    {
      key: "mapsTo",
      header: "Maps To CRM Field",
      cell: (row) => (
        <MappingSelectCell
          row={row}
          fields={resolvedFields}
          onMappingChange={handleSelectChange}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{fileName}</span>
          <Badge variant="secondary">{rawRows.length} rows detected</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <X className="h-4 w-4 mr-1" />
          Change File
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Review the auto-detected column mappings below. Adjust any that are
        incorrect or skip columns you don&apos;t need.
      </p>

      <DataTable
        data={mappingRows}
        columns={columns}
        getRowKey={(row) => row.index}
      />

      {!hasNameMapped && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-status-warning-surface border border-status-warning-rule">
          <AlertCircle className="h-4 w-4 text-status-warning-ink shrink-0" />
          <p className="text-xs text-status-warning-ink">
            Map at least one column to <strong>{requiredFieldLabel}</strong> to continue.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <Button
          className="flex-1 gap-1"
          disabled={!hasNameMapped}
          onClick={onConfirm}
        >
          Apply Mapping
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
