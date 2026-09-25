"use client";

import { useState, useCallback } from "react";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { ImportExportGrid } from "@/components/import-export/import-export-grid";
import { HR_IMPORT_EXPORT_ENTITIES } from "@/features/hr/settings/import-export-entities";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Users, BarChart2, Package, FileText, Briefcase } from "lucide-react";
import { UploadIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { type HrImportEntity } from "@/hooks/api/hr/import-export";
import { ImportWizardSheet } from "./import-wizard-sheet";
import { JobHistoryTable } from "./job-history-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";

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
    accent: "bg-status-info-surface text-status-info-ink",
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
    accent: "bg-status-success-surface text-status-success-ink",
    Icon: Briefcase,
  },
  {
    id: "assets",
    label: "Assets",
    description: "Import asset inventory and assignments",
    columns: ["name", "type", "brand", "model", "serialNumber", "assignedToEmail"],
    accent: "bg-muted text-muted-foreground",
    Icon: Package,
  },
  {
    id: "document_metadata",
    label: "Documents",
    description: "Import document metadata with file URLs",
    columns: ["employeeEmail", "name", "type", "fileUrl", "category"],
    accent: "bg-status-warning-surface text-status-warning-ink",
    Icon: FileText,
  },
];

interface ImportCardProps {
  config: ImportEntityConfig;
  onImport: (entity: HrImportEntity) => void;
}

function ImportCard({ config, onImport }: ImportCardProps) {
  const handleClick = useCallback(() => {
    onImport(config.id);
  }, [config.id, onImport]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/90 shadow-card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
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
          className="text-micro px-1.5 h-5 font-medium uppercase tracking-wide shrink-0"
        >
          Import
        </Badge>
      </div>
      <TruncatedText text={config.description} lines={2} className="text-xs text-muted-foreground leading-snug" />
      <div className="mt-auto">
        <AnimatedIconButton
          icon={UploadIcon}
          iconSize={14}
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleClick}
        >
          Import CSV
        </AnimatedIconButton>
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

  // FE-44/45: the route admits either key, so each section is gated on the
  // exact key its endpoint enforces — hr:import:manage for /hr/import/jobs,
  // hr:export:manage for GET /hr/export/:entity, hr:expenses:read for the
  // expenses export job.
  const canImport = useCan("hr:import:manage");
  const canExport = useCan("hr:export:manage");
  const canExportExpenses = useCan("hr:expenses:read");
  const exportEntities = HR_IMPORT_EXPORT_ENTITIES.filter((entity) =>
    entity.id === "expenses" ? canExportExpenses : canExport,
  );

  return (
    <>
      <PageWrapper
        title="Import / Export"
        subtitle="Bulk manage HR data with CSV imports and exports"
      >
        <div className="space-y-8">
          {exportEntities.length > 0 && (
            <PageSection title="Export Data" description="Download HR data as Excel files">
              <ImportExportGrid entities={exportEntities} />
            </PageSection>
          )}

          {canImport && (
            <>
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
            </>
          )}
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
