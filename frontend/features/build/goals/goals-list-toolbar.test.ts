import { resolveGoalOutcomeParams } from "./goals-list-toolbar";

function readFrom(values: Record<string, string>) {
  return (param: string) => values[param] ?? "all";
}

describe("resolveGoalOutcomeParams", () => {
  it("forwards a supported key-result metric filter", () => {
    expect(
      resolveGoalOutcomeParams(readFrom({ metricType: "percentage" })),
    ).toEqual({ metricType: "percentage" });
  });

  it("drops unsupported metric and malformed due-date values", () => {
    expect(
      resolveGoalOutcomeParams(
        readFrom({ metricType: "duration", due: "10/09/2026" }),
      ),
    ).toEqual({});
  });
});
