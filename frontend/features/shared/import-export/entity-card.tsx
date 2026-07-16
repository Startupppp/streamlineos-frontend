"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { UploadIcon, DownloadIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

export interface ImportEntity {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  templateUrl?: string;
  importEndpoint?: string;
  exportEndpoint?: string;
  accent: string;
  supported: { import: boolean; export: boolean };
}

export interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  message: string;
}

interface EntityCardProps {
  entity: ImportEntity;
  upload: UploadState;
  isExporting: boolean;
  onFileChange: (entityId: string, endpoint: string, file: File) => void;
  onExport: (entity: ImportEntity) => void;
}

export function EntityCard({
  entity,
  upload,
  isExporting,
  onFileChange,
  onExport,
}: EntityCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = entity.icon;
  const { iconRef: uploadIconRef, hoverHandlers: uploadHoverHandlers } = useAnimatedIcon();
  const { iconRef: downloadIconRef, hoverHandlers: downloadHoverHandlers } = useAnimatedIcon();

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && entity.importEndpoint) {
        onFileChange(entity.id, entity.importEndpoint, file);
      }
      e.target.value = "";
    },
    [entity.id, entity.importEndpoint, onFileChange],
  );

  const handleExportClick = useCallback(() => {
    onExport(entity);
  }, [entity, onExport]);

  return (
    <motion.div variants={fadeUp}>
      <div className="h-full flex flex-col rounded-lg border border-border/70 bg-card shadow-noir p-4 gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                "h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0",
                entity.accent,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold truncate">{entity.label}</h3>
          </div>
          <div className="flex gap-1 shrink-0">
            {entity.supported.import && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 h-5 font-medium uppercase tracking-wide"
              >
                Import
              </Badge>
            )}
            {entity.supported.export && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 h-5 font-medium uppercase tracking-wide"
              >
                Export
              </Badge>
            )}
          </div>
        </div>

        <p className="text-[12px] text-muted-foreground leading-snug line-clamp-2">
          {entity.description}
        </p>

        {upload.status !== "idle" && (
          <div className="space-y-1">
            {upload.status === "uploading" && (
              <Progress value={upload.progress} className="h-1" />
            )}
            <div
              className={cn(
                "flex items-center gap-1.5 text-[11px]",
                upload.status === "success"
                  ? "text-emerald-600"
                  : upload.status === "error"
                    ? "text-red-600"
                    : "text-muted-foreground",
              )}
            >
              {upload.status === "uploading" && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {upload.status === "success" && (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {upload.status === "error" && (
                <AlertCircle className="h-3 w-3" />
              )}
              {upload.message}
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex gap-2">
            {entity.supported.import && entity.importEndpoint && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInputChange}
                  aria-label={`Import ${entity.label}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8 gap-1.5"
                  onClick={handleImportClick}
                  disabled={upload.status === "uploading"}
                  {...uploadHoverHandlers}
                >
                  {upload.status === "uploading" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadIcon ref={uploadIconRef} size={14} />
                  )}
                  Import
                </Button>
              </>
            )}
            {entity.supported.export && entity.exportEndpoint && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs h-8 gap-1.5",
                  entity.supported.import ? "flex-1" : "w-full",
                )}
                onClick={handleExportClick}
                disabled={isExporting}
                {...downloadHoverHandlers}
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <DownloadIcon ref={downloadIconRef} size={14} />
                )}
                Export
              </Button>
            )}
          </div>

          {entity.templateUrl && (
            <a
              href={entity.templateUrl}
              download
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <FileSpreadsheet className="h-3 w-3" />
              Download template
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
