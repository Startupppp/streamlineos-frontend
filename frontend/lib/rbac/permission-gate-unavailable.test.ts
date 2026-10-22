import { permissionGate } from "@/lib/rbac/permission-gate";


const KEY = "hr:employees:view";

function states(gate: ReturnType<typeof permissionGate>) {
  return [gate.allowed, gate.denied, gate.pending, gate.unavailable];
}

describe("permissionGate", () => {
  it("is pending before the snapshot lands, and not unavailable", () => {
    const gate = permissionGate(KEY, false, false);
    expect(states(gate)).toEqual([false, false, true, false]);
  });

  it("is unavailable, not pending, when the access read failed", () => {
    const gate = permissionGate(KEY, false, false, true);
    expect(states(gate)).toEqual([false, false, false, true]);
  });

  it("grants when the snapshot says so", () => {
    expect(states(permissionGate(KEY, true, true))).toEqual([true, false, false, false]);
  });

  it("denies when the snapshot has landed and withholds the key", () => {
    expect(states(permissionGate(KEY, false, true))).toEqual([false, true, false, false]);
  });

  it("prefers a landed snapshot over a stale failure flag", () => {
    expect(states(permissionGate(KEY, true, true, true))).toEqual([true, false, false, false]);
  });

  it("never reports two answers at once, for any combination of inputs", () => {
    for (const allowed of [true, false])
      for (const resolved of [true, false])
        for (const failed of [true, false]) {
          const on = states(permissionGate(KEY, allowed, resolved, failed)).filter(Boolean);
          expect(on).toHaveLength(1);
        }
  });
});
