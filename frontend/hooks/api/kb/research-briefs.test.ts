import {
  RESEARCH_BRIEF_POLL_MS,
  researchBriefPollInterval,
} from "./research-briefs";
import type { KbResearchBrief } from "@/types/kb";

const ALL_STATUSES: KbResearchBrief["status"][] = [
  "queued",
  "running",
  "completed",
  "failed",
];

describe("researchBriefPollInterval — a brief that outlives the browser session resumes polling when the page is reopened", () => {
  it("polls for a brief still queued, so reopening the page while the job has not started picks the work back up instead of showing a permanently stale queued state", () => {
    expect(researchBriefPollInterval("queued")).toBe(RESEARCH_BRIEF_POLL_MS);
  });

  it("polls for a brief still running, which is the state a reopened page lands in when the job outlived the closed browser", () => {
    expect(researchBriefPollInterval("running")).toBe(RESEARCH_BRIEF_POLL_MS);
  });

  it("stops polling once the brief completed, so a finished brief recovered on reopen does not keep issuing requests forever", () => {
    expect(researchBriefPollInterval("completed")).toBe(false);
  });

  it("stops polling once the brief failed, because a failed job will not change state on its own and polling it is a retry storm with no retry", () => {
    expect(researchBriefPollInterval("failed")).toBe(false);
  });

  it("does not poll before any status is known, so a request that never resolves cannot turn into an unbounded three-second retry loop", () => {
    expect(researchBriefPollInterval(undefined)).toBe(false);
  });

  it("returns a verdict for every status the brief contract declares, so adding a lifecycle state cannot silently fall through to no polling", () => {
    for (const status of ALL_STATUSES) {
      const interval = researchBriefPollInterval(status);
      expect(interval === false || interval === RESEARCH_BRIEF_POLL_MS).toBe(true);
    }
  });

  it("treats exactly the two in-flight statuses as pollable, which is the pair that distinguishes a recoverable brief from a settled one", () => {
    const pollable = ALL_STATUSES.filter(
      (s) => researchBriefPollInterval(s) !== false,
    );

    expect(pollable).toEqual(["queued", "running"]);
  });
});
