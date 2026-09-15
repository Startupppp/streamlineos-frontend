import { QueryClient } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { normalizeOrgModulesResponse } from "@/hooks/api/access/org-modules-normalize";

describe("toggling a module must not corrupt the org-modules list cache", () => {
  it("leaves the org-modules cache an array after the access caches are patched, because access.orgModules() sits under the access.all prefix and spreading an array into an object makes normalizeOrgModulesResponse throw 'invalid module configuration'", () => {
    const qc = new QueryClient();

    qc.setQueryData(platformCoreQueryKeys.access.me(), {
      permissions: [],
      modules: { hr: true },
    });
    qc.setQueryData(platformCoreQueryKeys.access.orgModules(), [
      { moduleKey: "hr", enabled: true, core: true },
      { moduleKey: "payroll", enabled: false },
    ]);

    const matched = qc.getQueriesData({
      queryKey: platformCoreQueryKeys.access.all,
    });

    expect(
      matched.map(([key]) => key.join("/")),
    ).toEqual(
      expect.arrayContaining([
        platformCoreQueryKeys.access.orgModules().join("/"),
      ]),
    );

    const isAccessResponseCache = (value: unknown): boolean => {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
      if (!("modules" in value)) return false;
      const modules = (value as { modules: unknown }).modules;
      return (
        typeof modules === "object" &&
        modules !== null &&
        !Array.isArray(modules)
      );
    };

    for (const [queryKey, data] of matched) {
      if (!isAccessResponseCache(data)) continue;
      qc.setQueryData(queryKey, {
        ...(data as { modules: Record<string, boolean> }),
        modules: {
          ...(data as { modules: Record<string, boolean> }).modules,
          payroll: true,
        },
      });
    }

    const after = qc.getQueryData(
      platformCoreQueryKeys.access.orgModules(),
    );

    expect(Array.isArray(after)).toBe(true);
    expect(() => normalizeOrgModulesResponse(after)).not.toThrow();
  });

  it("throws the exact error the Module Management screen shows when an array cache is spread into an object, pinning the failure mode this guards against", () => {
    const corrupted = {
      ...[{ moduleKey: "hr", enabled: true }],
      modules: { hr: true },
    };

    expect(() => normalizeOrgModulesResponse(corrupted)).toThrow(
      "The server returned an invalid module configuration. Please try again.",
    );
  });
});
