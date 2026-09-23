import {
  BACKEND_INVENTORY,
  parseCallSites,
  readCallSites,
  readFencedRoutes,
  segmentsMatch,
} from "../idempotency-key-helpers";

const fenced = readFencedRoutes();
const sites = readCallSites();
const fencedCalls = sites.filter((site) =>
  fenced.some((route) => route.method === site.method && segmentsMatch(route.segments, site.segments)),
);

describe("inventory commands carry a key scoped to the operator's intent", () => {
  it("reads the paired backend, so a missing checkout cannot pass as zero violations", () => {
    expect(BACKEND_INVENTORY).not.toBeNull();
    expect(fenced.length).toBeGreaterThan(100);
    expect(new Set(fenced.map((r) => r.mechanism))).toEqual(
      new Set(["@Idempotent", "@IdempotencyKey"]),
    );
    expect(fenced.filter((r) => r.mechanism === "@IdempotencyKey").length).toBeGreaterThan(30);
  });

  it("walks the hooks, so a broken walk cannot pass as zero violations", () => {
    expect(sites.length).toBeGreaterThan(100);
    expect(new Set(sites.map((s) => s.file)).size).toBeGreaterThan(15);
    expect(fencedCalls.length).toBeGreaterThan(80);
    const fromConstant = parseCallSites(
      'const BASE = "/inventory/quality/inspection-plans";\n' +
        'apiClient.post(BASE, payload, { headers: { "Idempotency-Key": key } });',
      "fixture.ts",
    );
    expect(fromConstant.map((s) => ({ path: s.path, viaConstant: s.viaConstant }))).toEqual([
      { path: "/inventory/quality/inspection-plans", viaConstant: true },
    ]);
  });

  it("never leaves a fenced command relying on the per-attempt key api-client mints", () => {
    const relying = fencedCalls
      .filter((s) => !s.carriesKey)
      .map((s) => `${s.file} -> ${s.method} ${s.path}`)
      .sort();

    expect(relying).toEqual([]);
  });

  it("gives every one of them a key that outlives the attempt", () => {
    const perAttempt = fencedCalls
      .filter((s) => !s.keyOutlivesTheAttempt)
      .map((s) => `${s.file} -> ${s.method} ${s.path}`)
      .sort();

    expect(perAttempt).toEqual([]);
  });
});
