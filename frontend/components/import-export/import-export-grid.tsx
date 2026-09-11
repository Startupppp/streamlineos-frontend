"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMotionVariants } from "@/lib/motion-variants";
import { EntityCard, type ImportEntity } from "./entity-card";

interface ImportExportGridProps {
  entities: ImportEntity[];
}

export function ImportExportGrid({ entities }: ImportExportGridProps) {
  const { staggerContainer } = useMotionVariants();
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set());

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
          isExporting={exportingIds.has(entity.id)}
          onExport={handleExport}
        />
      ))}
    </motion.div>
  );
}
