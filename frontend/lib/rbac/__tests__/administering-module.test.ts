import { MANIFEST } from "@/lib/module-manifest";
import {
  administeringModuleOf,
  moduleOwningNamespace,
} from "../administering-module";

/**
 * The Simulate screen groups each permission key by administeringModuleOf(key).
 * With the naive split (key.split(":")[0]), chat:* returns "chat".
 * The catalog-driven version must return "home" for every Home-administered
 * namespace so those permissions group under the Home module header, not under
 * stray "chat" / "mail" / "calendar" / "notifications" headers.
 *
 * These assertions are the bite: restore the naive split and every one fails.
 */
describe("administeringModuleOf (Simulate screen grouping)", () => {
  it("groups chat namespace under home, not chat", () => {
    expect(administeringModuleOf("chat:org-settings:manage")).toBe("home");
  });

  it("groups mail namespace under home", () => {
    expect(administeringModuleOf("mail:settings:manage")).toBe("home");
  });

  it("groups calendar namespace under home", () => {
    expect(administeringModuleOf("calendar:events:view")).toBe("home");
  });

  it("groups notifications namespace under home", () => {
    expect(administeringModuleOf("notifications:preferences:manage")).toBe("home");
  });

  it("passes through a module that owns its own namespace", () => {
    expect(administeringModuleOf("hr:employees:view")).toBe("hr");
  });

  it("passes through crm and its additional party namespace separately", () => {
    expect(administeringModuleOf("party:contacts:view")).toBe("crm");
    expect(administeringModuleOf("crm:deals:view")).toBe("crm");
  });

  it("handles a key with no separator", () => {
    expect(administeringModuleOf("build")).toBe("build");
  });

  it("returns a key with no separator unchanged even when it names no manifest module", () => {
    expect(administeringModuleOf("totallyunknown")).toBe("totallyunknown");
  });

  it("returns the namespace unchanged when no module administers it", () => {
    expect(administeringModuleOf("unknownnamespace:resource:action")).toBe(
      "unknownnamespace",
    );
  });
});

describe("moduleOwningNamespace", () => {
  it("maps an additional namespace to its owning module", () => {
    expect(moduleOwningNamespace("chat")).toBe("home");
    expect(moduleOwningNamespace("party")).toBe("crm");
  });

  it("returns the namespace itself when no module claims it", () => {
    expect(moduleOwningNamespace("hr")).toBe("hr");
    expect(moduleOwningNamespace("unknown")).toBe("unknown");
  });
});

// MANIFEST-driven, so a namespace added to any module's administersNamespaces later is covered with no test edit.
describe("no administered namespace can fall back to naive prefix grouping", () => {
  const administeredNamespaces = MANIFEST.modules.flatMap((module) =>
    module.administersNamespaces.map((namespace) => ({
      namespace,
      moduleId: module.id,
    })),
  );

  it("the manifest currently declares at least one administered namespace to guard", () => {
    expect(administeredNamespaces.length).toBeGreaterThan(0);
  });

  it.each(administeredNamespaces)(
    "administeringModuleOf disagrees with key.split(':')[0] for namespace '$namespace' (administered by '$moduleId')",
    ({ namespace, moduleId }) => {
      const key = `${namespace}:resource:action`;
      const naivePrefix = key.split(":")[0];
      expect(administeringModuleOf(key)).toBe(moduleId);
      expect(administeringModuleOf(key)).not.toBe(naivePrefix);
    },
  );
});
