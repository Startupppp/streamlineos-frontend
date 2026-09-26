import {
  gitConnectionListContract,
  gitConnectionCreateContract,
  gitConnectionUpdateContract,
} from "@/hooks/api/git-integration-schema";

const ROW = {
  id: 4,
  provider: "github" as const,
  projectId: 12,
  repoUrl: "https://github.com/acme/api",
  repoName: "acme/api",
  isActive: true,
  maskedSecret: "whsec_••••1234",
  webhookUrl: "https://api.example.com/integrations/git/webhook?connectionId=4",
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:00:00.000Z",
};

describe("git connection contracts accept the integer projectId the column stores", () => {
  it("parses a list whose connection is scoped to a project", () => {
    const parsed = gitConnectionListContract.parse({
      data: [ROW],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });

    expect(parsed.data[0].projectId).toBe(12);
  });

  it("parses an org-wide connection with no project", () => {
    const parsed = gitConnectionListContract.parse({
      data: [{ ...ROW, projectId: null }],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    });

    expect(parsed.data[0].projectId).toBeNull();
  });

  it("parses a created connection scoped to a project", () => {
    const { maskedSecret: _masked, ...rest } = ROW;
    const parsed = gitConnectionCreateContract.parse({
      ...rest,
      webhookSecret: "whsec_full_value",
    });

    expect(parsed.projectId).toBe(12);
  });

  it("parses an updated connection scoped to a project", () => {
    const { maskedSecret: _masked, webhookUrl: _url, ...rest } = ROW;
    const parsed = gitConnectionUpdateContract.parse(rest);

    expect(parsed.projectId).toBe(12);
  });
});

describe("git integration cache key contract (BLD-X-BE-SETTINGS-GIT-001)", () => {
  it("includes 'gitIntegration' segment in the connections cache key", () => {
    const { accountingAndSupportQueryKeys } = require("@/lib/query-keys/accounting-and-support");
    const key = accountingAndSupportQueryKeys.gitIntegration.connections();
    expect(key.some((s: unknown) => s === "gitIntegration")).toBe(true);
  });

  it("includes 'connections' segment in the connections cache key", () => {
    const { accountingAndSupportQueryKeys } = require("@/lib/query-keys/accounting-and-support");
    const key = accountingAndSupportQueryKeys.gitIntegration.connections();
    expect(key.some((s: unknown) => s === "connections")).toBe(true);
  });

  it("connections key is an extension of the gitIntegration.all base key — invalidating all also purges every connection query", () => {
    const { accountingAndSupportQueryKeys } = require("@/lib/query-keys/accounting-and-support");
    const allKey = accountingAndSupportQueryKeys.gitIntegration.all;
    const connectionsKey = accountingAndSupportQueryKeys.gitIntegration.connections();
    expect(JSON.stringify(connectionsKey).startsWith(JSON.stringify(allKey).slice(0, -1))).toBe(true);
  });

  it("gitConnectionListContract rejects a list payload that wraps in 'items' instead of 'data' — envelope shape is load-bearing", () => {
    expect(() =>
      gitConnectionListContract.parse({ items: [ROW], pagination: { limit: 20, hasMore: false, nextCursor: null } }),
    ).toThrow();
  });
});
