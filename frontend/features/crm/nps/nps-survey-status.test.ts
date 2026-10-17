import { nextSurveyStatus, npsSurveyUrl, surveyLinkNotice, surveyStatusBadge } from "./nps-survey-status";

describe("NPS survey lifecycle", () => {
  it("activates a draft, closes an active survey and reopens a closed one", () => {
    expect(nextSurveyStatus("draft")).toEqual({ status: "active", label: "Activate survey" });
    expect(nextSurveyStatus("active")).toEqual({ status: "closed", label: "Close survey" });
    expect(nextSurveyStatus("closed")).toEqual({ status: "active", label: "Reopen survey" });
  });

  it("warns that a non-active link collects nothing, and stays quiet for an active one", () => {
    expect(surveyLinkNotice("active")).toBeNull();
    expect(surveyLinkNotice("draft")).toMatch(/activate/i);
    expect(surveyLinkNotice("closed")).toMatch(/activate/i);
  });

  it("builds the public respondent link on the given origin", () => {
    expect(npsSurveyUrl("https://app.example.com", "tok/1")).toBe("https://app.example.com/nps/tok%2F1");
  });

  it("treats an unknown wire status as a draft", () => {
    expect(surveyStatusBadge("archived")).toEqual({ label: "Draft", tone: "neutral" });
    expect(surveyStatusBadge("active")).toEqual({ label: "Active", tone: "success" });
  });
});
