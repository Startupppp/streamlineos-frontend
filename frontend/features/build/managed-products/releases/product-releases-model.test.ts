import { groupReleases, releaseCountdown, releasesSubtitle } from "./product-releases-model";
import { buildRelease as release } from "./product-releases-test-fixtures";
import { releaseFormSchema, QA_STATES } from "./product-release-form-schema";

describe("groupReleases", () => {
  const rows = [
    release({ id: 1, status: "draft", releaseDate: null }),
    release({ id: 2, status: "draft", releaseDate: "2026-11-01" }),
    release({ id: 3, status: "draft", releaseDate: "2026-10-01" }),
    release({ id: 4, status: "released", releaseDate: "2026-01-01" }),
    release({ id: 5, status: "released", releaseDate: "2026-06-01" }),
    release({ id: 6, status: "archived" }),
    release({ id: 5, status: "released", releaseDate: "2026-06-01" }),
  ];

  it("sorts drafts by release date ascending with undated drafts last", () => {
    expect(groupReleases(rows, "2026-10-11").upcoming.map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it("sorts shipped releases newest first and drops duplicate rows", () => {
    const groups = groupReleases(rows, "2026-10-11");
    expect(groups.shipped.map((r) => r.id)).toEqual([5, 4]);
    expect(groups.total).toBe(6);
  });

  it("picks the earliest draft dated today or later as the next planned release", () => {
    expect(groupReleases(rows, "2026-10-11").nextPlanned?.id).toBe(2);
    expect(groupReleases(rows, "2026-12-01").nextPlanned).toBeNull();
  });
});

describe("releaseCountdown", () => {
  const now = new Date(2026, 9, 11, 13, 0, 0);

  it("counts down to a future date", () => {
    expect(releaseCountdown("2026-10-16", now)).toEqual({ label: "in 5 days", tone: "info" });
    expect(releaseCountdown("2026-10-12", now)).toEqual({ label: "in 1 day", tone: "info" });
  });

  it("flags today and overdue dates", () => {
    expect(releaseCountdown("2026-10-11", now)).toEqual({ label: "Due today", tone: "warning" });
    expect(releaseCountdown("2026-10-09", now)).toEqual({ label: "overdue by 2 days", tone: "danger" });
  });
});

describe("releasesSubtitle", () => {
  it("summarises counts and marks partial counts while more pages exist", () => {
    const groups = groupReleases(
      [release({ id: 1 }), release({ id: 2 }), release({ id: 3, status: "released" })],
      "2026-10-11",
    );
    expect(releasesSubtitle(groups, false)).toBe("2 upcoming · 1 shipped");
    expect(releasesSubtitle(groups, true)).toBe("2+ upcoming · 1+ shipped");
  });

  it("describes the page when there are no releases", () => {
    expect(releasesSubtitle(groupReleases([], "2026-10-11"), false)).toBe(
      "Plan and track what ships for this product",
    );
  });
});

describe("releaseFormSchema", () => {
  const base = {
    name: "v1",
    version: "1.0.0",
    status: "draft" as const,
  };

  it("accepts every valid qaState value and rejects values outside the enum", () => {
    for (const state of QA_STATES) {
      expect(releaseFormSchema.safeParse({ ...base, qaState: state }).success).toBe(true);
    }
    expect(releaseFormSchema.safeParse({ ...base, qaState: "not_started" }).success).toBe(false);
    expect(releaseFormSchema.safeParse({ ...base, qaState: "unknown_state" }).success).toBe(false);
  });

  it("accepts null and omitted qaState", () => {
    expect(releaseFormSchema.safeParse({ ...base, qaState: null }).success).toBe(true);
    expect(releaseFormSchema.safeParse({ ...base }).success).toBe(true);
  });

  it("rejects a deploymentEvidenceUrl that is not a valid URL", () => {
    expect(releaseFormSchema.safeParse({ ...base, deploymentEvidenceUrl: "not-a-url" }).success).toBe(false);
    expect(releaseFormSchema.safeParse({ ...base, deploymentEvidenceUrl: "ftp://example.com" }).success).toBe(false);
  });

  it("accepts a valid http and https deploymentEvidenceUrl", () => {
    expect(releaseFormSchema.safeParse({ ...base, deploymentEvidenceUrl: "https://ci.example.com/build/42" }).success).toBe(true);
    expect(releaseFormSchema.safeParse({ ...base, deploymentEvidenceUrl: "http://localhost:3000/job/1" }).success).toBe(true);
  });

  it("accepts null and omitted deploymentEvidenceUrl", () => {
    expect(releaseFormSchema.safeParse({ ...base, deploymentEvidenceUrl: null }).success).toBe(true);
    expect(releaseFormSchema.safeParse({ ...base }).success).toBe(true);
  });
});
