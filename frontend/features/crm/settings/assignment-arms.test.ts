import { readFileSync } from "node:fs";
import { backendPath } from "@/lib/test-support/backend-path";
import {
  ASSIGNMENT_TYPES,
  BASE_ASSIGNMENT_TYPES,
  armPayload,
  asAssignmentType,
  baseTypeFor,
  effectiveTypeOf,
  membersFrom,
} from "./assignment-arms";

const NO_ARM = {
  assignToUserId: undefined,
  members: [],
  weighted: [],
  fallbackUserId: undefined,
};

describe("armPayload", () => {
  it("stores an extended arm under a base type the enum admits", () => {
    for (const type of ASSIGNMENT_TYPES) {
      const payload = armPayload(type, NO_ARM);
      expect(BASE_ASSIGNMENT_TYPES).toContain(payload.assignmentType);
    }
  });

  it("names the arm on every type, including the base two", () => {
    /*
     * `updateAssignmentRule` reads an absent `assignmentTypeText` as "leave it
     * alone", so a weighted rule switched back to a plain round robin by
     * omission would go on weighting.
     */
    for (const type of ASSIGNMENT_TYPES)
      expect(armPayload(type, NO_ARM).assignmentTypeText).toBe(type);
  });

  it("puts member weights in config, keyed by user id", () => {
    const payload = armPayload("weighted_round_robin", {
      ...NO_ARM,
      weighted: [
        { userId: "u1", weight: 70 },
        { userId: "u2", weight: 30 },
      ],
    });
    expect(payload.config).toEqual({ weights: { u1: 70, u2: 30 } });
  });

  it("gives a weighted rule a fallback pool, so empty weights do not assign nobody", () => {
    const payload = armPayload("weighted_round_robin", {
      ...NO_ARM,
      weighted: [{ userId: "u1", weight: 70 }],
    });
    expect(payload.roundRobinUserIds).toEqual(["u1"]);
  });

  it("sends least-loaded candidates in the column the server counts over", () => {
    const payload = armPayload("least_loaded", { ...NO_ARM, members: ["u1", "u2"] });
    expect(payload.roundRobinUserIds).toEqual(["u1", "u2"]);
  });

  it("carries a territory rule's fallback owner and nothing else", () => {
    expect(armPayload("territory", { ...NO_ARM, fallbackUserId: "u9" }).config).toEqual({
      fallbackUserId: "u9",
    });
    expect(armPayload("territory", NO_ARM).config).toEqual({});
  });
});

describe("reading a rule back", () => {
  it("shows what the rule does, not the column it is stored in", () => {
    expect(
      effectiveTypeOf({ assignmentType: "round_robin", assignmentTypeText: "least_loaded" }),
    ).toBe("least_loaded");
    expect(effectiveTypeOf({ assignmentType: "round_robin", assignmentTypeText: null })).toBe(
      "round_robin",
    );
  });

  it("round-trips weights through config", () => {
    const weighted = [{ userId: "u1", weight: 60 }];
    const payload = armPayload("weighted_round_robin", { ...NO_ARM, weighted });
    expect(membersFrom(payload.config ?? null)).toEqual(weighted);
  });

  it("falls back to a type the enum admits when the stored value is unknown", () => {
    expect(asAssignmentType("nonsense")).toBe("assign_user");
    expect(baseTypeFor(asAssignmentType("nonsense"))).toBe("assign_user");
  });
});

/**
 * The drift guard, and the reason this file exists.
 *
 * The picker offered five assignment types and sent the chosen one straight
 * into `assignmentType`, whose Zod enum admits two, alongside `weightedMembers`,
 * `windowHours` and `territoryId` against a `.strict()` schema. Three of the
 * five arms could not be saved at all. Nothing compared the two lists, and
 * because a rejected enum and an unknown key both come back as
 * `Validation failed.`, the screen could not say so either.
 */
describe("the assignment contract matches the backend", () => {
  const SOURCE = readFileSync(
    backendPath("src/modules/crm/core/dto/rules.schemas.ts"),
    "utf8",
  );

  function enumMembers(pattern: RegExp): string[] {
    const block = pattern.exec(SOURCE);
    expect(block).not.toBeNull();
    return [...(block?.[1] ?? "").matchAll(/"([a-z_]+)"/g)].map((m) => m[1] as string).sort();
  }

  it("offers exactly the arms the extended enum names", () => {
    const backend = enumMembers(
      /const extendedAssignmentTypeEnum = z\.enum\(\[([\s\S]*?)\]\)/,
    );
    expect(backend.length).toBeGreaterThanOrEqual(3);
    expect([...ASSIGNMENT_TYPES].sort()).toEqual(backend);
  });

  it("stores under exactly the values the create schema's enum admits", () => {
    const backend = enumMembers(
      /assignmentType: z\.enum\(\[([\s\S]*?)\]\)/,
    );
    expect(backend.length).toBeGreaterThanOrEqual(2);
    expect([...BASE_ASSIGNMENT_TYPES].sort()).toEqual(backend);
  });

  it("sends no key the strict create schema would reject", () => {
    expect(SOURCE).toMatch(/assignmentRuleCreateSchema[\s\S]*?\}\)\.strict\(\)/);

    const block = /export const assignmentRuleCreateSchema = z\.object\(\{([\s\S]*?)\n\}\)\.strict\(\)/.exec(
      SOURCE,
    );
    expect(block).not.toBeNull();
    const allowed = [...(block?.[1] ?? "").matchAll(/^ {2}(\w+):/gm)].map((m) => m[1] as string);
    expect(allowed).toContain("assignmentTypeText");

    // Every key the sheet can put on the wire, arm keys and fixed keys alike.
    const sent = new Set(["name", "conditions", "priority", "isActive"]);
    for (const type of ASSIGNMENT_TYPES)
      for (const key of Object.keys(armPayload(type, NO_ARM))) sent.add(key);

    for (const key of sent) expect(allowed).toContain(key);
  });

  it("puts nothing in config the config schema does not declare", () => {
    const block = /const configSchema = z\.object\(\{([\s\S]*?)\}\)/.exec(SOURCE);
    expect(block).not.toBeNull();
    const allowed = [...(block?.[1] ?? "").matchAll(/(\w+):/g)].map((m) => m[1] as string);

    const sent = new Set<string>();
    for (const type of ASSIGNMENT_TYPES)
      for (const key of Object.keys(
        armPayload(type, {
          assignToUserId: "u1",
          members: ["u1"],
          weighted: [{ userId: "u1", weight: 1 }],
          fallbackUserId: "u1",
        }).config ?? {},
      ))
        sent.add(key);

    expect(sent.size).toBeGreaterThan(0);
    for (const key of sent) expect(allowed).toContain(key);
  });
});
