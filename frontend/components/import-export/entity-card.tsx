"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { DownloadIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { useMotionVariants } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

export interface ImportEntity {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  templateUrl?: string;
  exportEndpoint?: string;
  accent: string;
  supported: { import: boolean; export: boolean };
}

interface EntityCardProps {
  entity: ImportEntity;
  isExporting: boolean;
  onExport: (entity: ImportEntity) => void;
}

export function EntityCard({
  entity,
  isExporting,
  onExport,
}: EntityCardProps) {
  const { fadeUp } = useMotionVariants();
  const Icon = entity.icon;
  const { iconRef: downloadIconRef, hoverHandlers: downloadHoverHandlers } = useAnimatedIcon();

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
            <TruncatedText text={entity.label} className="text-sm font-semibold" />
          </div>
          <div className="flex gap-1 shrink-0">
            {entity.supported.import && (
              <Badge
                variant="secondary"
                className="text-micro px-1.5 h-5 font-medium uppercase tracking-wide"
              >
                Import
              </Badge>
            )}
            {entity.supported.export && (
              <Badge
                variant="outline"
                className="text-micro px-1.5 h-5 font-medium uppercase tracking-wide"
              >
                Export
              </Badge>
            )}
          </div>
        </div>

        <TruncatedText text={entity.description} lines={2} className="text-xs text-muted-foreground leading-snug" />

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex gap-2">
            {entity.supported.export && entity.exportEndpoint && (
              <LoadingButton
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 gap-1.5"
                onClick={handleExportClick}
                isPending={isExporting}
                {...downloadHoverHandlers}
              >
                {!isExporting && <DownloadIcon ref={downloadIconRef} size={14} />}
                Export
              </LoadingButton>
            )}
          </div>

          {entity.templateUrl && (
            <a
              href={entity.templateUrl}
              download
              className="text-micro text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
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
