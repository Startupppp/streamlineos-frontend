import { globSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

/**
 * Sites whose `src` is provably not an object key. Each entry states why, so a
 * new bare `src` cannot be waved through by adding a line without a reason.
 */
const NOT_A_STORAGE_KEY: Readonly<Record<string, string>> = {
  "components/layout/header/user-avatar-menu.tsx":
    "prop, resolved by the caller in this same file",
  "components/settings/mfa-settings.tsx": "data: URL generated for the TOTP QR",
  "features/chat/chat-attachment.tsx":
    "signed URL from GET /chat/channels/:channelId/attachments/:attachmentId",
  "features/chat/link-preview-card.tsx": "external link-preview image",
  "features/build/tickets/ticket-attachment-preview.tsx":
    "object URL of a File that has not been uploaded yet",
  "features/hr/recruitment/candidate-detail/resume-tab.tsx":
    "recruiter-supplied external resume URL, never a /storage/upload result",
  "features/hr/recruitment/kanban/candidate-sheet.tsx":
    "recruiter-supplied external resume URL, never a /storage/upload result",
  "features/wiki/components/public-page-content.tsx":
    "public KB renderer; /storage/image is Bearer-only so it needs a public read path (ticket 29)",
};

const SRC_ATTRIBUTE = /src=\{([^}]*)\}/g;
const LOOKS_LIKE_A_STORED_REFERENCE = /[Uu]rl|[Kk]ey|[Ii]mage|[Aa]vatar/;
const RESOLVED = /resolveImageUrl|resolveFileUrl|storageObjectUrl/;

function sourceFiles(): string[] {
  return globSync("{features,components}/**/*.tsx", { cwd: ROOT })
    .filter((f) => !f.includes(".test."))
    .sort();
}

function aliasIsResolved(source: string, identifier: string): boolean {
  if (!/^[A-Za-z_$][\w$]*$/.test(identifier)) return false;
  const declaration = new RegExp(
    `\\b(?:const|let|var)\\s+${identifier}\\s*(?::[^=]+)?=([^;\\n]*(?:\\n[^;]*)?)`,
  );
  const match = declaration.exec(source);
  return match !== null && RESOLVED.test(match[1] ?? "");
}

describe("a storage object key never reaches an image src un-resolved", () => {
  it("every src that can hold a stored reference goes through the resolver", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      if (file in NOT_A_STORAGE_KEY) continue;
      const source = readFileSync(path.join(ROOT, file), "utf8");
      for (const match of source.matchAll(SRC_ATTRIBUTE)) {
        const expression = (match[1] ?? "").trim();
        if (!LOOKS_LIKE_A_STORED_REFERENCE.test(expression)) continue;
        if (RESOLVED.test(expression)) continue;
        if (aliasIsResolved(source, expression)) continue;
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${file}:${line} src={${expression}}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps every allowlisted exception pointing at a file that still exists", () => {
    const present = new Set(sourceFiles());
    for (const file of Object.keys(NOT_A_STORAGE_KEY)) expect(present.has(file)).toBe(true);
  });
});

describe("the upload wire contract carries no field named url", () => {
  const UPLOAD_CALL =
    /apiClient\.upload<([^>]*)>\(\s*["'](\/storage\/upload|\/kb\/media)["']/g;

  it("no /storage/upload or /kb/media response type declares url", () => {
    const offenders: string[] = [];
    const files = globSync("{features,components,hooks,lib}/**/*.{ts,tsx}", { cwd: ROOT })
      .filter((f) => !f.includes(".test."))
      .sort();

    for (const file of files) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      for (const match of source.matchAll(UPLOAD_CALL)) {
        const typeArgument = match[1] ?? "";
        if (/\burl\s*[?:]/.test(typeArgument)) offenders.push(`${file}: ${typeArgument}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the shared upload result types declare key, not url", () => {
    for (const file of [
      "hooks/api/use-upload-file.ts",
      "hooks/api/support/kb-attachments.ts",
      "features/wiki/lib/upload-kb-media.ts",
      "components/editor/tiptap-editor.tsx",
    ]) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      const declaration = /interface \w*Upload\w*(?:Result|Media|KbMedia)?\s*\{([^}]*)\}/.exec(source);
      expect(declaration).not.toBeNull();
      const body = declaration?.[1] ?? "";
      expect(body).toContain("key");
      expect(body).not.toMatch(/\burl\s*[?:]/);
    }
  });
});
