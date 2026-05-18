export {
  validateFileTypeAndSize,
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_ALLOWED_EXTENSIONS,
  RECEIPT_MAX_FILE_SIZE_BYTES,
  IMPORT_ALLOWED_MIME_TYPES,
  IMPORT_ALLOWED_EXTENSIONS,
  IMPORT_MAX_FILE_SIZE_BYTES,
} from "@/lib/files/expense-file-validation";

export {
  DOCUMENT_DESCRIPTION_MAX,
  DOCUMENT_NAME_MAX,
} from "@/lib/validations/hr-documents";

/** Default HR document library upload allowlist (matches upload dialog). */
export const DOCUMENT_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export const DOCUMENT_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
] as const;

export const DOCUMENT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
