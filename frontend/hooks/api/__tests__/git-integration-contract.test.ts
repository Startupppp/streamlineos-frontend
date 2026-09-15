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
