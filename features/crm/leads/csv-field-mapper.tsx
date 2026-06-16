"use client";

import { ArrowRight, AlertCircle, ChevronLeft, FileText, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  fileName: string;
  rawHeaders: string[];
  rawRows: string[][];
  fieldMappings: Record<number, string>;
  hasNameMapped: boolean;
  onMappingChange: (mappings: Record<number, string>) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function CsvFieldMapper({
  fileName,
  rawHeaders,
  rawRows,
  fieldMappings,
  hasNameMapped,
  onMappingChange,
  onConfirm,
  onBack,
}: CsvFieldMapperProps) {
  const handleSelectChange = (index: number, value: string) => {
    onMappingChange({ ...fieldMappings, [index]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
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

      <ScrollArea className="max-h-[320px] border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-1/2">CSV Column</TableHead>
              <TableHead className="text-xs w-8 text-center"></TableHead>
              <TableHead className="text-xs">Maps To CRM Field</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawHeaders.map((header, i) => {
              const previewVal = rawRows[0]?.[i];
              return (
                <TableRow key={i}>
                  <TableCell className="text-xs">
                    <span className="font-medium">
                      {header || `(column ${i + 1})`}
                    </span>
                    {previewVal && (
                      <span className="block text-[10px] text-muted-foreground truncate max-w-[160px]">
                        e.g. {previewVal}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground px-1">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={fieldMappings[i] ?? "_skip"}
                      onValueChange={(v) => handleSelectChange(i, v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CRM_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value} className="text-xs">
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {!hasNameMapped && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Map at least one column to <strong>Name</strong> to continue.
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
