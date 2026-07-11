"use client";

import { toast } from "sonner";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateHrTemplateVersion } from "@/hooks/api/hr/hr-templates";
import type { HrTemplate } from "@/types/hr/templates";
import { STATUS_LABELS } from "@/types/hr/templates";

interface TemplateVersionHistoryProps {
  template: HrTemplate;
  versions: HrTemplate[];
}

export function TemplateVersionHistory({ template, versions }: TemplateVersionHistoryProps) {
  const createVersion = useCreateHrTemplateVersion();

  function handleCreateVersion() {
    createVersion.mutate(template.id, {
      onSuccess: () => toast.success("New draft version created"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version History</p>
        {template.status === "active" && (
          <LoadingButton
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            isPending={createVersion.isPending}
            loadingText="Creating..."
            onClick={handleCreateVersion}
          >
            <GitBranch className="h-3 w-3" />
            New Version
          </LoadingButton>
        )}
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {versions.map((v) => (
          <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-muted-foreground">v{v.version}</span>
              <span className="text-[11px] text-muted-foreground">{STATUS_LABELS[v.status]}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {v.updatedAt ? new Date(v.updatedAt).toLocaleDateString() : ""}
            </span>
          </div>
        ))}
        {versions.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-3">No prior versions</p>
        )}
      </div>
    </div>
  );
}
