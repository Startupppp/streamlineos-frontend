const CHAT_ATTACHMENT_MIME_TYPES = [
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

const CHAT_ATTACHMENT_EXTENSIONS = [".doc", ".docx", ".xls", ".xlsx"] as const;

export const CHAT_ATTACHMENT_ACCEPT = [
  ...CHAT_ATTACHMENT_MIME_TYPES,
  ...CHAT_ATTACHMENT_EXTENSIONS,
].join(",");

export const CHAT_ATTACHMENT_SUMMARY = "images, PDF, Word or Excel";

export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export function isAllowedChatAttachment(file: { name: string; type: string }): boolean {
  const mime = file.type.toLowerCase();
  if (CHAT_ATTACHMENT_MIME_TYPES.some((allowed) => allowed === mime)) return true;
  const name = file.name.toLowerCase();
  return CHAT_ATTACHMENT_EXTENSIONS.some((extension) => name.endsWith(extension));
}
