import { chatChannelFilesContract } from "@/hooks/api/chat-schema";

/**
 * `chatChannelFilesContract` must accept what `listChannelFiles` actually emits.
 *
 * The old contract required `uploadedAt`, `uploadedBy` — neither is projected.
 * The backend returns `createdAt` (from `chat_attachments.created_at`), not `uploadedAt`.
 *
 * It also required `fileUrl`, which the projection does not select: the column is
 * written empty on every insert and a chat attachment is fetched through
 * `GET /chat/channels/:id/attachments/:attachmentId/url`. That requirement refused
 * every non-empty page with `files.0.fileUrl: expected string, received undefined`,
 * so the panel showed "Couldn't load shared files" over attachments that had
 * uploaded fine (CHAT-001). A row with no `fileUrl` is now the contract.
 *
 * Each mismatch showed the same symptom: a "server error" overlay on every load,
 * because Zod's parse threw when a required field was absent.
 */

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
