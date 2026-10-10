import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MAIL_FEATURE_DIR = join(__dirname);
const RENDERING_COMPONENT = "mail-html-viewer.tsx";
const THREAD_VIEW_MODULE = "mail-thread-view.ts";
const RAW_RENDER_RE = /dangerouslySetInnerHTML/;

function collectSourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectSourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    found.push(full);
  }
  return found;
}

describe("mail HTML render boundary", () => {
  it("the scan detects a raw render, so a green result is meaningful", () => {
    const knownBad = `<div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />`;
    expect(RAW_RENDER_RE.test(knownBad)).toBe(true);
  });

  it("MailHtmlViewer is the only component that renders raw HTML", () => {
    const offenders = collectSourceFiles(MAIL_FEATURE_DIR)
      .filter((file) => RAW_RENDER_RE.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(MAIL_FEATURE_DIR.length + 1).replace(/\\/g, "/"));

    expect(offenders).toEqual([RENDERING_COMPONENT]);
  });

  it("the rendering component uses the pre-sanitized prop and the sanitization policy lives in the thread-view module", () => {
    const viewerSource = readFileSync(join(MAIL_FEATURE_DIR, RENDERING_COMPONENT), "utf8");
    expect(viewerSource).toContain("dangerouslySetInnerHTML={{ __html: safeHtml }}");
    expect(viewerSource).not.toMatch(/dangerouslySetInnerHTML=\{\{\s*__html:\s*html\s*\}\}/);

    const moduleSource = readFileSync(join(MAIL_FEATURE_DIR, THREAD_VIEW_MODULE), "utf8");
    expect(moduleSource).toContain("ALLOW_UNKNOWN_PROTOCOLS: false");
    expect(moduleSource).toContain("sanitizeHtml(");
  });
});
