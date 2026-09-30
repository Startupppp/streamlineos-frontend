import { chatChannelFilesContract } from "@/hooks/api/chat-schema";

/**
 * `chatChannelFilesContract` must accept what `listChannelFiles` actually emits.
 *
 * The old contract required `uploadedAt`, `uploadedBy` — neither is projected.
 * It declared `fileUrl` but the backend never selected it.
 * The backend returns `createdAt` (from `chat_attachments.created_at`), not `uploadedAt`.
 *
 * Both mismatches caused the shared-files panel to show a "server error" overlay
 * on every load: Zod's parse threw because required fields were absent.
 */

const WIRE_FILE = {
  id: 1,
  messageId: 10,
  fileName: "report.pdf",
  fileUrl: "https://cdn.example.com/org-1/report.pdf",
  fileKey: "org-1/report.pdf",
  fileSize: 204800,
  mimeType: "application/pdf",
  createdAt: "2026-09-30T08:00:00.000Z",
};

describe("chatChannelFilesContract accepts what listChannelFiles emits", () => {
  it("accepts a file row with createdAt and fileUrl but no uploadedAt or uploadedBy", () => {
    const parsed = chatChannelFilesContract.safeParse({
      files: [WIRE_FILE],
      nextCursor: undefined,
    });
    expect(parsed.success ? [] : parsed.error.issues).toEqual([]);
  });

  it("rejects a file row that is missing fileUrl", () => {
    const { fileUrl: _fileUrl, ...withoutUrl } = WIRE_FILE;
    const parsed = chatChannelFilesContract.safeParse({
      files: [withoutUrl],
    });
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
