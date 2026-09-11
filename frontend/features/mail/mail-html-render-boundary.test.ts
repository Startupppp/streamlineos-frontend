import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MAIL_FEATURE_DIR = join(__dirname);
const SANITIZING_RENDERER = "mail-html-viewer.tsx";
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

    expect(offenders).toEqual([SANITIZING_RENDERER]);
  });

  it("the sanitizing renderer never passes provider HTML through unsanitized", () => {
    const source = readFileSync(join(MAIL_FEATURE_DIR, SANITIZING_RENDERER), "utf8");

    expect(source).toContain("dangerouslySetInnerHTML={{ __html: sanitized }}");
    expect(source).not.toMatch(/dangerouslySetInnerHTML=\{\{\s*__html:\s*html\s*\}\}/);
    expect(source).toContain("ALLOW_UNKNOWN_PROTOCOLS: false");
  });
});
