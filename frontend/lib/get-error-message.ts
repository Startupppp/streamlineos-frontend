const NETWORK_PATTERN = /failed to fetch|networkerror|network request failed|load failed|fetch failed/i;

function statusFallback(code: number): string {
  if (code === 400) return "The request was invalid. Please check your input and try again.";
  if (code === 401) return "Your session expired. Please sign in again.";
  if (code === 403) return "You don't have permission for this action.";
  if (code === 404) return "The requested item could not be found.";
  if (code === 408) return "The request timed out. Please try again.";
  if (code === 409) return "This action conflicts with existing data.";
  if (code === 413) return "The file or request is too large.";
  if (code === 422) return "Some of the information provided is invalid.";
  if (code === 429) return "Too many requests. Please wait a moment and try again.";
  if (code >= 500) return "Something went wrong on our end. Please try again shortly.";
  return "The request could not be completed. Please try again.";
}

function extractMessage(error: unknown): string {
  if (typeof error === "string") return error.trim();
  if (error instanceof Error) return error.message.trim();
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string") return error.message.trim();
    if ("error" in error && typeof error.error === "string") return error.error.trim();
  }
  return "";
}

export function getErrorMessage(error: unknown): string {
  const message = extractMessage(error);
  if (!message) return "Something went wrong. Please try again.";
  if (NETWORK_PATTERN.test(message)) return "Network error. Check your connection and try again.";

  const bareStatus = message.match(/^(\d{3})(\s|$)/);
  if (bareStatus) return statusFallback(Number(bareStatus[1]));

  return message;
}
