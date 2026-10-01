/**
 * The one statement of what a chat attachment may be.
 *
 * `message-input.tsx` put this list in the file input's `accept`, which the OS picker
 * honours and a paste or a drag does not — those paths reached `POST /storage/upload`
 * and came back with a bare "File type not allowed" that named neither the file nor
 * what would have been allowed. The `title` on the attach control advertised only the
 * size limit (CHAT-S06). One list, read by the picker, the guard and the copy.
 */
export const CHAT_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

/** Extensions for the formats whose MIME type a browser reports inconsistently. */
const CHAT_ATTACHMENT_EXTENSIONS = [".doc", ".docx", ".xls", ".xlsx"] as const;

export const CHAT_ATTACHMENT_ACCEPT = [
  ...CHAT_ATTACHMENT_MIME_TYPES,
  ...CHAT_ATTACHMENT_EXTENSIONS,
].join(",");

/** Plain-language form of the same list, for a tooltip or a rejection message. */
export const CHAT_ATTACHMENT_SUMMARY = "images, PDF, Word or Excel";

export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export function isAllowedChatAttachment(file: { name: string; type: string }): boolean {
  const mime = file.type.toLowerCase();
  if (CHAT_ATTACHMENT_MIME_TYPES.some((allowed) => allowed === mime)) return true;
  // An empty or wrong `type` is common for Office files; fall back to the extension.
  const name = file.name.toLowerCase();
  return CHAT_ATTACHMENT_EXTENSIONS.some((extension) => name.endsWith(extension));
}
