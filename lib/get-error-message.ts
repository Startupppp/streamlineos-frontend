export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.startsWith("401")) return "Session expired. Please sign in again.";
    if (msg.startsWith("403")) return "You don't have permission for this action.";
    if (msg.startsWith("404")) return "The requested resource was not found.";
    if (msg.startsWith("409")) return "A conflict occurred. The item may already exist.";
    if (msg.startsWith("429")) return "Too many requests. Please wait a moment.";
    if (/^5\d\d/.test(msg)) return "Server error. Please try again later.";
    if (msg.includes("Failed to fetch") || msg.includes("Network")) return "Network error. Check your connection.";
    return msg;
  }
  if (typeof error === "string") return error;
  return "Something went wrong";
}
