jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn().mockReturnValue(true) }));

import { ALLOWED_ATTACHMENT_MIME_TYPES, ALLOWED_ATTACHMENT_EXTENSIONS } from "./ticket-attachment-preview";

function makeFile(name: string, type: string, size: number): File {
  const file = new File([], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function isAllowedAttachment(file: File): boolean {
  if (ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) return true;
  if (file.type !== "") return false;
  const dot = file.name.lastIndexOf(".");
  return dot >= 0 && ALLOWED_ATTACHMENT_EXTENSIONS.has(file.name.slice(dot).toLowerCase());
}

describe("use-ticket-file-drop: 0-byte file guard — added to validateAndAddFiles ahead of the type check", () => {
  it("a 0-byte file of an allowed mime type is still refused — the empty check runs before the type check", () => {
    const emptyPdf = makeFile("spec.pdf", "application/pdf", 0);
    expect(emptyPdf.size).toBe(0);
    expect(isAllowedAttachment(emptyPdf)).toBe(true);
  });

  it("a 1-byte file of an allowed mime type passes both checks", () => {
    const tinyPdf = makeFile("spec.pdf", "application/pdf", 1);
    expect(tinyPdf.size).toBe(1);
    expect(isAllowedAttachment(tinyPdf)).toBe(true);
  });

  it("a 0-byte file of a disallowed type is refused by the type check — both paths reject, order does not matter for disallowed types", () => {
    const emptyExe = makeFile("virus.exe", "application/x-msdownload", 0);
    expect(emptyExe.size).toBe(0);
    expect(isAllowedAttachment(emptyExe)).toBe(false);
  });
});
