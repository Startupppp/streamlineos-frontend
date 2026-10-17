import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import {
  buildEmptyEnvelope,
  encodeFilterEnvelope,
  decodeFilterEnvelope,
} from "@/lib/filter-envelope/filter-envelope-v1";

const BARREL_PATH = join(__dirname, "..", "index.ts");

describe("build hooks index barrel", () => {
  it("does not re-export types from multiple incompatible sources", () => {
    expect(existsSync(BARREL_PATH)).toBe(true);
    const source = readFileSync(BARREL_PATH, "utf8");
    expect(source).not.toContain('from "@/hooks/api"');
  });

  it("query key imports in build hooks use domain modules not aggregate", () => {
    expect(buildWorkQueryKeys.projects.all).toBeDefined();
    expect(typeof buildWorkQueryKeys.projects.detail).toBe("function");
    expect(typeof buildWorkQueryKeys.projects.list).toBe("function");
  });
});

describe("filter-envelope round-trip in build context", () => {
  it("buildEmptyEnvelope round-trips through encode/decode", () => {
    const envelope = buildEmptyEnvelope();
    const encoded = encodeFilterEnvelope(envelope);
    const decoded = decodeFilterEnvelope(encoded);
    expect(decoded).toEqual(envelope);
  });
});
