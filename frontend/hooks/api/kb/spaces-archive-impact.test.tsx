import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { clearBackendTokenCache, resetOutageCircuit, seedBackendToken } from "@/lib/api-client";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { useKbSpaceArchiveImpact } from "./spaces";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

installAbortSignalPolyfill();

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  resetOutageCircuit();
  clearBackendTokenCache();
  seedBackendToken("header." + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url") + ".signature");
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, throwOnError: true } } });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearBackendTokenCache();
  client.clear();
});

it("keeps archive impact read failures inline for confirmation retry", async () => {
  fetchMock.mockRejectedValueOnce(new Error("offline"));

  const { result } = renderHook(() => useKbSpaceArchiveImpact(10, { enabled: true }), { wrapper });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBeTruthy();
});
