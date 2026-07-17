"use client";

import { useState, useCallback } from "react";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { ImportExportGrid } from "@/features/shared/import-export/import-export-grid";
import { HR_IMPORT_EXPORT_ENTITIES } from "@/features/hr/settings/import-export-entities";
import { Badge } from "@/components/ui/badge";
import { Users, BarChart2, Package, FileText, Briefcase } from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { type HrImportEntity } from "@/hooks/api/hr/import-export";
import { ImportWizardSheet } from "./import-wizard-sheet";
import { JobHistoryTable } from "./job-history-table";
import { TruncatedText } from "@/components/ui/truncated-text";

interface ImportEntityConfig {
  id: HrImportEntity;
  label: string;
  description: string;
  columns: string[];
  accent: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const IMPORT_ENTITIES: ImportEntityConfig[] = [
  {
    id: "employees",
    label: "Employees",
    description: "Import employee records with departments and roles",
    columns: ["email", "firstName", "lastName", "joiningDate", "departmentName", "designation", "employeeNumber"],
    accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Icon: Users,
  },
  {
    id: "leave_balances",
    label: "Leave Balances",
    description: "Set leave balances per employee and leave type",
    columns: ["employeeEmail", "leaveTypeName", "balance", "year"],
    accent: "bg-primary/10 text-primary",
    Icon: BarChart2,
  },
  {
    id: "attendance",
    label: "Attendance",
    description: "Import historical attendance records",
    columns: ["employeeEmail", "date", "checkIn", "checkOut", "status"],
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Icon: Briefcase,
  },
  {
    id: "assets",
    label: "Assets",
    description: "Import asset inventory and assignments",
    columns: ["name", "type", "brand", "model", "serialNumber", "assignedToEmail"],
    accent: "bg-slate-500/10 text-muted-foreground",
    Icon: Package,
  },
  {
    id: "document_metadata",
    label: "Documents",
    description: "Import document metadata with file URLs",
    columns: ["employeeEmail", "name", "type", "fileUrl", "category"],
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Icon: FileText,
  },
];

interface ImportCardProps {
  config: ImportEntityConfig;
  onImport: (entity: HrImportEntity) => void;
}

function ImportCard({ config, onImport }: ImportCardProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleClick = useCallback(() => {
    onImport(config.id);
  }, [config.id, onImport]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.12)] p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0",
              config.accent,
            )}
          >
            <config.Icon className="h-4 w-4" />
          </span>
          <TruncatedText text={config.label} className="text-sm font-semibold" />
        </div>
        <Badge
          variant="secondary"
          className="text-[9px] px-1.5 h-5 font-medium uppercase tracking-wide shrink-0"
        >
          Import
        </Badge>
      </div>
      <TruncatedText text={config.description} lines={2} className="text-[12px] text-muted-foreground leading-snug" />
      <div className="mt-auto">
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
          {...hoverHandlers}
        >
          <UploadIcon ref={iconRef} size={14} />
          Import CSV
        </button>
      </div>
    </div>
  );
}

export function ImportExportPage() {
  const [openEntity, setOpenEntity] = useState<HrImportEntity | null>(null);

  const handleImport = useCallback((entity: HrImportEntity) => {
    setOpenEntity(entity);
  }, []);

  const handleWizardOpenChange = useCallback((open: boolean) => {
    if (!open) setOpenEntity(null);
  }, []);

  const activeConfig = IMPORT_ENTITIES.find((e) => e.id === openEntity);

  return (
    <>
      <PageWrapper
        title="Import / Export"
        subtitle="Bulk manage HR data with CSV imports and exports"
      >
        <div className="space-y-8">
          <PageSection title="Export Data" description="Download HR data as Excel files">
            <ImportExportGrid entities={HR_IMPORT_EXPORT_ENTITIES} />
          </PageSection>

          <PageSection title="Import Data" description="Upload CSV files to create or update records">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {IMPORT_ENTITIES.map((config) => (
                <ImportCard
                  key={config.id}
                  config={config}
                  onImport={handleImport}
                />
              ))}
            </div>
          </PageSection>

          <PageSection title="Import History" description="Past import jobs and their results">
            <JobHistoryTable />
          </PageSection>
        </div>
      </PageWrapper>

      {openEntity && activeConfig && (
        <ImportWizardSheet
          open
          onOpenChange={handleWizardOpenChange}
          entity={openEntity}
          entityLabel={activeConfig.label}
          columns={activeConfig.columns}
        />
      )}
    </>
  );
}
