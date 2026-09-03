import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Both portal session-recovery redirects pointed at `/portal/accept-invitation`, a URL no route
 * serves.
 *
 * `app/(portal)/accept-invitation/page.tsx` is the real invitation route, and `(portal)` is a route
 * GROUP — it adds no URL segment — so that page answers `/accept-invitation`. There is no
 * `app/portal/` directory, no `middleware.ts`/`proxy.ts` rewrite for it, and `next.config.ts` has
 * only two unrelated redirects. `/portal/accept-invitation` therefore matched
 * `app/(authenticated)/portal/[projectId]/page.tsx` with `projectId = "accept-invitation"`, whose
 * layout calls `requireSession()` and redirects to `/signin?session=expired`.
 *
 * The result: an external client contact whose portal JWT expired was dumped on the internal staff
 * sign-in page, with no credentials and no route back — and `MissingTokenView`, written to explain
 * exactly `reason=expired` and `reason=no_token`, was unreachable from either producer of those
 * values.
 *
 * This resolves the literal against the real App Router tree rather than asserting the string,
 * because the string was never the point: the defect was that nothing checked the target exists.
 * The negative control below is what makes that non-vacuous.
 */

const APP_DIR = resolve(__dirname, "..", "..", "..", "app");

/** Route groups `(x)` and parallel slots `@x` add no URL segment; `_x` is private. */
const isTransparentSegment = (name: string): boolean =>
  name.startsWith("(") || name.startsWith("@");

/**
 * Walks `app/` the way the App Router does and returns true when `pathname` is served by a
 * `page.tsx`. Dynamic segments `[x]` / `[...x]` match a literal, which is precisely how
 * `/portal/accept-invitation` was silently absorbed.
 */
function routeResolves(pathname: string): boolean {
  const wanted = pathname.split("?")[0]!.split("/").filter(Boolean);

  const walk = (dir: string, index: number): boolean => {
    if (index === wanted.length) {
      return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((f) =>
        existsSync(join(dir, f)),
      );
    }
    const segment = wanted[index]!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return false;
    }
    const dirs = entries.filter((e) => {
      try {
        return statSync(join(dir, e)).isDirectory();
      } catch {
        return false;
      }
    });

    // Transparent groups consume no segment.
    for (const e of dirs) {
      if (isTransparentSegment(e) && walk(join(dir, e), index)) return true;
    }
    // Literal wins over dynamic, same as the router.
    if (dirs.includes(segment) && walk(join(dir, segment), index + 1)) return true;
    for (const e of dirs) {
      if (/^\[.+\]$/.test(e) && walk(join(dir, e), index + 1)) return true;
    }
    return false;
  };

  return walk(APP_DIR, 0);
}

/** The two producers of `reason=expired` / `reason=no_token`. */
const PRODUCERS = [
  { file: "hooks/api/portal/use-portal-guard.ts", reason: "no_token" },
  { file: "lib/portal-api-client.ts", reason: "expired" },
] as const;

const REPO = resolve(__dirname, "..", "..", "..");

function recoveryTargets(): { file: string; url: string; reason: string }[] {
  return PRODUCERS.map(({ file, reason }) => {
    const source = readFileSync(join(REPO, file), "utf8");
    const match = new RegExp(`["'\`](/[^"'\`\\s]*\\?reason=${reason})["'\`]`).exec(source);
    if (!match) {
      throw new Error(`${file} no longer produces a literal URL carrying ?reason=${reason}`);
    }
    return { file, url: match[1]!, reason };
  });
}

describe("portal session recovery targets a route that exists", () => {
  it("ANTI-VACUITY: the resolver rejects the dead URL and accepts the live one", () => {
    // Without this pair the walker could return true for everything and the suite would still pass.
    expect(routeResolves("/accept-invitation")).toBe(true);
    // `/portal/<anything>` resolves only because `[projectId]` swallows it — inside
    // `(authenticated)`, behind `requireSession()`. That is the trap, so name it.
    expect(routeResolves("/portal/accept-invitation")).toBe(true);
    expect(
      existsSync(join(APP_DIR, "(authenticated)", "portal", "[projectId]", "page.tsx")),
    ).toBe(true);
    // A path nothing serves at all must be rejected.
    expect(routeResolves("/definitely-not-a-route-xyz")).toBe(false);
  });

  it.each(PRODUCERS.map((p) => p.file))(
    "%s redirects into the unauthenticated portal route group, not the staff area",
    (file) => {
      const target = recoveryTargets().find((t) => t.file === file);
      expect(target).toBeDefined();
      const path = target!.url.split("?")[0]!;

      expect(routeResolves(path)).toBe(true);
      // The page that owns `reason=expired` / `reason=no_token` lives in `(portal)`, which has no
      // `requireSession()`. Anything under `(authenticated)` sends the client to /signin instead.
      expect(
        existsSync(join(APP_DIR, "(portal)", path.replace(/^\//, ""), "page.tsx")),
      ).toBe(true);
      expect(path.startsWith("/portal/")).toBe(false);
    },
  );

  it("the invitation page still handles both reasons the producers send", () => {
    const page = readFileSync(
      join(APP_DIR, "(portal)", "accept-invitation", "page.tsx"),
      "utf8",
    );
    for (const { reason } of PRODUCERS) {
      expect(page).toContain(`"${reason}"`);
    }
  });
});
