import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { knowledgeAndSurveysQueryKeys as qk } from "@/lib/query-keys/knowledge-and-surveys";

const response = jest.fn<Promise<unknown>, [string]>();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (path: string) => response(path),
    post: (path: string) => response(path),
    patch: (path: string) => response(path),
    delete: (path: string) => response(path),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_key: string, options: unknown) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query");
    return useMutation(options);
  },
}));

import {
  useCreateKbPage,
  useDeleteKbPage,
  useDuplicateKbPage,
  useMoveKbPage,
  useRestoreKbPage,
  useUpdateKbPage,
} from "./pages";
import {
  useArchiveKbSpace,
  useDeleteKbSpace,
  useRestoreKbSpace,
  useUpdateKbSpace,
} from "./spaces";
import { useExportKbPage } from "./export-page";

const SPACE_ID = 7;
const PAGE_ID = 12;

const COLLECTION_KEY = qk.kb.pageCollection({ spaceId: SPACE_ID, limit: 25 });
const SPACE_KEY = qk.kb.space(SPACE_ID);
const SPACE_MEMBERS_KEY = [...qk.kb.space(SPACE_ID), "members"] as const;
const SPACE_ARCHIVE_IMPACT_KEY = [
  ...qk.kb.space(SPACE_ID),
  "archive-impact",
] as const;
const EXPORT_JOBS_KEY = qk.kb.exportJobs();
const UNRELATED_KEY = qk.kb.settings();

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function seed(): void {
  client.setQueryData(COLLECTION_KEY, { data: [], pagination: {} });
  client.setQueryData(SPACE_KEY, { id: SPACE_ID, isArchived: false });
  client.setQueryData(SPACE_MEMBERS_KEY, []);
  client.setQueryData(SPACE_ARCHIVE_IMPACT_KEY, { pages: 0 });
  client.setQueryData(EXPORT_JOBS_KEY, { pages: [], pageParams: [] });
  client.setQueryData(UNRELATED_KEY, { aiEnabled: true });
}

function invalidated(key: readonly unknown[]): boolean {
  return client.getQueryState(key)?.isInvalidated === true;
}

async function run(
  useMutationHook: () => { mutateAsync: (input: never) => Promise<unknown> },
  input: unknown,
): Promise<void> {
  const { result } = renderHook(useMutationHook, { wrapper });
  await act(async () => {
    await result.current.mutateAsync(input as never);
  });
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  response.mockReset();
  response.mockResolvedValue({
    id: PAGE_ID,
    format: "html",
    content: "<p>page</p>",
    success: true,
    deletedCount: 1,
  });
});

describe("a page mutation reaches the list the wiki actually renders", () => {
  it("the page-collection key is a descendant of kbPages(), so the blanket page invalidation can match it", () => {
    expect(COLLECTION_KEY.slice(0, qk.kb.kbPages().length)).toEqual([
      ...qk.kb.kbPages(),
    ]);
  });

  it("useDeleteKbPage invalidates the page collection, so a deleted page leaves the screen", async () => {
    seed();
    await run(useDeleteKbPage, PAGE_ID);
    expect(invalidated(COLLECTION_KEY)).toBe(true);
  });

  it("useCreateKbPage invalidates the page collection", async () => {
    seed();
    await run(useCreateKbPage, { title: "new", spaceId: SPACE_ID });
    expect(invalidated(COLLECTION_KEY)).toBe(true);
  });

  it("useRestoreKbPage invalidates the page collection", async () => {
    seed();
    await run(useRestoreKbPage, PAGE_ID);
    expect(invalidated(COLLECTION_KEY)).toBe(true);
  });

  it("useUpdateKbPage invalidates the page collection when the edit touches a listed field", async () => {
    seed();
    await run(useUpdateKbPage, { pageId: PAGE_ID, title: "renamed" });
    expect(invalidated(COLLECTION_KEY)).toBe(true);
  });

  it("useDuplicateKbPage invalidates the page collection", async () => {
    seed();
    await run(useDuplicateKbPage, PAGE_ID);
    expect(invalidated(COLLECTION_KEY)).toBe(true);
  });

  it("useMoveKbPage invalidates the page collection", async () => {
    seed();
    await run(useMoveKbPage, { pageId: PAGE_ID, parentPageId: null });
    expect(invalidated(COLLECTION_KEY)).toBe(true);
  });

  it("leaves an unrelated KB read alone — the invalidation is scoped, not a cache wipe", async () => {
    seed();
    await run(useDeleteKbPage, PAGE_ID);
    expect(invalidated(UNRELATED_KEY)).toBe(false);
  });
});

describe("a space lifecycle mutation reaches the space detail header", () => {
  it("the space detail key is a descendant of spaces(), so the list invalidation can match it", () => {
    expect(SPACE_KEY.slice(0, qk.kb.spaces().length)).toEqual([
      ...qk.kb.spaces(),
    ]);
  });

  it.each([
    ["useArchiveKbSpace", useArchiveKbSpace],
    ["useRestoreKbSpace", useRestoreKbSpace],
    ["useDeleteKbSpace", useDeleteKbSpace],
  ])(
    "%s invalidates the space detail, so the header stops saying Active",
    async (_name, useHook) => {
      seed();
      await run(useHook, SPACE_ID);
      expect(invalidated(SPACE_KEY)).toBe(true);
    },
  );

  it("useArchiveKbSpace also invalidates the two reads that hang off the space detail", async () => {
    seed();
    await run(useArchiveKbSpace, SPACE_ID);
    expect(invalidated(SPACE_MEMBERS_KEY)).toBe(true);
    expect(invalidated(SPACE_ARCHIVE_IMPACT_KEY)).toBe(true);
  });

  it("useUpdateKbSpace still invalidates the space detail after the key was nested", async () => {
    seed();
    await run(useUpdateKbSpace, { spaceId: SPACE_ID, name: "renamed" });
    expect(invalidated(SPACE_KEY)).toBe(true);
  });
});

describe("exporting a page refreshes the export history it just appended to", () => {
  const createObjectURL = jest.fn(() => "blob:kb-export");
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });

  it("useExportKbPage invalidates the export-jobs list", async () => {
    seed();
    await run(useExportKbPage, { pageId: PAGE_ID, format: "html" });
    expect(invalidated(EXPORT_JOBS_KEY)).toBe(true);
  });
});
