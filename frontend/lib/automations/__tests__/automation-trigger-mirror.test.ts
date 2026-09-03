import * as fs from "fs";
import { backendPath } from "@/test-utils/backend-repo";
import {
  AUTOMATION_TRIGGERS,
  AUTOMATION_TRIGGER_MODULE,
  TRIGGER_MODULES,
  automationTriggersForModule,
} from "../automation-triggers";
import {
  TRIGGER_META,
  resolveTriggerModule,
} from "@/components/automations/automation-trigger-data";

/**
 * One trigger vocabulary, mirrored — and a screen for every trigger.
 *
 * The backend engine dispatches AUTOMATION_TRIGGERS and owns the trigger ->
 * module map; this repository mirrors both. Before this gate the vocabulary
 * existed three times and disagreed (engine 55, write schema 48, frontend map
 * 33) and `getModuleForTrigger` ended `?? "hr"`, so 19 of the 48 the API
 * accepted resolved to HR — 15 by silent default and 4 by an explicit entry.
 * The visible effect was that /support/settings/automations offered 3 of
 * Support's triggers and /accounting/settings/automations 1.
 *
 * Three things have to hold and each is asserted from the backend source, not
 * from a copy of it:
 *   VOCABULARY  the mirrored list is exactly the engine's list.
 *   OWNERSHIP   every trigger's owning module is exactly the backend's.
 *   REACHABLE   every trigger has UI metadata, so none is invisible in the UI
 *               and none is offered that the engine cannot dispatch.
 *
 * ANTI-VACUITY. Both readers of the backend source carry a floor. A regex that
 * stops matching reports "no drift", and this repository has six confirmed
 * instances of a gate passing over code it never read.
 */

const MEASURED_TRIGGER_FLOOR = 55;
const MEASURED_MODULE_FLOOR = 5;

const BACKEND_RULES = backendPath("src", "db", "schema", "automation", "rules.ts");
const BACKEND_MAP = backendPath(
  "src",
  "modules",
  "automation",
  "automation-trigger-modules.ts",
);

function readBackendTriggers(): string[] {
  const source = fs.readFileSync(BACKEND_RULES, "utf8");
  const block = source.match(/export const AUTOMATION_TRIGGERS = \[([\s\S]*?)\] as const;/);
  if (!block) throw new Error(`AUTOMATION_TRIGGERS not found in ${BACKEND_RULES}`);
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1] as string);
}

function readBackendModuleMap(): Record<string, string> {
  const source = fs.readFileSync(BACKEND_MAP, "utf8");
  const block = source.match(
    /export const AUTOMATION_TRIGGER_MODULE: Record<[^>]*> = \{([\s\S]*?)\n\};/,
  );
  if (!block) throw new Error(`AUTOMATION_TRIGGER_MODULE not found in ${BACKEND_MAP}`);
  const entries = [...block[1].matchAll(/"([^"]+)":\s*"([^"]+)",/g)];
  return Object.fromEntries(entries.map((match) => [match[1] as string, match[2] as string]));
}

function readBackendModules(): string[] {
  const source = fs.readFileSync(BACKEND_MAP, "utf8");
  const block = source.match(/export const AUTOMATION_TRIGGER_MODULES = \[([\s\S]*?)\] as const;/);
  if (!block) throw new Error(`AUTOMATION_TRIGGER_MODULES not found in ${BACKEND_MAP}`);
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1] as string);
}

describe("automation trigger mirror", () => {
  it("reads a backend vocabulary that is actually there", () => {
    expect(readBackendTriggers().length).toBeGreaterThanOrEqual(MEASURED_TRIGGER_FLOOR);
    expect(Object.keys(readBackendModuleMap()).length).toBeGreaterThanOrEqual(
      MEASURED_TRIGGER_FLOOR,
    );
    expect(readBackendModules().length).toBeGreaterThanOrEqual(MEASURED_MODULE_FLOOR);
  });

  it("VOCABULARY — mirrors the engine list exactly, in order", () => {
    expect([...AUTOMATION_TRIGGERS]).toEqual(readBackendTriggers());
  });

  it("OWNERSHIP — gives every trigger the backend's owning module, with no default", () => {
    const backendMap = readBackendModuleMap();
    expect(Object.keys(AUTOMATION_TRIGGER_MODULE).sort()).toEqual(Object.keys(backendMap).sort());
    for (const trigger of AUTOMATION_TRIGGERS)
      expect(AUTOMATION_TRIGGER_MODULE[trigger]).toBe(backendMap[trigger]);
    expect([...TRIGGER_MODULES].sort()).toEqual(readBackendModules().sort());
  });

  it("REACHABLE — every trigger has metadata, and metadata names no trigger the engine lacks", () => {
    const described = TRIGGER_META.map((meta) => meta.value);
    expect(new Set(described).size).toBe(described.length);
    expect([...described].sort()).toEqual([...AUTOMATION_TRIGGERS].sort());
    for (const meta of TRIGGER_META)
      expect(meta.module).toBe(AUTOMATION_TRIGGER_MODULE[meta.value]);
  });

  it("partitions the vocabulary — no module is empty and none is double-counted", () => {
    let total = 0;
    for (const module of TRIGGER_MODULES) {
      const owned = automationTriggersForModule(module);
      expect(owned.length).toBeGreaterThan(0);
      total += owned.length;
    }
    expect(total).toBe(AUTOMATION_TRIGGERS.length);
  });

  it("fails closed on a trigger the vocabulary does not contain", () => {
    expect(resolveTriggerModule("not.a.real.trigger")).toBeNull();
    expect(resolveTriggerModule("toString")).toBeNull();
    expect(resolveTriggerModule("ticket.escalated")).toBe("support");
  });

  it("shows each module screen the whole of its own surface", () => {
    const onScreen = (module: string) =>
      TRIGGER_META.filter((meta) => meta.module === module).map((meta) => meta.value).sort();

    expect(onScreen("support")).toEqual([...automationTriggersForModule("support")].sort());
    expect(onScreen("finance")).toEqual([...automationTriggersForModule("finance")].sort());
    expect(onScreen("hr")).toEqual([...automationTriggersForModule("hr")].sort());
    expect(onScreen("crm")).toEqual([...automationTriggersForModule("crm")].sort());
    expect(onScreen("sign")).toEqual([...automationTriggersForModule("sign")].sort());
  });
});
