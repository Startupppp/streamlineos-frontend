import * as fs from "fs";
import { backendPath } from "@/test-utils/backend-repo";

const BACKEND_REGISTRY = backendPath(
  "src",
  "modules",
  "ai",
  "core",
  "persona-registry.ts",
);

function backendPersonaIds(): string[] {
  const source = fs.readFileSync(BACKEND_REGISTRY, "utf8");
  const ids = [...source.matchAll(/^\s{4}id:\s*"([^"]+)"/gm)].map((m) => m[1] as string);
  if (ids.length === 0)
    throw new Error(
      `No persona ids parsed out of ${BACKEND_REGISTRY}. The registry shape changed and this gate is reading nothing.`,
    );
  return ids;
}

function frontendUnionIds(): string[] {
  const source = fs.readFileSync(`${__dirname}/ask-os-request-policy.ts`, "utf8");
  const block = /export type PersonaId =([\s\S]*?);/.exec(source);
  if (block === null) throw new Error("PersonaId union not found in ask-os-request-policy.ts");
  const ids = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1] as string);
  if (ids.length === 0) throw new Error("PersonaId union parsed to zero members");
  return ids;
}

function frontendChipIds(): string[] {
  const source = fs.readFileSync(`${__dirname}/persona-chip-strip.tsx`, "utf8");
  const block = /const PERSONA_CHIPS: PersonaChip\[\] = \[([\s\S]*?)\n\];/.exec(source);
  if (block === null) throw new Error("PERSONA_CHIPS not found in persona-chip-strip.tsx");
  const ids = [...block[1].matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1] as string);
  if (ids.length === 0) throw new Error("PERSONA_CHIPS parsed to zero entries");
  return ids;
}

describe("the Ask OS persona list is one list, not three copies that drift apart", () => {
  it("parses a non-empty id set out of each of the three declarations, so the comparisons below are real", () => {
    expect(backendPersonaIds().length).toBeGreaterThan(0);
    expect(frontendUnionIds()).toHaveLength(backendPersonaIds().length);
    expect(frontendChipIds()).toHaveLength(backendPersonaIds().length);
  });

  it("offers a chip for every persona the backend accepts, because a persona with no chip is unreachable", () => {
    expect(frontendChipIds().sort()).toEqual(backendPersonaIds().sort());
  });

  it("types every persona the backend accepts, because an id missing from the union cannot be passed", () => {
    expect(frontendUnionIds().sort()).toEqual(backendPersonaIds().sort());
  });

  it("offers no chip the backend would reject, since getPersona returns undefined and the turn silently loses its preamble", () => {
    for (const id of frontendChipIds()) expect(backendPersonaIds()).toContain(id);
  });
});
