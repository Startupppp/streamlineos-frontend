import { getApiErrorCode, isApiError } from "@/lib/api-client";

export interface ArRejection {
  code: string | undefined;
  lineIndex: number | undefined;
  message: string;
}

function readLineIndex(details: unknown): number | undefined {
  if (typeof details !== "object" || details === null) return undefined;
  if (!("lineIndex" in details)) return undefined;
  const value: unknown = details.lineIndex;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return undefined;
  return value;
}

export function readArRejection(error: unknown): ArRejection | null {
  if (!isApiError(error) || error.status !== 409) return null;
  return {
    code: getApiErrorCode(error),
    lineIndex: readLineIndex(error.details),
    message: error.message,
  };
}
