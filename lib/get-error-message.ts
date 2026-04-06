import axios from "axios";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "object" && data !== null && "error" in data) {
      return String((data as { error: string }).error);
    }
    if (error.response?.status === 401) return "Session expired. Please sign in again.";
    if (error.response?.status === 403) return "You don't have permission for this action.";
    if (error.response?.status === 404) return "The requested resource was not found.";
    if (error.response?.status === 409) return "A conflict occurred. The item may already exist.";
    if (error.response?.status === 429) return "Too many requests. Please wait a moment.";
    if (error.response?.status && error.response.status >= 500) return "Server error. Please try again later.";
    return error.message || "Request failed";
  }
  if (error instanceof Error) {
    if (error.message.includes("Network Error")) return "Network error. Check your connection.";
    return error.message;
  }
  if (typeof error === "string") return error;
  return "Something went wrong";
}
