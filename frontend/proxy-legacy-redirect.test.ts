/**
 * @jest-environment node
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import {
  legacyRedirectHits,
  resetLegacyRedirectCounts,
} from "@/lib/observability/legacy-redirect";

function request(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

describe("proxy observes the two code-owned Build compatibility redirects", () => {
  let origInfo: typeof console.info;

  beforeEach(() => {
    resetLegacyRedirectCounts();
    origInfo = console.info;
    console.info = (): void => {};
  });

  afterEach(() => {
    console.info = origInfo;
    resetLegacyRedirectCounts();
  });

  it("keeps the code-owned Build redirect inventory exact", () => {
    const source = readFileSync(resolve(process.cwd(), "proxy.ts"), "utf8");
    const observedSources = [
      ...source.matchAll(/recordLegacyRedirect\("([^"]+)"/g),
    ].map((match) => match[1]);

    expect(observedSources).toEqual(["/projects", "/product-management"]);
  });

  it("still redirects /projects into /build with the search preserved", async () => {
    const res = await proxy(request("https://app.test/projects/7/issues?type=BUG"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://app.test/build/7/issues?type=BUG",
    );
  });

  it("counts a /projects hit so the redirect's traffic is observable", async () => {
    expect(legacyRedirectHits("/projects")).toBe(0);
    await proxy(request("https://app.test/projects/7"));
    expect(legacyRedirectHits("/projects")).toBe(1);
    await proxy(request("https://app.test/projects"));
    expect(legacyRedirectHits("/projects")).toBe(2);
  });

  it("still redirects /product-management into /build and counts it separately", async () => {
    const res = await proxy(request("https://app.test/product-management/roadmap"));
    expect(res.headers.get("location")).toBe("https://app.test/build/roadmap");
    expect(legacyRedirectHits("/product-management")).toBe(1);
    expect(legacyRedirectHits("/projects")).toBe(0);
  });

  it("counts nothing for a path that is not a legacy Build family", async () => {
    await proxy(request("https://app.test/signup"));
    expect(legacyRedirectHits("/projects")).toBe(0);
    expect(legacyRedirectHits("/product-management")).toBe(0);
  });
});
