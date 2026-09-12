import { getApiErrorCode, isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

export function describeBillWriteError(
  error: unknown,
  vendorName: string,
  vendorDocumentNumber: string,
): string {
  if (!isApiError(error) || error.status !== 409) return getErrorMessage(error);

  if (getApiErrorCode(error) === "DUPLICATE_VENDOR_DOCUMENT_NUMBER") {
    return `${vendorName} already has a bill numbered ${vendorDocumentNumber}. Open that bill instead of entering it twice.`;
  }
  if (getApiErrorCode(error) === "DUPLICATE_DOCUMENT_NUMBER") {
    return "That bill number is already used in this book. Save again to take the next one.";
  }
  return getErrorMessage(error);
}
