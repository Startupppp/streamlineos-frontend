import { chatChannelFilesContract } from "@/hooks/api/chat-schema";


const WIRE_FILE = {
  id: 1,
  messageId: 10,
  fileName: "report.pdf",
  fileKey: "org-1/report.pdf",
  fileSize: 204800,
  mimeType: "application/pdf",
  createdAt: "2026-09-30T08:00:00.000Z",
};

describe("chatChannelFilesContract accepts what listChannelFiles emits", () => {
  it("accepts a file row with createdAt and no fileUrl, uploadedAt or uploadedBy", () => {
    const parsed = chatChannelFilesContract.safeParse({
      files: [WIRE_FILE],
      nextCursor: undefined,
    });
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it("still accepts a row from a deploy that does send fileUrl", () => {
    const parsed = chatChannelFilesContract.safeParse({
      files: [{ ...WIRE_FILE, fileUrl: "" }],
    });
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it("rejects a file row that is missing fileKey", () => {
    const { fileKey: _fileKey, ...withoutKey } = WIRE_FILE;
    const parsed = chatChannelFilesContract.safeParse({ files: [withoutKey] });
    expect(parsed.success).toBe(false);
  });

  it("rejects a file row that has uploadedAt instead of createdAt", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = WIRE_FILE;
    const withWrongField = { ...withoutCreatedAt, uploadedAt: "2026-09-30T08:00:00.000Z" };
    const parsed = chatChannelFilesContract.safeParse({
      files: [withWrongField],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an empty files array", () => {
    const parsed = chatChannelFilesContract.safeParse({ files: [], nextCursor: null });
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it("accepts nextCursor as a number when pagination continues", () => {
    const parsed = chatChannelFilesContract.safeParse({
      files: [WIRE_FILE],
      nextCursor: 42,
    });
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });
});
