import { readFileSync } from "node:fs";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ZodType } from "zod";
import { backendAvailable, backendPath } from "@/test-utils/backend-repo";

const post = jest.fn<Promise<unknown>, [string, unknown, unknown, unknown]>();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: (path: string, body: unknown, config: unknown, contract: unknown) =>
      post(path, body, config, contract),
  },
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (
    _key: string,
    options: { mutationFn: (input: unknown) => Promise<unknown> },
  ) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

import { useCreateKbArticleFromTicket } from "./from-ticket";

const BACKEND_SCHEMA_FILE = [
  "src",
  "modules",
  "kb",
  "help-centre",
  "dto",
  "kb-helpcenter-response.schemas.ts",
];

function backendArticleFields(): string[] {
  const source = readFileSync(backendPath(...BACKEND_SCHEMA_FILE), "utf8");
  const start = source.indexOf("export const kbArticleSchema = z.object({");
  const end = source.indexOf("\n});", start);
  const block = source.slice(start, end);
  const fields = [...block.matchAll(/^ {2}(\w+):/gm)].map((match) => match[1]);
  return [...fields, "tags"];
}

const ARTICLE = {
  id: 91,
  orgId: "org-1",
  categoryId: null,
  spaceId: 4,
  ownerMembershipId: 12,
  title: "Resetting a locked account",
  slug: "resetting-a-locked-account",
  excerpt: null,
  content: "## Problem\n\n1. Do the thing",
  contentText: "Problem Do the thing",
  status: "draft" as const,
  visibility: "internal" as const,
  authorId: "user-1",
  views: 0,
  helpfulCount: 0,
  notHelpfulCount: 0,
  seoTitle: null,
  seoDescription: null,
  reviewIntervalDays: null,
  lastVerifiedAt: null,
  publishedAt: null,
  archivedAt: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
  aclRevision: 1,
  contentRevision: 1,
  tags: ["support", "accounts"],
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function contractBoundByTheHook(): Promise<ZodType<unknown>> {
  post.mockResolvedValue(ARTICLE);
  const { result } = renderHook(() => useCreateKbArticleFromTicket(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ ticketId: 7, spaceId: 4 });
  });
  const source = post.mock.calls[0]?.[3];
  if (typeof source !== "function")
    throw new Error("the hook passed no contract to apiClient.post");
  return await (source as () => Promise<ZodType<unknown>>)();
}

describe("POST /kb/articles/from-ticket/:ticketId is bound to the article the backend actually returns", () => {
  beforeEach(() => {
    post.mockReset();
  });

  it("reads the backend repository, so the field oracle below is not vacuous", () => {
    expect(backendAvailable).toBe(true);
  });

  it("the sample article carries exactly the fields kbArticleWithTagsSchema declares", () => {
    const declared = backendArticleFields();
    expect(declared.length).toBeGreaterThan(20);
    expect(Object.keys(ARTICLE).sort()).toEqual([...declared].sort());
  });

  it("parses that article, so onSuccess fires instead of an error toast and the agent does not retry into a duplicate draft", async () => {
    const contract = await contractBoundByTheHook();
    expect(contract.parse(ARTICLE)).toEqual(ARTICLE);
  });

  it("rejects the {success: boolean} body the route never returns — the shape that made every 200 throw", async () => {
    const contract = await contractBoundByTheHook();
    expect(() => contract.parse({ success: true })).toThrow();
  });

  it("types tags as plain strings, not {id,name,slug} objects", async () => {
    const contract = await contractBoundByTheHook();
    expect(() =>
      contract.parse({ ...ARTICLE, tags: [{ id: 1, name: "support", slug: "support" }] }),
    ).toThrow();
  });

  it("resolves the mutation with the created article, so a caller can open the draft it just made", async () => {
    post.mockResolvedValue(ARTICLE);
    const { result } = renderHook(() => useCreateKbArticleFromTicket(), { wrapper });
    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.mutateAsync({ ticketId: 7, spaceId: 4 });
    });
    expect(resolved).toEqual(ARTICLE);
    expect(post.mock.calls[0]?.[0]).toBe("/kb/articles/from-ticket/7");
    expect(post.mock.calls[0]?.[1]).toEqual({ spaceId: 4 });
  });
});
