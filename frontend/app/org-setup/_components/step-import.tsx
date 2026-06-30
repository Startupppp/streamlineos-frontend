"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMPORT_TYPES } from "../_lib/constants";

type StepImportProps = {
  onBack: () => void;
  onNext: () => void;
};

export function StepImport({ onBack, onNext }: StepImportProps) {
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});

  const handleFileChange = useCallback(
    (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (![".csv", ".xlsx", ".xls"].includes(ext)) {
        setFileErrors((prev) => ({ ...prev, [id]: "CSV or Excel only" }));
        return;
      }
      setFileErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
      setSelectedFiles((prev) => ({ ...prev, [id]: file }));
    },
    [],
  );

  function handleContinue() {
    const count = Object.keys(selectedFiles).length;
    if (count > 0) {
      toast.success(`${count} import${count !== 1 ? "s" : ""} queued.`);
    }
    onNext();
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Import existing data. Files process in the background — continue now.
      </p>

      <div className="grid grid-cols-2 gap-1.5">
        {IMPORT_TYPES.map((type, i) => {
          const hasFile = !!selectedFiles[type.id];
          return (
            <motion.label
              key={type.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex flex-col gap-1.5 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                hasFile
                  ? "border-foreground bg-muted/40"
                  : "border-dashed border-border hover:border-foreground/30",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">{type.label}</span>
                {hasFile ? (
                  <FileCheck className="h-3.5 w-3.5 text-foreground" />
                ) : (
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              {hasFile ? (
                <span className="text-[11px] text-muted-foreground truncate">
                  {selectedFiles[type.id]?.name}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">CSV or Excel</span>
              )}
              {fileErrors[type.id] && (
                <span className="text-[11px] text-destructive">{fileErrors[type.id]}</span>
              )}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFileChange(type.id, e)}
                aria-label={`Upload ${type.label}`}
              />
            </motion.label>
          );
        })}
      </div>

      <div className="flex gap-1.5">
        <Button type="button" variant="outline" onClick={onBack} className="h-9 px-3 text-sm">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <Button type="button" variant="ghost" onClick={onNext} className="h-9 px-3 text-sm text-muted-foreground">
          Skip
        </Button>
        <Button type="button" onClick={handleContinue} className="flex-1 h-9 text-sm gap-1.5">
          Continue <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
