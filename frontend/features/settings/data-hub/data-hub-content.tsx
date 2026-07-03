"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { staggerContainer } from "@/lib/motion-variants";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { isModuleEnabled } from "@/components/layout/sidebar/sidebar-nav-items";
import { EntityCard } from "./entity-card";
import type { ImportEntity, UploadState } from "./entity-card";
import { MODULE_GROUPS, VALID_TAB_IDS } from "./entities";

const DEFAULT_UPLOAD_STATE: UploadState = {
  status: "idle",
  progress: 0,
  message: "",
};

interface DataHubContentProps {
  defaultModule: string | null;
}

export function DataHubContent({ defaultModule }: DataHubContentProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const enabledModules = session?.enabledModules ?? [];

  const enabledGroups = useMemo(
    () =>
      MODULE_GROUPS.filter((g) => isModuleEnabled(g.moduleKey, enabledModules)),
    [enabledModules],
  );

  const activeTab = useMemo(() => {
    const validated =
      defaultModule !== null && VALID_TAB_IDS.includes(defaultModule)
        ? defaultModule
        : null;
    if (validated && enabledGroups.some((g) => g.tabId === validated)) {
      return validated;
    }
    return enabledGroups[0]?.tabId ?? VALID_TAB_IDS[0];
  }, [defaultModule, enabledGroups]);

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

  const handleTabChange = useCallback(
    (value: string) => {
      router.replace(`/settings/data-hub?module=${value}`);
    },
    [router],
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
        setTimeout(() => setUploadState(entityId, DEFAULT_UPLOAD_STATE), 4000);
      } catch {
        setUploadState(entityId, {
          status: "error",
          progress: 0,
          message: "Import failed. Check the file format.",
        });
        toast.error("Import failed");
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
      a.download = `${entity.id}-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${entity.label} export downloaded`);
    } catch {
      toast.error(`Failed to export ${entity.label}`);
    } finally {
      setExportingIds((prev) => {
        const next = new Set(prev);
        next.delete(entity.id);
        return next;
      });
    }
  }, []);

  if (enabledGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[40vh] gap-4 py-16">
        <Building2 className="h-10 w-10 text-muted-foreground/40" />
        <div className="text-center">
          <p className="font-semibold text-foreground">No modules enabled</p>
          <p className="text-sm text-muted-foreground mt-1">
            Enable at least one module to import or export data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="mb-4">
        {enabledGroups.map((group) => (
          <TabsTrigger key={group.tabId} value={group.tabId}>
            {group.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {enabledGroups.map((group) => (
        <TabsContent key={group.tabId} value={group.tabId}>
          <motion.div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {group.entities.map((entity) => (
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
        </TabsContent>
      ))}
    </Tabs>
  );
}
