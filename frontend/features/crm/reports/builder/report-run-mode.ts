import type {
  ReportingQueryDescription,
  RunReportDefinitionOverrides,
} from "@/types/crm/reporting";
import type { ReportBuilderValues } from "./report-builder-schema";
import { buildQueryDescription } from "./report-query-description";


export type ReportRunRequest =
  | { readonly kind: "form"; readonly values: ReportBuilderValues }
  | { readonly kind: "saved-as-is" };

export type ReportRunPlan =
  | { readonly kind: "idle" }
  | { readonly kind: "ad-hoc"; readonly description: ReportingQueryDescription }
  | {
      readonly kind: "saved";
      readonly reportDefinitionId: string;
      readonly overrides: RunReportDefinitionOverrides;
    };

function shapeOf(values: ReportBuilderValues): string {
  return JSON.stringify(buildQueryDescription({ ...values, limit: 1, offset: 0 }));
}

export function planReportRun(args: {
  request: ReportRunRequest | null;
  reportDefinitionId: string | null;
  savedValues: ReportBuilderValues | null;
  savedLimit: number | null;
  offset: number;
}): ReportRunPlan {
  const { request, reportDefinitionId, savedValues, savedLimit, offset } = args;
  if (request === null) return { kind: "idle" };

  if (request.kind === "saved-as-is") {
    if (reportDefinitionId === null || savedLimit === null) return { kind: "idle" };
    return {
      kind: "saved",
      reportDefinitionId,
      overrides: { limit: savedLimit, offset },
    };
  }

  const { values } = request;
  const unchanged =
    reportDefinitionId !== null &&
    savedValues !== null &&
    shapeOf(values) === shapeOf(savedValues);

  if (unchanged)
    return {
      kind: "saved",
      reportDefinitionId,
      overrides: { limit: values.limit, offset },
    };

  return { kind: "ad-hoc", description: buildQueryDescription({ ...values, offset }) };
}
