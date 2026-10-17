/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { partialMatchKey } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "./build-work";

const visibility = buildWorkQueryKeys.projects.clientPortal.visibility;

function matches(read: readonly unknown[], invalidation: readonly unknown[]): boolean {
  return partialMatchKey(read as QueryKey, invalidation as QueryKey);
}

function declaredCursorParameters(): string[] {
  const file = join(__dirname, "build-work.ts");
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.ESNext,
    true,
  );
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === "visibility" &&
      ts.isArrowFunction(node.initializer)
    ) {
      for (const parameter of node.initializer.parameters) {
        if (parameter.questionToken) names.push(parameter.name.getText(source));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
}

describe("buildWorkQueryKeys.projects.clientPortal.visibility — invalidation prefix contract", () => {
  it("the uncursored key is strictly shorter than a cursored one, so invalidation can prefix-match it", () => {
    expect(visibility(42).length).toBeLessThan(visibility(42, "tc").length);
    expect(visibility(42).length).toBeLessThan(visibility(42, "tc", "mc").length);
  });

  it("the uncursored key that both visibility mutations invalidate reaches every cursored read", () => {
    const invalidation = visibility(42);

    expect(matches(visibility(42, "tc"), invalidation)).toBe(true);
    expect(matches(visibility(42, undefined, "mc"), invalidation)).toBe(true);
    expect(matches(visibility(42, "tc", "mc"), invalidation)).toBe(true);
  });

  it("omitting the trailing cursor still reaches the read that supplies it, which the padded key could not", () => {
    expect(matches(visibility(42, "tc", "mc"), visibility(42, "tc"))).toBe(true);
  });

  it("keeps every distinct cursor combination distinct, so one tab's page cannot answer the other's", () => {
    const keys = [
      visibility(42),
      visibility(42, "c"),
      visibility(42, undefined, "c"),
      visibility(42, "c", "c"),
    ];
    const hashes = keys.map((key) => JSON.stringify(key));

    expect(new Set(hashes).size).toBe(keys.length);
  });

  it("does not let a ticket cursor stand in for a milestone cursor of the same value", () => {
    expect(matches(visibility(42, undefined, "c"), visibility(42, "c"))).toBe(false);
    expect(matches(visibility(42, "c"), visibility(42, undefined, "c"))).toBe(false);
  });

  it("isolates projects, so one project's invalidation never reaches another's cursored read", () => {
    expect(matches(visibility(43, "tc", "mc"), visibility(42))).toBe(false);
  });

  it("treats an empty-string cursor as absent, because the reader omits an empty cursor from the request too", () => {
    expect(visibility(42, "")).toEqual(visibility(42));
    expect(visibility(42, "", "")).toEqual(visibility(42));
  });

  it("carries every declared cursor in one named slot, so a new cursor cannot be appended unnamed", () => {
    const cursors = declaredCursorParameters();
    expect(cursors.length).toBeGreaterThanOrEqual(2);

    const scope = visibility(42);
    const full = visibility(42, ...cursors.map((_, index) => `c${index}`));

    expect(full.length).toBe(scope.length + 1);

    const slot = full[full.length - 1];
    expect(typeof slot).toBe("object");
    expect(Object.keys(slot as Record<string, unknown>).sort()).toEqual(
      [...cursors].sort(),
    );
  });

  it("names a slot for each cursor it was given and none for the cursors it was not", () => {
    expect(visibility(42, "tc")).toEqual([
      ...visibility(42),
      { ticketCursor: "tc" },
    ]);
    expect(visibility(42, undefined, "mc")).toEqual([
      ...visibility(42),
      { milestoneCursor: "mc" },
    ]);
  });
});
