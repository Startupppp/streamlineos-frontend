import { selectOnboardingQuestions } from "./constants";

describe("selectOnboardingQuestions", () => {
  it("shows at most two questions across a multi-module selection", () => {
    const result = selectOnboardingQuestions(["hr", "payroll", "build"]);

    expect(Object.values(result).flat()).toHaveLength(2);
  });

  it("shows at most one blocking question from any module", () => {
    const result = selectOnboardingQuestions(["hr", "crm"]);

    expect(result.hr?.map((question) => question.key)).toEqual(["employeeCount"]);
    expect(result.crm?.map((question) => question.key)).toEqual(["salesModel"]);
  });

  it("does not allocate questions to universal or unselected modules", () => {
    const result = selectOnboardingQuestions(["chat", "kb", "build"]);

    expect(result.chat).toBeUndefined();
    expect(result.kb).toBeUndefined();
    expect(result.build?.map((question) => question.key)).toEqual(["workType"]);
  });

  it("honors a zero question budget", () => {
    expect(selectOnboardingQuestions(["hr", "build"], 0)).toEqual({});
  });
});
