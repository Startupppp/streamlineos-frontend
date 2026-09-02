/**
 * @jest-environment node
 */
jest.mock("next-auth/jwt", () => ({ getToken: jest.fn() }));

import { buildContentSecurityPolicy } from "@/next.config";
import { buildCsp } from "@/proxy";
import { resolveImageUrl, storageObjectUrl } from "@/lib/utils";

const PAGE_ORIGIN = process.env.NEXTAUTH_URL ?? "http://localhost:1000";
const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500").origin;
const ORG = "3f2a9c14-5b7e-4d81-9a02-6c8e1f4b7d33";
const KEY = `${ORG}/uploads/9b1c2d3e-4f50-4a61-8b72-0c9d8e7f6a5b-avatar.png`;
const KB_KEY = `kb-media/${ORG}/cover.webp`;

function directiveSources(csp: string, name: string): string[] {
  const part = csp
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry === name || entry.startsWith(`${name} `));
  if (part === undefined) return [];
  return part.slice(name.length).trim().split(/\s+/).filter(Boolean);
}

function matchesHostSource(source: string, url: URL): boolean {
  if (source.startsWith("'")) return false;
  if (!source.includes("//") && source.endsWith(":")) return source === url.protocol;

  let remainder = source;
  const schemeAt = remainder.indexOf("://");
  if (schemeAt !== -1) {
    if (remainder.slice(0, schemeAt + 1) !== url.protocol) return false;
    remainder = remainder.slice(schemeAt + 3);
  }
  const host = remainder.split("/", 1)[0] ?? "";
  if (host.startsWith("*."))
    return url.hostname.endsWith(host.slice(1)) && url.hostname !== host.slice(2);
  return host === url.host || host === url.hostname;
}

/** The browser's own img-src decision for `<img src={emitted}>` on a page at `pageOrigin`. */
function imgSrcPermits(csp: string, emitted: string, pageOrigin: string): boolean {
  const sources = directiveSources(csp, "img-src");
  if (sources.length === 0) return false;
  if (sources.includes("*")) return true;

  const resolved = new URL(emitted, pageOrigin);
  if (resolved.protocol === "data:" || resolved.protocol === "blob:")
    return sources.includes(resolved.protocol);
  if (sources.includes("'self'") && resolved.origin === new URL(pageOrigin).origin) return true;
  return sources.some((source) => matchesHostSource(source, resolved));
}

const POLICIES: ReadonlyArray<readonly [string, string]> = [
  ["next.config.ts", buildContentSecurityPolicy()],
  ["proxy.ts", buildCsp("test-nonce", process.env.NEXT_PUBLIC_API_URL)],
];

describe("the img-src checker actually discriminates", () => {
  const permissive = "img-src 'self' data: https://*.r2.dev";

  it("permits a same-origin path only through 'self'", () => {
    expect(imgSrcPermits(permissive, "/api/media/image?key=a", PAGE_ORIGIN)).toBe(true);
    expect(imgSrcPermits("img-src data:", "/api/media/image?key=a", PAGE_ORIGIN)).toBe(false);
  });

  it("refuses a cross-origin URL whose origin is absent", () => {
    expect(imgSrcPermits(permissive, "https://other.example/a.png", PAGE_ORIGIN)).toBe(false);
  });

  it("permits a cross-origin URL once its origin is listed", () => {
    expect(
      imgSrcPermits(`img-src 'self' ${API_ORIGIN}`, `${API_ORIGIN}/storage/image?key=a`, PAGE_ORIGIN),
    ).toBe(true);
  });

  it("honours a wildcard host source", () => {
    expect(imgSrcPermits(permissive, "https://pub-1.r2.dev/a.png", PAGE_ORIGIN)).toBe(true);
    expect(imgSrcPermits(permissive, "https://r2.dev/a.png", PAGE_ORIGIN)).toBe(false);
  });

  it("finds an img-src directive in both live policies", () => {
    for (const [name, csp] of POLICIES)
      expect([name, directiveSources(csp, "img-src").length > 0]).toEqual([name, true]);
  });
});

describe("every URL resolveImageUrl emits is loadable under the configured img-src", () => {
  const emitted = [KEY, `/${KEY}`, KB_KEY, "uploads/1712-logo.png"].map((value) => {
    const url = resolveImageUrl(value);
    if (url === undefined) throw new Error(`resolveImageUrl returned nothing for ${value}`);
    return url;
  });

  it.each(POLICIES)("%s permits every emitted image URL", (_name, csp) => {
    for (const url of emitted)
      expect([url, imgSrcPermits(csp, url, PAGE_ORIGIN)]).toEqual([url, true]);
  });

  it("emits the same origin the two policies agree on", () => {
    for (const url of emitted) {
      const first = imgSrcPermits(POLICIES[0]?.[1] ?? "", url, PAGE_ORIGIN);
      const second = imgSrcPermits(POLICIES[1]?.[1] ?? "", url, PAGE_ORIGIN);
      expect([url, first]).toEqual([url, second]);
    }
  });

  it("routes an object key through the app's own origin, not the API's", () => {
    const url = storageObjectUrl(KEY);
    expect(new URL(url, PAGE_ORIGIN).origin).toBe(new URL(PAGE_ORIGIN).origin);
    expect(url.startsWith(API_ORIGIN)).toBe(false);
  });
});

describe("the pre-fix delivery path is exactly what img-src rejects", () => {
  const preFix = `${API_ORIGIN}/storage/image?key=${encodeURIComponent(KEY)}`;

  it.each(POLICIES)("%s does not list the API origin in img-src", (_name, csp) => {
    expect(imgSrcPermits(csp, preFix, PAGE_ORIGIN)).toBe(false);
    expect(directiveSources(csp, "img-src")).not.toContain(API_ORIGIN);
  });

  it("the API origin is reachable by fetch but not by an image", () => {
    for (const [, csp] of POLICIES) {
      expect(directiveSources(csp, "connect-src")).toContain(API_ORIGIN);
      expect(imgSrcPermits(csp, preFix, PAGE_ORIGIN)).toBe(false);
    }
  });
});
