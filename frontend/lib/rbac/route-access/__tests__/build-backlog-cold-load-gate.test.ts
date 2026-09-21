import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveRouteAccess } from "../route-access";

const BACKLOG_PAGE = resolve(
  process.cwd(),
  "app",
  "(authenticated)",
  "build",
  "[projectId]",
  "backlog",
  "page.tsx",
);

function enforcedFallback(source: string): string | null {
  const match = /enforceRouteAccess\(\s*"([^"]+)"\s*\)/.exec(source);
  return match ? match[1] : null;
}

describe("backlog route gate — the fallback decides the permission on a cold document load", () => {
  const source = readFileSync(BACKLOG_PAGE, "utf8");

  it("the backlog page calls enforceRouteAccess so a cold load is gated by the page, not only by the /build layout", () => {
    expect(enforcedFallback(source)).not.toBeNull();
  });

  it("the fallback it passes resolves to build:tickets:view, the key the first read actually requires", () => {
    const fallback = enforcedFallback(source);
    const decision = resolveRouteAccess(fallback as string);
    expect(decision.kind).toBe("permission");
    expect((decision as { permission: string }).permission).toBe("build:tickets:view");
  });

  it("BITE: the weaker /build fallback resolves to build:view, so passing it would silently downgrade the gate", () => {
    const decision = resolveRouteAccess("/build");
    expect(decision.kind).toBe("permission");
    expect((decision as { permission: string }).permission).toBe("build:view");
    expect((decision as { permission: string }).permission).not.toBe("build:tickets:view");
  });

  it("no header is available on a cold load, so enforceRouteAccess uses its literal argument and the two keys are not interchangeable", () => {
    const strong = resolveRouteAccess("/build/[projectId]/backlog");
    const weak = resolveRouteAccess("/build");
    expect((strong as { permission: string }).permission).not.toBe(
      (weak as { permission: string }).permission,
    );
  });
});
