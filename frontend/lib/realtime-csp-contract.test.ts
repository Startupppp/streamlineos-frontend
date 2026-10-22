jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

import { buildCsp } from "@/proxy";

const PAGE_ORIGIN = process.env.NEXTAUTH_URL ?? "http://localhost:1000";

const ABLY_CONNECTIONS = [
  "wss://main.realtime.ably.net/",
  "https://main.realtime.ably.net/",
  "wss://main.a.fallback.ably-realtime.com/",
  "https://main.a.fallback.ably-realtime.com/",
  "wss://main.e.fallback.ably-realtime.com/",
  "https://internet-up.ably-realtime.com/is-the-internet-up.txt",
  "wss://ws-up.ably-realtime.com/",
];

function directiveSources(csp: string, name: string): string[] {
  const part = csp
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry === name || entry.startsWith(`${name} `));
  if (part === undefined) return [];
  return part.slice(name.length).trim().split(/\s+/).filter(Boolean);
}

function schemeMatches(expressionScheme: string, urlScheme: string): boolean {
  if (expressionScheme === "http") return urlScheme === "http" || urlScheme === "https";
  if (expressionScheme === "ws")
    return ["ws", "wss", "http", "https"].includes(urlScheme);
  if (expressionScheme === "wss") return urlScheme === "wss" || urlScheme === "https";
  return expressionScheme === urlScheme;
}

function hostMatches(hostPart: string, url: URL): boolean {
  const host = hostPart.split("/", 1)[0] ?? "";
  if (host === "*") return true;
  if (host.startsWith("*."))
    return url.hostname.endsWith(host.slice(1)) && url.hostname !== host.slice(2);
  return host === url.host || host === url.hostname;
}

function sourcePermits(source: string, url: URL): boolean {
  if (source.startsWith("'")) return false;
  const urlScheme = url.protocol.slice(0, -1);
  const schemeAt = source.indexOf("://");
  if (schemeAt === -1) {
    if (source.endsWith(":")) return schemeMatches(source.slice(0, -1), urlScheme);
    return hostMatches(source, url);
  }
  if (!schemeMatches(source.slice(0, schemeAt), urlScheme)) return false;
  return hostMatches(source.slice(schemeAt + 3), url);
}

function connectSrcPermits(csp: string, target: string, pageOrigin: string): boolean {
  const declared = directiveSources(csp, "connect-src");
  const sources = declared.length > 0 ? declared : directiveSources(csp, "default-src");
  if (sources.length === 0) return true;
  if (sources.includes("*")) return true;
  const url = new URL(target);
  if (sources.includes("'self'") && url.origin === new URL(pageOrigin).origin) return true;
  return sources.some((source) => sourcePermits(source, url));
}

function withoutAblySources(csp: string): string {
  return csp.replace(/ [^\s;]*ably[^\s;]*/g, "");
}

const POLICIES: ReadonlyArray<readonly [string, string]> = [
  ["proxy.ts", buildCsp("test-nonce", process.env.NEXT_PUBLIC_API_URL)],
];

describe("the connect-src checker actually discriminates", () => {
  it("permits a listed host and refuses an unlisted one", () => {
    const csp = "connect-src 'self' wss://a.example";
    expect(connectSrcPermits(csp, "wss://a.example/x", PAGE_ORIGIN)).toBe(true);
    expect(connectSrcPermits(csp, "wss://b.example/x", PAGE_ORIGIN)).toBe(false);
  });

  it("refuses a wss: request against an https: source, which is why both are listed", () => {
    const csp = "connect-src 'self' https://a.example";
    expect(connectSrcPermits(csp, "https://a.example/x", PAGE_ORIGIN)).toBe(true);
    expect(connectSrcPermits(csp, "wss://a.example/x", PAGE_ORIGIN)).toBe(false);
  });

  it("permits a wss: request against a wss: source in both schemes", () => {
    const csp = "connect-src 'self' wss://a.example";
    expect(connectSrcPermits(csp, "https://a.example/x", PAGE_ORIGIN)).toBe(true);
  });

  it("honours a wildcard host source without matching the bare apex", () => {
    const csp = "connect-src wss://*.example.com";
    expect(connectSrcPermits(csp, "wss://a.b.example.com/", PAGE_ORIGIN)).toBe(true);
    expect(connectSrcPermits(csp, "wss://example.com/", PAGE_ORIGIN)).toBe(false);
  });

  it("falls back to default-src when connect-src is absent", () => {
    expect(connectSrcPermits("default-src 'self'", "wss://a.example/", PAGE_ORIGIN)).toBe(false);
    expect(
      connectSrcPermits("default-src 'self' wss://a.example", "wss://a.example/", PAGE_ORIGIN),
    ).toBe(true);
  });

  it("finds a connect-src directive in the live policy", () => {
    for (const [name, csp] of POLICIES)
      expect([name, directiveSources(csp, "connect-src").length > 0]).toEqual([name, true]);
  });
});

describe("every connection the Ably client opens is permitted", () => {
  it.each(POLICIES)("%s permits every Ably endpoint", (_name, csp) => {
    for (const target of ABLY_CONNECTIONS)
      expect([target, connectSrcPermits(csp, target, PAGE_ORIGIN)]).toEqual([target, true]);
  });

  it.each(POLICIES)("%s does not open connect-src to every wss: host", (_name, csp) => {
    expect(connectSrcPermits(csp, "wss://attacker.example/", PAGE_ORIGIN)).toBe(false);
    expect(directiveSources(csp, "connect-src")).not.toContain("wss:");
    expect(directiveSources(csp, "connect-src")).not.toContain("*");
  });
});

describe("Companion live voice", () => {
  it.each(POLICIES)("%s permits the WebRTC SDP exchange with OpenAI", (_name, csp) => {
    expect(connectSrcPermits(csp, "https://api.openai.com/v1/realtime/calls", PAGE_ORIGIN)).toBe(true);
    expect(connectSrcPermits(csp, "https://unrelated.example/v1/realtime/calls", PAGE_ORIGIN)).toBe(false);
  });
});

describe("the Ably sources are what permits those connections", () => {
  it.each(POLICIES)("%s refuses every Ably endpoint once they are struck out", (_name, csp) => {
    const atHead = withoutAblySources(csp);
    expect(directiveSources(atHead, "connect-src").length).toBeGreaterThan(0);
    for (const target of ABLY_CONNECTIONS)
      expect([target, connectSrcPermits(atHead, target, PAGE_ORIGIN)]).toEqual([target, false]);
  });
});
