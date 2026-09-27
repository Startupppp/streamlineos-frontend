import { QueryClient } from "@tanstack/react-query";
import { invalidateTicketUpdateViews } from "./ticket-cache";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

const PROJECT_ID = 42;
const TICKET_ID = 7;

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function seedReports(client: QueryClient): void {
  client.setQueryData(
    buildWorkQueryKeys.projectReports.velocity(PROJECT_ID),
    { pages: [], pageParams: [] },
  );
  client.setQueryData(
    buildWorkQueryKeys.projectReports.burnup(PROJECT_ID),
    [],
  );
  client.setQueryData(
    buildWorkQueryKeys.projectReports.cfd(PROJECT_ID, { days: 30 }),
    { dates: [], groups: [], series: [] },
  );
  client.setQueryData(
    buildWorkQueryKeys.projectReports.criticalPath(PROJECT_ID),
    { criticalPath: [], totalDuration: 0, nodeCount: 0, edgeCount: 0, hasCycle: false },
  );
  client.setQueryData(
    buildWorkQueryKeys.projectReports.cycleTime(PROJECT_ID),
    [],
  );
  client.setQueryData(
    buildWorkQueryKeys.projectReports.leadTime(PROJECT_ID),
    [],
  );
}

function invalidatedKeys(spy: jest.SpyInstance): string[] {
  return spy.mock.calls.map((call: unknown[]) => {
    const opts = call[0] as { queryKey?: readonly unknown[] };
    return opts.queryKey ? JSON.stringify(opts.queryKey) : "<predicate-only>";
  });
}

describe("19 — invalidateTicketUpdateViews narrows report eviction per cache-policy.md", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("empty changes (no fields at all) evict no report cache", () => {
    const client = makeClient();
    seedReports(client);
    const spy = jest.spyOn(client, "invalidateQueries");

    invalidateTicketUpdateViews(client, PROJECT_ID, TICKET_ID, {});

    const keys = invalidatedKeys(spy);
    expect(keys.some((k) => k.includes("projectReports"))).toBe(false);
  });

  it("title-only change evicts only criticalPath (title is projected in the critical-path query)", () => {
    const client = makeClient();
    seedReports(client);
    const spy = jest.spyOn(client, "invalidateQueries");

    invalidateTicketUpdateViews(client, PROJECT_ID, TICKET_ID, { title: "Renamed ticket" });

    const keys = invalidatedKeys(spy);
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.criticalPath(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.velocity(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.burnup(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.cycleTime(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.leadTime(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.cfd(PROJECT_ID)),
    );
  });

  it("rank change with undefined status evicts no report cache", () => {
    const client = makeClient();
    seedReports(client);
    const spy = jest.spyOn(client, "invalidateQueries");

    invalidateTicketUpdateViews(client, PROJECT_ID, TICKET_ID, { status: undefined });

    const keys = invalidatedKeys(spy);
    expect(keys.some((k) => k.includes("projectReports"))).toBe(false);
  });

  it("status transition evicts cycleTime, leadTime, cfd, velocity, burnup — but not criticalPath", () => {
    const client = makeClient();
    seedReports(client);
    const spy = jest.spyOn(client, "invalidateQueries");

    invalidateTicketUpdateViews(client, PROJECT_ID, TICKET_ID, { status: "done" });

    const keys = invalidatedKeys(spy);
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.cycleTime(PROJECT_ID)),
    );
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.leadTime(PROJECT_ID)),
    );
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.cfd(PROJECT_ID)),
    );
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.velocity(PROJECT_ID)),
    );
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.burnup(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.criticalPath(PROJECT_ID)),
    );
  });

  it("points change evicts velocity, burnup, and criticalPath — but not cycleTime, leadTime, cfd", () => {
    const client = makeClient();
    seedReports(client);
    const spy = jest.spyOn(client, "invalidateQueries");

    invalidateTicketUpdateViews(client, PROJECT_ID, TICKET_ID, { points: 3 });

    const keys = invalidatedKeys(spy);
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.velocity(PROJECT_ID)),
    );
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.burnup(PROJECT_ID)),
    );
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.criticalPath(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.cycleTime(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.leadTime(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.cfd(PROJECT_ID)),
    );
  });

  it("cycle membership change evicts velocity and burnup — and no other report", () => {
    const client = makeClient();
    seedReports(client);
    const spy = jest.spyOn(client, "invalidateQueries");

    invalidateTicketUpdateViews(client, PROJECT_ID, TICKET_ID, { cycleId: 5 });

    const keys = invalidatedKeys(spy);
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.velocity(PROJECT_ID)),
    );
    expect(keys).toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.burnup(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.cycleTime(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.leadTime(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.cfd(PROJECT_ID)),
    );
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.criticalPath(PROJECT_ID)),
    );
  });

  it("status change does not evict criticalPath", () => {
    const client = makeClient();
    seedReports(client);
    const spy = jest.spyOn(client, "invalidateQueries");

    invalidateTicketUpdateViews(client, PROJECT_ID, TICKET_ID, { status: "in-progress" });

    const keys = invalidatedKeys(spy);
    expect(keys).not.toContain(
      JSON.stringify(buildWorkQueryKeys.projectReports.criticalPath(PROJECT_ID)),
    );
  });
});
