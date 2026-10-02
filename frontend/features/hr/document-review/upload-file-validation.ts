export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const UPLOAD_ACCEPT_ATTRIBUTE = "application/pdf,image/*,.doc,.docx";

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "heic"];

function isAllowedType(file: File): boolean {
  if (file.type === "application/pdf") return true;
  if (file.type.startsWith("image/")) return true;
  if (file.type === "application/msword") return true;
  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return true;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.includes(extension);
}

export function uploadFileRejection(file: File): string | null {
  if (file.size === 0)
    return `"${file.name}" is empty. Pick a file with content in it.`;
  if (file.size > UPLOAD_MAX_BYTES)
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB — compress it or upload a smaller scan.`;
  if (!isAllowedType(file))
    return `"${file.name}" is not an accepted file type. Upload a PDF, an image, or a Word document.`;
  return null;
}
