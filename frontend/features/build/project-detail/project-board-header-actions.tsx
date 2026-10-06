"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Clock3, Download, Plus, Sparkles } from "lucide-react";
import {
  BuildHeaderActions,
  type BuildHeaderAction,
} from "@/features/build/shared/build-header-actions";
import { CreateTicketDialog } from "@/features/build/tickets/create-ticket-dialog";
import { ProjectAiMenu } from "@/features/build/ai/project-ai-menu";
import { TicketImportExportDialog } from "@/features/build/import-export/components/ticket-import-export-dialog";
import { useCan } from "@/hooks/api/access";

interface ProjectBoardHeaderActionsProps {
  projectId: number;
  createDefaultCycleId?: number | null;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

export function ProjectBoardHeaderActions({
  projectId,
  createDefaultCycleId,
  createOpen,
  onCreateOpenChange,
}: ProjectBoardHeaderActionsProps) {
  const canCreate = useCan("build:tickets:create");
  const canUseAI = useCan("build:ai:use");
  const canImport = useCan("build:tickets:create");
  const canExport = useCan("build:tickets:view");
  const summarizeFnRef = useRef<(() => void) | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const registerSummarize = useCallback((run: (() => void) | null) => {
    summarizeFnRef.current = run;
  }, []);

  const handleCreate = useCallback(() => {
    onCreateOpenChange(true);
  }, [onCreateOpenChange]);

  const handleSummarize = useCallback(() => {
    summarizeFnRef.current?.();
  }, []);

  const handleImportExport = useCallback(() => {
    setImportOpen(true);
  }, []);

  const handleImportOpenChange = useCallback((open: boolean) => {
    setImportOpen(open);
  }, []);

  /* Summarize onSelect reads summarizeFnRef only on click, never during render. */
  /* eslint-disable react-hooks/refs */
  const actions = useMemo(() => {
    const next: BuildHeaderAction[] = [
      {
        id: "log-time",
        label: "Log time",
        icon: Clock3,
        href: `/timesheets?projectId=${projectId}`,
      },
    ];
    if (canUseAI) {
      next.push({
        id: "summarize",
        label: "Summarize",
        icon: Sparkles,
        onSelect: handleSummarize,
      });
    }
    if (canImport || canExport) {
      next.push({
        id: "import-export",
        label: canImport ? "Import / Export" : "Export",
        icon: Download,
        onSelect: handleImportExport,
      });
    }
    if (canCreate) {
      next.push({
        id: "create",
        label: "Create Issue",
        icon: Plus,
        primary: true,
        onSelect: handleCreate,
      });
    }
    return next;
  }, [
    projectId,
    canUseAI,
    canImport,
    canExport,
    canCreate,
    handleSummarize,
    handleImportExport,
    handleCreate,
  ]);
  /* eslint-enable react-hooks/refs */

  return (
    <>
      <BuildHeaderActions actions={actions} />
      {canCreate || createOpen ? (
        <CreateTicketDialog
          projectId={projectId}
          defaultCycleId={createDefaultCycleId ?? undefined}
          hideTrigger
          externalOpen={createOpen}
          onExternalOpenChange={onCreateOpenChange}
        />
      ) : null}
      {canUseAI ? (
        <ProjectAiMenu
          projectId={projectId}
          hideTrigger
          onRunRegister={registerSummarize}
        />
      ) : null}
      {canImport || canExport ? (
        <TicketImportExportDialog
          projectId={projectId}
          hideTrigger
          open={importOpen}
          onOpenChange={handleImportOpenChange}
        />
      ) : null}
    </>
  );
}
