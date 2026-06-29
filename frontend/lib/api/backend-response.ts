export function unwrapBackendJson<T>(json: unknown): T {
  if (
    json !== null &&
    typeof json === "object" &&
    "success" in json &&
    (json as { success: boolean }).success === true &&
    "data" in json
  ) {
    return (json as { data: T }).data;
  }
  return json as T;
}

export function backendApiBaseUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (process.env.NODE_ENV === "development") return "http://localhost:1500";
  return undefined;
}

export function backendJwtSecret(): string | undefined {
  return process.env.BACKEND_JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
}
