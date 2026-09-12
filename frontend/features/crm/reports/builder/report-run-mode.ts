import type {
  ReportingQueryDescription,
  RunReportDefinitionOverrides,
} from "@/types/crm/reporting";
import type { ReportBuilderValues } from "./report-builder-schema";
import { buildQueryDescription } from "./report-query-description";

/**
 * Which of the two run routes a click on "Run report" should take.
 *
 * `POST run` and `POST definitions/:id/run` compile and execute the same
 * statement, so this is not a performance choice — it is an audit one. The row
 * the saved route writes carries the definition id; the row the ad-hoc route
 * writes carries null. Sending an unmodified saved report down the ad-hoc path
 * would leave "how often is this report run, and by whom" permanently
 * unanswerable, and sending an *edited* one down the saved path would attribute
 * somebody's experiment to the report everyone else reads.
 *
 * So the rule is: the saved route iff what is on screen is still what is
 * stored. `limit` and `offset` are excluded from that comparison on purpose —
 * they are what `runDefinitionSchema` accepts as overrides, so paging a saved
 * report or asking it for more rows is the same report, not a new one.
 */

export type ReportRunRequest =
  | { readonly kind: "form"; readonly values: ReportBuilderValues }
  /** A stored report the builder cannot show, run exactly as it was saved. */
  | { readonly kind: "saved-as-is" };

export type ReportRunPlan =
  | { readonly kind: "idle" }
  | { readonly kind: "ad-hoc"; readonly description: ReportingQueryDescription }
  | {
      readonly kind: "saved";
      readonly reportDefinitionId: string;
      readonly overrides: RunReportDefinitionOverrides;
    };

/**
 * The description with paging normalised away, as a string.
 *
 * Both sides go through `buildQueryDescription`, so key order is a property of
 * that one function rather than of where the values came from — which is what
 * makes comparing the serialised form sound here and would not make it sound
 * against a description that arrived from the server.
 */
function shapeOf(values: ReportBuilderValues): string {
  return JSON.stringify(buildQueryDescription({ ...values, limit: 1, offset: 0 }));
}

export function planReportRun(args: {
  request: ReportRunRequest | null;
  reportDefinitionId: string | null;
  /** The stored description read back into form values, when it was representable. */
  savedValues: ReportBuilderValues | null;
  /** The stored description's own limit, used when it could not be read back. */
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
