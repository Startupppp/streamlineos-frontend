"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { staggerContainer } from "@/lib/motion-variants";
import { EntityCard, type ImportEntity, type UploadState } from "./entity-card";

const DEFAULT_UPLOAD_STATE: UploadState = {
  status: "idle",
  progress: 0,
  message: "",
};

interface ImportExportGridProps {
  entities: ImportEntity[];
}

export function ImportExportGrid({ entities }: ImportExportGridProps) {
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>(
    {},
  );
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set());

  const setUploadState = useCallback(
    (id: string, state: Partial<UploadState>) => {
      setUploadStates((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? DEFAULT_UPLOAD_STATE),
          ...state,
        },
      }));
    },
    [],
  );

  const handleFileChange = useCallback(
    async (entityId: string, endpoint: string, file: File) => {
      setUploadState(entityId, {
        status: "uploading",
        progress: 10,
        message: "Uploading…",
      });

      const formData = new FormData();
      formData.append("file", file);

      try {
        setUploadState(entityId, { progress: 40 });
        const result = await apiClient.upload<{
          imported?: number;
          skipped?: number;
          created?: number;
          failed?: number;
          errors?: string[];
        }>(endpoint, formData);
        const imported = result.imported ?? result.created ?? 0;
        const skipped = result.skipped ?? result.failed ?? 0;
        setUploadState(entityId, {
          status: "success",
          progress: 100,
          message: `Imported ${imported}${skipped > 0 ? ` · ${skipped} skipped` : ""}`,
        });
        toast.success(`${imported} records imported`);
        setTimeout(() => setUploadState(entityId, DEFAULT_UPLOAD_STATE), 4000);
      } catch (err) {
        const message = getErrorMessage(err);
        setUploadState(entityId, {
          status: "error",
          progress: 0,
          message: message || "Import failed. Check the file format.",
        });
        toast.error(message || "Import failed");
        setTimeout(() => setUploadState(entityId, DEFAULT_UPLOAD_STATE), 4000);
      }
    },
    [setUploadState],
  );

  const handleExport = useCallback(async (entity: ImportEntity) => {
    if (!entity.exportEndpoint) return;
    setExportingIds((prev) => new Set([...prev, entity.id]));
    try {
      const blob = await apiClient.download(entity.exportEndpoint);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity.id}-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${entity.label} export downloaded`);
    } catch (err) {
      toast.error(getErrorMessage(err) || `Failed to export ${entity.label}`);
    } finally {
      setExportingIds((prev) => {
        const next = new Set(prev);
        next.delete(entity.id);
        return next;
      });
    }
  }, []);

  return (
    <motion.div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {entities.map((entity) => (
        <EntityCard
          key={entity.id}
          entity={entity}
          upload={uploadStates[entity.id] ?? DEFAULT_UPLOAD_STATE}
          isExporting={exportingIds.has(entity.id)}
          onFileChange={handleFileChange}
          onExport={handleExport}
        />
      ))}
    </motion.div>
  );
}
