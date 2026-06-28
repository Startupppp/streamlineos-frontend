"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  Handshake,
  Contact2,
  Building2,
  CreditCard,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportEntity {
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

const ENTITIES: ImportEntity[] = [
  {
    id: "leads",
    label: "Leads",
    icon: Contact2,
    description: "Import leads from CSV/XLSX. Auto-detect columns, assign to reps.",
    templateUrl: "/templates/leads-template.xlsx",
    importEndpoint: "/leads/import",
    exportEndpoint: "/leads/export",
    accent: "text-blue-600 bg-blue-500/10",
    supported: { import: true, export: true },
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    description: "Bulk import CRM contacts with phone, email, and organization.",
    importEndpoint: "/contacts/import",
    exportEndpoint: "/contacts/export",
    accent: "text-emerald-600 bg-emerald-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "deals",
    label: "Deals",
    icon: Handshake,
    description: "Export deal pipeline with stage, value, probability, close dates.",
    exportEndpoint: "/deals/export",
    accent: "text-amber-600 bg-amber-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "employees",
    label: "Employees",
    icon: Users,
    description: "Export employee directory with roles, departments, and contact info.",
    exportEndpoint: "/hr/employees/export",
    accent: "text-violet-600 bg-violet-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "payroll",
    label: "Payroll",
    icon: CreditCard,
    description: "Export payroll records with breakdown, deductions, and net pay.",
    exportEndpoint: "/hr/payroll/export",
    accent: "text-blue-600 bg-blue-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: FileSpreadsheet,
    description: "Export expense claims with status, category, and amounts.",
    exportEndpoint: "/hr/expenses/export",
    accent: "text-cyan-600 bg-cyan-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "clients",
    label: "Clients",
    icon: Building2,
    description: "Export client accounts with health score and activity data.",
    exportEndpoint: "/clients/export",
    accent: "text-rose-600 bg-rose-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "assets",
    label: "Assets",
    icon: Package,
    description: "Export asset inventory with assigned employees and status.",
    exportEndpoint: "/hr/assets/export",
    accent: "text-slate-600 bg-slate-500/10",
    supported: { import: false, export: true },
  },
];

interface UploadState {
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

function EntityCard({
  entity,
  upload,
  isExporting,
  onFileChange,
  onExport,
}: EntityCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = entity.icon;

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && entity.importEndpoint) {
        onFileChange(entity.id, entity.importEndpoint, file);
      }
      e.target.value = "";
    },
    [entity.id, entity.importEndpoint, onFileChange],
  );

  const handleExport = useCallback(() => {
    onExport(entity);
  }, [entity, onExport]);

  return (
    <motion.div variants={fadeUp}>
      <div className="h-full flex flex-col rounded-xl border border-border/70 bg-card shadow-noir p-4 gap-3">
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
                  onChange={handleFileChange}
                  aria-label={`Import ${entity.label}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={handleImportClick}
                  disabled={upload.status === "uploading"}
                >
                  {upload.status === "uploading" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
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
                  "text-xs h-8",
                  entity.supported.import ? "flex-1" : "w-full",
                )}
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
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

export default function DataHubPage() {
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>(
    {},
  );
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set());

  const setUploadState = useCallback(
    (id: string, state: Partial<UploadState>) => {
      setUploadStates((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] ?? { status: "idle", progress: 0, message: "" }),
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
          imported: number;
          skipped: number;
          errors: string[];
        }>(endpoint, formData);
        setUploadState(entityId, {
          status: "success",
          progress: 100,
          message: `Imported ${result.imported}${result.skipped > 0 ? ` · ${result.skipped} skipped` : ""}`,
        });
        toast.success(`${result.imported} records imported`);
        setTimeout(
          () =>
            setUploadState(entityId, {
              status: "idle",
              progress: 0,
              message: "",
            }),
          4000,
        );
      } catch {
        setUploadState(entityId, {
          status: "error",
          progress: 0,
          message: "Import failed. Check the file format.",
        });
        toast.error("Import failed");
        setTimeout(
          () =>
            setUploadState(entityId, {
              status: "idle",
              progress: 0,
              message: "",
            }),
          4000,
        );
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
      a.download = `${entity.id}-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${entity.label} export downloaded`);
    } catch {
      toast.error(`Failed to export ${entity.label}`);
    } finally {
      setExportingIds((prev) => {
        const n = new Set(prev);
        n.delete(entity.id);
        return n;
      });
    }
  }, []);

  return (
    <PageWrapper
      title="Data Import / Export Hub"
      subtitle="Centralized hub for importing data into and exporting data from the platform"
    >
      <motion.div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {ENTITIES.map((entity) => (
          <EntityCard
            key={entity.id}
            entity={entity}
            upload={
              uploadStates[entity.id] ?? {
                status: "idle",
                progress: 0,
                message: "",
              }
            }
            isExporting={exportingIds.has(entity.id)}
            onFileChange={handleFileChange}
            onExport={handleExport}
          />
        ))}
      </motion.div>
    </PageWrapper>
  );
}
