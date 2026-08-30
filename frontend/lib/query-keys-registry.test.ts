import type { QueryKey } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";
import { scopedQueryKeyHashFn } from "./query-scope";

describe("query key registry facade", () => {
  it("preserves representative domain key shapes after modularization", () => {
    expect(queryKeys.hr.termination(12)).toEqual([
      "streamlineos",
      "hr",
      "termination",
      12,
    ]);
    expect(queryKeys.leads.detail(21)).toEqual([
      "streamlineos",
      "leads",
      "detail",
      21,
    ]);
    expect(queryKeys.projects.ticket(34)).toEqual([
      "streamlineos",
      "projects",
      "tickets",
      "detail",
      34,
    ]);
    expect(queryKeys.notifications.template(55)).toEqual([
      "streamlineos",
      "notifications",
      "template",
      55,
    ]);
    expect(queryKeys.inventory.purchaseOrder(89)).toEqual([
      "streamlineos",
      "inventory",
      "purchaseOrder",
      89,
    ]);
    expect(queryKeys.users.detail("user-144")).toEqual([
      "streamlineos",
      "users",
      "detail",
      "user-144",
    ]);
    expect(queryKeys.payroll.templatePreview(233, "1200000")).toEqual([
      "streamlineos",
      "payroll",
      "template",
      233,
      "preview",
      "1200000",
    ]);
    expect(queryKeys.ownership.incomingTransfers()).toEqual([
      "streamlineos",
      "ownership",
      "transfers",
      "incoming",
    ]);
  });
});

describe("query key registry — exhaustive walk", () => {
  function isCallable(v: unknown): v is (...args: unknown[]) => unknown {
    return typeof v === "function";
  }

  const collectedKeys: Array<readonly unknown[]> = [];
  const failures: string[] = [];

  function walk(node: unknown, path: string): void {
    if (Array.isArray(node)) {
      collectedKeys.push(node);
      return;
    }
    if (isCallable(node)) {
      try {
        const args = Array.from({ length: node.length }, (_, i): unknown => {
          if (i === 0) return "x";
          if (i === 1) return 1;
          return {};
        });
        const result = node(...args);
        if (Array.isArray(result)) {
          collectedKeys.push(result);
        }
      } catch (err) {
        failures.push(`${path}: ${String(err)}`);
      }
      return;
    }
    if (node !== null && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        walk(v, `${path}.${k}`);
      }
    }
  }

  walk(queryKeys, "queryKeys");

  it("walks at least 150 factory leaves across the registry", () => {
    expect(collectedKeys.length).toBeGreaterThan(150);
  });

  it("all function calls succeed with placeholder arguments", () => {
    expect(failures).toHaveLength(0);
  });

  it("every produced key is a non-empty array starting with streamlineos", () => {
    for (const key of collectedKeys) {
      expect(key.length).toBeGreaterThan(0);
      expect(key[0]).toBe("streamlineos");
    }
  });

  it("every key hashes differently for org-a versus org-b — scope isolation holds for all factories", () => {
    const hashA = scopedQueryKeyHashFn("authenticated:org-a:user-1");
    const hashB = scopedQueryKeyHashFn("authenticated:org-b:user-1");
    for (const key of collectedKeys) {
      expect(hashA(key as QueryKey)).not.toBe(hashB(key as QueryKey));
    }
  });
});
