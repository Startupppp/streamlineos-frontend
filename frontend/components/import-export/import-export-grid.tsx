"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { downloadExport } from "@/lib/download-export";
import { downloadExportJob } from "@/lib/download-export-job";
import { useMotionVariants } from "@/lib/motion-variants";
import { EntityCard, type ImportEntity } from "./entity-card";

interface ImportExportGridProps {
  entities: ImportEntity[];
}

export function ImportExportGrid({ entities }: ImportExportGridProps) {
  const { staggerContainer } = useMotionVariants();
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set());

  const handleExport = useCallback(async (entity: ImportEntity) => {
    if (!entity.exportEndpoint && !entity.exportJob) return;
    setExportingIds((prev) => new Set([...prev, entity.id]));
    const fallbackName = `${entity.id}-export-${new Date().toISOString().split("T")[0]}.csv`;
    try {
      // Was: fetch a blob and hand it to an anchor. An empty body and an error
      // page saved exactly like a real CSV, and both announced success — which
      // is how a 0-byte assets export read as a finished download twice.
      const { filename, bytes } = entity.exportJob
        ? await downloadExportJob({
            label: entity.label,
            fallbackName,
            routes: entity.exportJob,
            body: entity.exportJob.body,
            idempotencyKey: crypto.randomUUID(),
          })
        : await downloadExport(entity.exportEndpoint ?? "", {
            label: entity.label,
            fallbackName,
          });
      toast.success(`${entity.label} export downloaded`, {
        description: `${filename} · ${(bytes / 1024).toFixed(1)} KB`,
      });
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
          isExporting={exportingIds.has(entity.id)}
          onExport={handleExport}
        />
      ))}
    </motion.div>
  );
}
