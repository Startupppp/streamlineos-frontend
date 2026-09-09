import { planReportRun } from "./report-run-mode";
import {
  DEFAULT_REPORT_BUILDER_VALUES,
  NO_AGGREGATE,
  type ReportBuilderValues,
} from "./report-builder-schema";

/**
 * Which run route a click takes is an audit decision, not a routing detail, so
 * it is pinned here rather than left to a component test to notice.
 */

const saved: ReportBuilderValues = {
  ...DEFAULT_REPORT_BUILDER_VALUES,
  source: "deals",
  select: [{ aggregate: NO_AGGREGATE, field: "name", fieldType: "text" }],
  limit: 100,
};

describe("planReportRun", () => {
  it("does nothing until something has been asked", () => {
    expect(
      planReportRun({
        request: null,
        reportDefinitionId: "def-1",
        savedValues: saved,
        savedLimit: 100,
        offset: 0,
      }),
    ).toEqual({ kind: "idle" });
  });

  it("runs ad hoc when no report is open", () => {
    const plan = planReportRun({
      request: { kind: "form", values: saved },
      reportDefinitionId: null,
      savedValues: null,
      savedLimit: null,
      offset: 0,
    });

    expect(plan.kind).toBe("ad-hoc");
    expect(plan.kind === "ad-hoc" ? plan.description.source : null).toBe("deals");
  });

  it("runs a saved report by its id while it is unchanged", () => {
    const plan = planReportRun({
      request: { kind: "form", values: saved },
      reportDefinitionId: "def-1",
      savedValues: saved,
      savedLimit: 100,
      offset: 0,
    });

    expect(plan).toEqual({
      kind: "saved",
      reportDefinitionId: "def-1",
      overrides: { limit: 100, offset: 0 },
    });
  });

  it("keeps the saved route across paging and a changed row count", () => {
    /**
     * Both are overrides on `runDefinitionSchema`, so neither makes this a
     * different report. If either were treated as an edit, every second page of
     * a saved report would be filed in the audit log as an ad-hoc query.
     */
    const plan = planReportRun({
      request: { kind: "form", values: { ...saved, limit: 250 } },
      reportDefinitionId: "def-1",
      savedValues: saved,
      savedLimit: 100,
      offset: 500,
    });

    expect(plan).toEqual({
      kind: "saved",
      reportDefinitionId: "def-1",
      overrides: { limit: 250, offset: 500 },
    });
  });

  it("falls back to ad hoc the moment the question itself is edited", () => {
    /**
     * The other half of the same rule: attributing somebody's experiment to the
     * saved report would make the run log say the shared report returned
     * numbers it never returned.
     */
    const edited: ReportBuilderValues = {
      ...saved,
      filters: [
        {
          field: "stage",
          fieldType: "enum",
          operator: "eq",
          value: "won",
          values: "",
          from: "",
          to: "",
        },
      ],
    };

    const plan = planReportRun({
      request: { kind: "form", values: edited },
      reportDefinitionId: "def-1",
      savedValues: saved,
      savedLimit: 100,
      offset: 0,
    });

    expect(plan.kind).toBe("ad-hoc");
  });

  it("runs a report the builder cannot show through its own id", () => {
    const plan = planReportRun({
      request: { kind: "saved-as-is" },
      reportDefinitionId: "def-1",
      savedValues: null,
      savedLimit: 40,
      offset: 80,
    });

    expect(plan).toEqual({
      kind: "saved",
      reportDefinitionId: "def-1",
      overrides: { limit: 40, offset: 80 },
    });
  });

  it("refuses to run as saved when nothing is open to run", () => {
    expect(
      planReportRun({
        request: { kind: "saved-as-is" },
        reportDefinitionId: null,
        savedValues: null,
        savedLimit: null,
        offset: 0,
      }),
    ).toEqual({ kind: "idle" });
  });
});
