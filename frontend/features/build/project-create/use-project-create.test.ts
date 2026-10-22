import { resolveProjectCreateSteps } from "./use-project-create";

describe("resolveProjectCreateSteps", () => {
  it("omits Templates when none exist and never exposes the all-on Features step", () => {
    expect(resolveProjectCreateSteps(false).map((step) => step.id)).toEqual([
      "basics",
      "type",
      "workflow",
      "people",
      "review",
    ]);
  });

  it("adds Templates only when the workspace has a template to choose", () => {
    expect(resolveProjectCreateSteps(true).map((step) => step.id)).toEqual([
      "basics",
      "type",
      "template",
      "workflow",
      "people",
      "review",
    ]);
  });
});
