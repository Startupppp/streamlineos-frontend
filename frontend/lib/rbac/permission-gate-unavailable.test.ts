import { permissionGate } from "@/lib/rbac/permission-gate";

/**
 * BUG-HRMS-011 / BUG-HRMS-012 / BUG-HRMS-014. `pending` used to mean "the access
 * snapshot is not here", which is true both before the read lands and for ever
 * after it fails. Every surface that renders a skeleton while pending therefore
 * rendered it until the tab was closed once `/me/access` errored — one degraded
 * org sync walled a whole session.
 *
 * The four answers have to stay mutually exclusive: that is what lets a surface
 * branch on them without ever showing two states or, worse, an empty one.
 */

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
    // A refetch that fails after a successful read must not retract a grant the
    // surface is already rendering from.
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
