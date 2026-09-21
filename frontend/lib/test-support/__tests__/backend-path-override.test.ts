import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { backendPath, backendReachable } from "../backend-path";

const MARKER = "src/modules/rbac/permissions";

function fakeBackendRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "slos-backend-"));
  mkdirSync(join(root, "src", "modules", "rbac", "permissions"), { recursive: true });
  return root;
}

describe("backendPath — the override is what makes cross-repo specs runnable from a git worktree", () => {
  const original = process.env.STREAMLINE_BACKEND_ROOT;

  afterEach(() => {
    if (original === undefined) delete process.env.STREAMLINE_BACKEND_ROOT;
    else process.env.STREAMLINE_BACKEND_ROOT = original;
  });

  it("honours STREAMLINE_BACKEND_ROOT, the same variable the sibling resolver in test-utils already reads", () => {
    process.env.STREAMLINE_BACKEND_ROOT = "D:/somewhere/else";
    expect(backendPath(MARKER)).toBe(resolve("D:/somewhere/else", MARKER));
  });

  it("BITE: without the override a worktree named neither *-frontend nor frontend/+backend resolves to a path that does not exist", () => {
    delete process.env.STREAMLINE_BACKEND_ROOT;
    const guessed = backendPath(MARKER);
    expect(typeof guessed).toBe("string");
    expect(guessed.endsWith(resolve(MARKER).slice(-MARKER.length))).toBe(true);
  });

  it("reaches a real backend when pointed at one, so the guard assertions in its consumers can actually run", () => {
    const root = fakeBackendRoot();
    try {
      process.env.STREAMLINE_BACKEND_ROOT = root;
      expect(backendReachable(MARKER)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports unreachable rather than throwing when the override names a directory with no backend in it", () => {
    process.env.STREAMLINE_BACKEND_ROOT = resolve(process.cwd(), "lib");
    expect(backendReachable(MARKER)).toBe(false);
  });
});
