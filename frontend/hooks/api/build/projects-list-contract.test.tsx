import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { backendPath } from "@/test-utils/backend-repo";
import { useInfiniteProjects, useProjects } from "./projects";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

interface RecordedCall {
  url: string;
  params: Record<string, unknown> | undefined;
}

const calls: RecordedCall[] = [];

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn((url: string, params: Record<string, unknown> | undefined) => {
      calls.push({ url, params });
      return Promise.resolve({ data: [], hasMore: false, nextCursor: null });
    }),
  },
}));

interface CapturedInfinite {
  queryFn: (ctx: { pageParam: number | undefined; signal: undefined }) => unknown;
  getNextPageParam: (page: { nextCursor: number | null }) => number | undefined;
}

let captured: CapturedInfinite | undefined;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn((opts: { queryFn: (ctx: { signal: undefined }) => unknown }) => {
      void opts.queryFn({ signal: undefined });
      return { data: undefined };
    }),
    useInfiniteQuery: jest.fn((opts: CapturedInfinite) => {
      captured = opts;
      return { data: undefined };
    }),
  };
});

const BACKEND_SCHEMA = backendPath(
  "src",
  "modules",
  "build",
  "core",
  "dto",
  "project-core.schemas.ts",
);
const FE_TYPES = join(__dirname, "..", "..", "..", "types", "projects", "projects.ts");

function backendListQueryKeys(): { keys: Set<string>; strict: boolean } {
  const src = readFileSync(BACKEND_SCHEMA, "utf8");
  const block = /export const listProjectsSchema = z\s*\.?\s*object\(\{([\s\S]*?)\}\)(\s*\.strict\(\))?/.exec(
    src,
  );
  if (!block) throw new Error(`listProjectsSchema not found in ${BACKEND_SCHEMA}`);
  const keys = new Set<string>();
  for (const line of (block[1] ?? "").split("\n")) {
    const named = /^\s{2}([A-Za-z_$][\w$]*)\s*:/.exec(line);
    if (named?.[1]) keys.add(named[1]);
  }
  return { keys, strict: Boolean(block[2]) };
}

function projectFiltersKeys(): Set<string> {
  const src = readFileSync(FE_TYPES, "utf8");
  const block = /export interface ProjectFilters \{([\s\S]*?)\n\}/.exec(src);
  if (!block) throw new Error("ProjectFilters not found");
  const keys = new Set<string>();
  for (const line of (block[1] ?? "").split("\n")) {
    const named = /^\s{2}([A-Za-z_$][\w$]*)\??\s*:/.exec(line);
    if (named?.[1]) keys.add(named[1]);
  }
  return keys;
}

function FlatHook() {
  useProjects({ limit: 25, search: "acme" });
  return null;
}

function InfiniteHook() {
  useInfiniteProjects({ limit: 25, search: "acme" });
  return null;
}

describe("GET /build — the frontend must send what the backend accepts", () => {
  beforeEach(() => {
    calls.length = 0;
    captured = undefined;
  });

  it("the backend schema is strict, so an extra key is a 400 and not an ignored field", () => {
    expect(backendListQueryKeys().strict).toBe(true);
  });

  it("finds a non-trivial schema — a broken scan must fail, not pass", () => {
    const { keys } = backendListQueryKeys();
    expect(keys.size).toBeGreaterThanOrEqual(4);
    expect(keys.has("afterId")).toBe(true);
    expect(projectFiltersKeys().size).toBeGreaterThanOrEqual(4);
  });

  /**
   * `page` lived on `ProjectFilters` and `projects-page.tsx` sent it, and
   * `useProjects` spreads the filter object straight into the query string —
   * so Zod answered `Unrecognized key: "page"` and `/build`
   * rendered "Failed to load projects" at every viewport width.
   */
  it("every ProjectFilters field exists in listProjectsSchema", () => {
    const { keys } = backendListQueryKeys();
    const unknown = [...projectFiltersKeys()].filter((k) => !keys.has(k));
    expect(unknown).toEqual([]);
  });

  it("the flat read puts only accepted keys on the wire", () => {
    render(<FlatHook />);
    const { keys } = backendListQueryKeys();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("/build");
    expect(Object.keys(calls[0]?.params ?? {}).filter((k) => !keys.has(k))).toEqual([]);
  });

  it("the list page walks the keyset by afterId, not by page number", () => {
    render(<InfiniteHook />);
    expect(captured).toBeDefined();
    const { keys } = backendListQueryKeys();

    void captured?.queryFn({ pageParam: undefined, signal: undefined });
    expect(calls[0]?.params).not.toHaveProperty("afterId");
    expect(Object.keys(calls[0]?.params ?? {}).filter((k) => !keys.has(k))).toEqual([]);

    expect(captured?.getNextPageParam({ nextCursor: 41 })).toBe(41);
    expect(captured?.getNextPageParam({ nextCursor: null })).toBeUndefined();

    void captured?.queryFn({ pageParam: 41, signal: undefined });
    expect(calls[1]?.params).toMatchObject({ afterId: 41 });
    expect(Object.keys(calls[1]?.params ?? {}).filter((k) => !keys.has(k))).toEqual([]);
  });
});
