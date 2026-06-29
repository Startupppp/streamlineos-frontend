"use client";

import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { Upload, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DataType = "customers" | "employees" | "inventory" | "projects";

interface DataTypeConfig {
  label: string;
  requiredFields: string[];
}

const DATA_TYPES: Record<DataType, DataTypeConfig> = {
  customers: { label: "Customers", requiredFields: ["name", "email"] },
  employees: { label: "Employees", requiredFields: ["firstName", "lastName", "email"] },
  inventory: { label: "Inventory", requiredFields: ["productName", "sku", "quantity"] },
  projects: { label: "Projects", requiredFields: ["name", "description"] },
};

interface ParsedFile {
  headers: string[];
  preview: string[][];
  rowCount: number;
}

interface ColumnMapping {
  [requiredField: string]: string;
}

interface TypeState {
  parsed: ParsedFile | null;
  mapping: ColumnMapping;
  imported: boolean;
}

interface ImportStepProps {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

function DropZone({
  onFile,
  isActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onClick,
}: {
  onFile: (file: File) => void;
  isActive: boolean;
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
        isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
      aria-label="Drop CSV file here or click to browse"
    >
      <Upload className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
      <div className="text-center">
        <p className="text-sm font-medium">Drop CSV here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-0.5">CSV files only · max 10 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={handleInputChange}
      />
    </div>
  );
}

export function ImportStep({ onNext, onSkip, onBack }: ImportStepProps) {
  const [activeType, setActiveType] = useState<DataType>("customers");
  const [states, setStates] = useState<Record<DataType, TypeState>>({
    customers: { parsed: null, mapping: {}, imported: false },
    employees: { parsed: null, mapping: {}, imported: false },
    inventory: { parsed: null, mapping: {}, imported: false },
    projects: { parsed: null, mapping: {}, imported: false },
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = DATA_TYPES[activeType];
  const currentState = states[activeType];

  function handleFile(file: File) {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      preview: 4,
      complete: (result) => {
        if (result.data.length < 1) {
          toast.error("CSV appears to be empty");
          return;
        }
        const headers = result.data[0] as string[];
        const preview = (result.data.slice(1) as string[][]).slice(0, 3);
        const defaultMapping: ColumnMapping = {};
        config.requiredFields.forEach((field) => {
          const match = headers.find(
            (h) => h.toLowerCase().replace(/\s+/g, "") === field.toLowerCase(),
          );
          if (match) defaultMapping[field] = match;
        });
        setStates((prev) => ({
          ...prev,
          [activeType]: {
            parsed: { headers, preview, rowCount: 0 },
            mapping: defaultMapping,
            imported: false,
          },
        }));
        toast.success("CSV loaded. Please verify column mapping.");
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
  }

  function handleDropZoneClick() {
    fileInputRef.current?.click();
  }

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleMappingChange(field: string, column: string) {
    setStates((prev) => ({
      ...prev,
      [activeType]: {
        ...prev[activeType],
        mapping: { ...prev[activeType].mapping, [field]: column },
      },
    }));
  }

  function handleImport() {
    setStates((prev) => ({
      ...prev,
      [activeType]: { ...prev[activeType], imported: true },
    }));
    toast.success(`${config.label} imported successfully`);
  }

  function handleClearFile() {
    setStates((prev) => ({
      ...prev,
      [activeType]: { parsed: null, mapping: {}, imported: false },
    }));
  }

  const importedCount = Object.values(states).filter((s) => s.imported).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">Import your data</h2>
        <p className="text-sm text-muted-foreground">
          Upload CSV files to import existing data. All imports are optional.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(Object.keys(DATA_TYPES) as DataType[]).map((type) => {
          const isImported = states[type].imported;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                activeType === type
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {isImported && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
              {DATA_TYPES[type].label}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {currentState.imported ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{config.label} imported</p>
              <p className="text-sm text-muted-foreground mt-0.5">Data has been queued for import.</p>
            </div>
          </div>
        ) : currentState.parsed ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Map CSV columns to fields</p>
              <button
                type="button"
                onClick={handleClearFile}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>

            <div className="rounded-xl border divide-y overflow-hidden">
              {config.requiredFields.map((field) => (
                <div key={field} className="flex items-center gap-3 px-4 py-2.5 bg-card">
                  <span className="text-sm font-medium min-w-[100px] text-muted-foreground">
                    {field}
                  </span>
                  <Select
                    value={currentState.mapping[field] ?? ""}
                    onValueChange={(v) => handleMappingChange(field, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column…" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentState.parsed.headers.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {currentState.parsed.preview.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Preview (first 3 rows)</p>
                <div className="rounded-lg border overflow-hidden text-xs">
                  <div className="bg-muted/50 px-3 py-1.5 flex gap-4 font-medium">
                    {currentState.parsed.headers.slice(0, 3).map((h) => (
                      <span key={h} className="min-w-[80px]">{h}</span>
                    ))}
                  </div>
                  {currentState.parsed.preview.map((row, i) => (
                    <div key={i} className="px-3 py-1.5 flex gap-4 border-t">
                      {row.slice(0, 3).map((cell, j) => (
                        <span key={j} className="min-w-[80px] text-muted-foreground truncate max-w-[120px]">
                          {cell}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleImport} className="w-full">
              Import {config.label}
            </Button>
          </div>
        ) : (
          <>
            <DropZone
              onFile={handleFile}
              isActive={isDragging}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleDropZoneClick}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileInputChange}
              aria-hidden
            />
          </>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button variant="ghost" onClick={onSkip} className="flex-1">
          Skip All
        </Button>
        <Button onClick={onNext} className="flex-1">
          {importedCount > 0 ? `Continue (${importedCount} imported)` : "Continue"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
