"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateReportDefinition,
  useUpdateReportDefinition,
} from "@/hooks/api/crm/reporting";
import type { ReportDefinition } from "@/types/crm/reporting";
import type { ReportBuilderValues } from "./report-builder-schema";
import { buildQueryDescription } from "./report-query-description";
import type { SaveReportValues } from "./save-report-schema";

export function useSaveReport(args: {
  reportDefinitionId: string | null;
  onSaved: (saved: ReportDefinition) => void;
}) {
  const { reportDefinitionId, onSaved } = args;
  const queryClient = useQueryClient();
  const create = useCreateReportDefinition();
  const update = useUpdateReportDefinition();

  function handleSaved(saved: ReportDefinition, message: string) {
    queryClient.setQueryData(
      queryKeys.crm.reportingDefinition(saved.reportDefinitionId),
      saved,
    );
    toast.success(message);
    onSaved(saved);
  }

  function handleError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function save(builderValues: ReportBuilderValues, meta: SaveReportValues) {
    const query = buildQueryDescription({ ...builderValues, offset: 0 });
    const description = meta.description === "" ? null : meta.description;

    if (reportDefinitionId !== null) {
      update.mutate(
        { reportDefinitionId, name: meta.name, description, query },
        {
          onSuccess: (saved) => handleSaved(saved, `Saved changes to "${saved.name}"`),
          onError: handleError,
        },
      );
      return;
    }

    create.mutate(
      { name: meta.name, ...(description === null ? {} : { description }), query },
      {
        onSuccess: (saved) => handleSaved(saved, `Saved "${saved.name}"`),
        onError: handleError,
      },
    );
  }

  return { save, isSaving: create.isPending || update.isPending };
}
