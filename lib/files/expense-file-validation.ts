export const RECEIPT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export const RECEIPT_ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"] as const;

export const RECEIPT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const IMPORT_ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const IMPORT_ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"] as const;

export const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function fileHasAllowedExtension(fileName: string, allowedExtensions: readonly string[]): boolean {
  const lowerName = fileName.toLowerCase();
  return allowedExtensions.some((ext) => lowerName.endsWith(ext));
}

export function validateFileTypeAndSize(options: {
  file: File;
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
  maxSizeBytes: number;
}): string | null {
  const { file, allowedMimeTypes, allowedExtensions, maxSizeBytes } = options;
  const isAllowedMime = allowedMimeTypes.includes(file.type);
  const isAllowedExtension = fileHasAllowedExtension(file.name, allowedExtensions);

  if (!isAllowedMime && !isAllowedExtension) {
    return "File type not supported";
  }

  if (file.size > maxSizeBytes) {
    return `File is too large (max ${Math.floor(maxSizeBytes / (1024 * 1024))}MB)`;
  }

  return null;
}
