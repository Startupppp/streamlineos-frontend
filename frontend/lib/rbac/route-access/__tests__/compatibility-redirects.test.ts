import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isUniversalRoute } from "../universal-routes";
import { resolveRouteAccess } from "../route-access";

const CONFIG_SOURCE = readFileSync(
  join(process.cwd(), "next.config.ts"),
  "utf8",
);

interface RedirectPair {
  readonly source: string;
  readonly destination: string;
}

function declaredRedirects(): RedirectPair[] {
  const pairs: RedirectPair[] = [];
  const pattern =
    /source:\s*"([^"]+)",\s*(?:has:\s*\[[^\]]*\],\s*)?destination:\s*"([^"]+)"/g;
  for (const match of CONFIG_SOURCE.matchAll(pattern))
    pairs.push({ source: match[1], destination: match[2] });
  return pairs;
}

const REDIRECTS = declaredRedirects();

function destinationFor(source: string): string | undefined {
  return REDIRECTS.find((r) => r.source === source)?.destination;
}

const RETIRED_URLS: ReadonlyArray<RedirectPair> = [
  { source: "/home", destination: "/dashboard" },
  { source: "/notifications", destination: "/inbox?view=notifications" },
  {
    source: "/notifications/preferences",
    destination: "/settings/notifications/my-preferences",
  },
  {
    source: "/notifications/templates",
    destination: "/settings/notifications/templates",
  },
  {
    source: "/notifications/broadcasts",
    destination: "/settings/notifications/broadcasts",
  },
  {
    source: "/notifications/providers",
    destination: "/settings/notifications/providers",
  },
  {
    source: "/notifications/events",
    destination: "/settings/notifications/events",
  },
  {
    source: "/notifications/policy",
    destination: "/settings/notifications/policy",
  },
  {
    source: "/settings/notifications",
    destination: "/settings/notifications/my-preferences",
  },
];

describe("compatibility redirects for the retired communication routes", () => {
  it("parses a non-trivial redirect table, so a regex that matched nothing cannot pass this suite vacuously", () => {
    expect(REDIRECTS.length).toBeGreaterThan(RETIRED_URLS.length);
  });

  it.each(RETIRED_URLS)(
    "$source still resolves for an existing bookmark, redirecting to $destination",
    ({ source, destination }) => {
      expect(destinationFor(source)).toBe(destination);
    },
  );

  it("BITE: a URL that was never retired has no redirect, so the table is not matching everything", () => {
    expect(destinationFor("/inbox")).toBeUndefined();
    expect(destinationFor("/dashboard")).toBeUndefined();
  });

  it.each(RETIRED_URLS.map((r) => r.source))(
    "%s is no longer a declared app route, so the redirect is the only thing serving it",
    (source) => {
      expect(isUniversalRoute(source)).toBe(false);
    },
  );

  it("every redirect destination is itself a reachable route rather than another retired URL", () => {
    const retiredSources = new Set(RETIRED_URLS.map((r) => r.source));
    const chained = RETIRED_URLS.filter((r) =>
      retiredSources.has(r.destination.split("?")[0]),
    ).filter((r) => r.destination.split("?")[0] !== r.source);
    expect(chained).toEqual([]);
  });

  it("the canonical destinations resolve through the route-access registry", () => {
    expect(resolveRouteAccess("/dashboard").kind).toBe("universal");
    expect(resolveRouteAccess("/inbox").kind).toBe("universal");
    expect(
      resolveRouteAccess("/settings/notifications/my-preferences").kind,
    ).toBe("universal");
    expect(resolveRouteAccess("/settings/notifications/templates").kind).toBe(
      "permission",
    );
  });
});
