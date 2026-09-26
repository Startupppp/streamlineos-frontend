import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import { readErrorExceptNotFoundReachesBoundary, readErrorReachesBoundary } from "@/lib/query-error-policy";
import { useLinkedDocument, useLinkedDocuments } from "./linked-documents";

const mockGet = jest.fn();
jest.mock("@/lib/api-client", () => ({ apiClient: { get: (...a: unknown[]) => mockGet(...a), post: jest.fn() } }));
jest.mock("@/hooks/api/access", () => {
  const { permissionGate } = jest.requireActual<typeof import("@/lib/rbac/permission-gate")>("@/lib/rbac/permission-gate");
  return {
    useCan: () => true,
    usePermissionGate: (permission: Parameters<typeof permissionGate>[0]) => permissionGate(permission, true, true),
    useAccess: () => ({ data: { scopes: {} }, refetch: jest.fn() }),
  };
});

function appClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, throwOnError: readErrorReachesBoundary }, mutations: { retry: false } },
  });
}

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const notFound = () => new ApiError("Not Found", 404, "NOT_FOUND", {}, "/kb/linked-documents/9");

beforeEach(() => {
  jest.clearAllMocks();
  client = appClient();
});

describe("a company document that answers 404 stays on the page", () => {
  it("the detail read reports the 404 to the page, and does not throw it to the route's error page", async () => {
    mockGet.mockRejectedValue(notFound());

    const { result } = renderHook(() => useLinkedDocument(9), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });

  it("the list read does the same", async () => {
    mockGet.mockRejectedValue(notFound());

    const { result } = renderHook(() => useLinkedDocuments(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("every other failure still follows the app default", () => {
    const state = { state: { data: undefined } };
    expect(readErrorExceptNotFoundReachesBoundary(notFound(), state)).toBe(false);
    expect(readErrorExceptNotFoundReachesBoundary(new ApiError("Boom", 500, "INTERNAL", {}, "/x"), state)).toBe(true);
    expect(readErrorExceptNotFoundReachesBoundary(new ApiError("Denied", 403, "FORBIDDEN", {}, "/x"), state)).toBe(false);
    expect(readErrorReachesBoundary(notFound(), state)).toBe(true);
  });
});
