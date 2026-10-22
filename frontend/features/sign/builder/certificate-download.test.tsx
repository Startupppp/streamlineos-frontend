import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";

const HOOKS = join(__dirname, "../../../hooks/api/sign/envelopes.ts");
const TOP_BAR = join(__dirname, "builder-top-bar.tsx");

describe("the completion certificate is reachable from the product", () => {
  it("has a hook calling the exact backend path", () => {
    const source = readFileSync(HOOKS, "utf8");
    expect(source).toContain("useDownloadSignEnvelopeCertificate");
    expect(source).toContain("`/sign/envelopes/${id}/certificate`");
  });

  it("is offered beside the signed PDF once the envelope is completed", () => {
    const source = readFileSync(TOP_BAR, "utf8");
    expect(source).toContain("useDownloadSignEnvelopeCertificate");
    expect(source).toContain("handleDownloadCertificate");
    expect(source).toMatch(/onClick=\{handleDownloadCertificate\}/);
  });

  it("mints the link rather than caching it", () => {
    const source = readFileSync(HOOKS, "utf8");
    const hook = source.slice(source.indexOf("export function useDownloadSignEnvelopeCertificate"));
    const body = hook.slice(0, hook.indexOf("}\n"));
    expect(body).toMatch(/\buse[A-Za-z]*Mutation\(/);
    expect(body).not.toMatch(/\buse[A-Za-z]*Query\(/);
  });

  it("names a route the backend actually serves", () => {
    const relative = "src/modules/e-sign/sign-certificates.controller.ts";
    expect(backendReachable(relative)).toBe(true);
    const controller = readFileSync(backendPath(relative), "utf8");
    expect(controller).toMatch(/@Get\(":envelopeId\/certificate"\)/);
  });
});
