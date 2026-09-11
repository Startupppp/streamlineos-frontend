import { QueryClient } from "@tanstack/react-query";
import { knowledgeAndSurveysQueryKeys as qk } from "./knowledge-and-surveys";

describe("contentGaps factory — no-arg partial match", () => {
  it("OLD shape: trailing undefined yields 0 matches against a with-params key", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.kb.contentGaps({ type: "outdated" }), { items: [] });

    // Manually construct the pre-fix key: [..., "content-gaps", undefined]
    const oldNoArgKey = [...qk.kb.all, "content-gaps", undefined];
    const matches = qc.getQueriesData({ queryKey: oldNoArgKey });
    expect(matches).toHaveLength(0);
    qc.clear();
  });

  it("NEW shape: no trailing undefined yields 1 match against a with-params key (partial prefix)", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.kb.contentGaps({ type: "outdated" }), { items: [] });

    const noArgKey = qk.kb.contentGaps();
    const matches = qc.getQueriesData({ queryKey: noArgKey });
    expect(matches).toHaveLength(1);
    qc.clear();
  });

  it("no-arg form produces a key without a trailing element", () => {
    const withParams = qk.kb.contentGaps({ type: "outdated" });
    const noArg = qk.kb.contentGaps();
    expect(withParams.length).toBe(noArg.length + 1);
    expect(withParams.at(-1)).toEqual({ type: "outdated" });
  });
});

describe("roadmap factories — no-arg partial match", () => {
  it("roadmap.items: no-arg matches a with-params entry", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.roadmap.items({ status: "active" }), []);
    expect(qc.getQueriesData({ queryKey: qk.roadmap.items() })).toHaveLength(1);
    qc.clear();
  });

  it("roadmap.feedback: no-arg matches a with-params entry", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.roadmap.feedback({ page: 1 }), []);
    expect(qc.getQueriesData({ queryKey: qk.roadmap.feedback() })).toHaveLength(1);
    qc.clear();
  });

  it("roadmap.changelog: no-arg matches a with-params entry", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.roadmap.changelog({ limit: 10 }), []);
    expect(qc.getQueriesData({ queryKey: qk.roadmap.changelog() })).toHaveLength(1);
    qc.clear();
  });
});

describe("surveys factories — no-arg partial match", () => {
  it("surveys.list: no-arg matches a with-params entry", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.surveys.list({ page: 1 }), []);
    expect(qc.getQueriesData({ queryKey: qk.surveys.list() })).toHaveLength(1);
    qc.clear();
  });

  it("surveys.participants: no-params matches a with-params entry", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.surveys.participants(1, { page: 2 }), []);
    expect(qc.getQueriesData({ queryKey: qk.surveys.participants(1) })).toHaveLength(1);
    qc.clear();
  });

  it("surveys.responses: no-params matches a with-params entry", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.surveys.responses(1, { status: "completed" }), []);
    expect(qc.getQueriesData({ queryKey: qk.surveys.responses(1) })).toHaveLength(1);
    qc.clear();
  });
});

describe("automations.list — no-arg partial match", () => {
  it("no-arg matches a with-params entry", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.automations.list({ active: true }), []);
    expect(qc.getQueriesData({ queryKey: qk.automations.list() })).toHaveLength(1);
    qc.clear();
  });
});

describe("kb.pagesSearch — ACL dimension is required and discriminates by space membership", () => {
  it("two entries with different aclVersion produce distinct keys", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.kb.pagesSearch("hello", "1,2"), [{ id: 1 }]);
    qc.setQueryData(qk.kb.pagesSearch("hello", "1,2,3"), [{ id: 2 }]);
    expect(qc.getQueriesData({ queryKey: qk.kb.pagesSearch("hello", "1,2") })).toHaveLength(1);
    expect(qc.getQueriesData({ queryKey: qk.kb.pagesSearch("hello", "1,2,3") })).toHaveLength(1);
    qc.clear();
  });

  it("stale ACL version key produces zero matches against a new membership key", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.kb.pagesSearch("hello", "1,2,3"), [{ id: 1 }]);
    const oldMembershipKey = qk.kb.pagesSearch("hello", "1,2");
    expect(qc.getQueriesData({ queryKey: oldMembershipKey })).toHaveLength(0);
    qc.clear();
  });

  it("prefix without aclVersion matches all pagesSearch entries across ACL versions", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.kb.pagesSearch("hello", "1"), [{ id: 1 }]);
    qc.setQueryData(qk.kb.pagesSearch("hello", "1,2"), [{ id: 2 }]);
    const prefix = [...qk.kb.all, "pages", "search"];
    expect(qc.getQueriesData({ queryKey: prefix })).toHaveLength(2);
    qc.clear();
  });
});

describe("kb.search — ACL version embedded in params discriminates by space membership", () => {
  it("search with aclVersion in params differs from search without it", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.kb.search({ q: "hello", aclVersion: "1,2" }), { items: [] });
    qc.setQueryData(qk.kb.search({ q: "hello", aclVersion: "1,2,3" }), { items: [] });
    expect(
      qc.getQueriesData({ queryKey: qk.kb.search({ q: "hello", aclVersion: "1,2" }) }),
    ).toHaveLength(1);
    expect(
      qc.getQueriesData({ queryKey: qk.kb.search({ q: "hello", aclVersion: "1,2,3" }) }),
    ).toHaveLength(1);
    qc.clear();
  });

  it("prefix without params matches all search entries across ACL versions", () => {
    const qc = new QueryClient();
    qc.setQueryData(qk.kb.search({ q: "x", aclVersion: "1" }), { items: [] });
    qc.setQueryData(qk.kb.search({ q: "x", aclVersion: "2" }), { items: [] });
    const prefix = qk.kb.search();
    expect(qc.getQueriesData({ queryKey: prefix })).toHaveLength(2);
    qc.clear();
  });
});
