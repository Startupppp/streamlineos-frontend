import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backendPath, backendReachable } from "@/lib/test-support/backend-path";

/**
 * The Certificate of Completion had no way to leave the building.
 *
 * `GET sign/envelopes/:id/certificate` sits on the same controller as
 * `/final-pdf`, and only `/final-pdf` had a hook and a button. So the signed
 * document was downloadable and the record of HOW it came to be signed -- the
 * audit timeline, each signer's authentication method, the per-document
 * SHA-256 hashes, and the statement that this is tamper evidence rather than a
 * DSC or an Aadhaar eSign -- was reachable only by typing the URL.
 *
 * That is the artifact a counterparty asks for in a dispute. Producing it
 * carefully and never handing it over is the whole feature missing, not a rough
 * edge, which is why this is asserted rather than left to a manual check.
 */
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
    /*
      A hook nothing renders is the same defect one layer up, which is exactly
      how the backend route got here -- so the button is asserted too.
    */
    expect(source).toMatch(/onClick=\{handleDownloadCertificate\}/);
  });

  it("mints the link rather than caching it", () => {
    /*
      The route returns a short-lived signed URL. A `useQuery` would hand back a
      link that has since expired; its sibling is a mutation for the same reason.
    */
    const source = readFileSync(HOOKS, "utf8");
    const hook = source.slice(source.indexOf("export function useDownloadSignEnvelopeCertificate"));
    expect(hook.slice(0, hook.indexOf("}\n"))).toContain("useMutation");
  });

  it("names a route the backend actually serves", () => {
    /*
      Asserted, never skipped: five cross-repo guards in this repo once resolved
      to a path that does not exist and stayed green for months.
    */
    const relative = "src/modules/e-sign/sign-certificates.controller.ts";
    expect(backendReachable(relative)).toBe(true);
    const controller = readFileSync(backendPath(relative), "utf8");
    expect(controller).toMatch(/@Get\(":envelopeId\/certificate"\)/);
  });
});
