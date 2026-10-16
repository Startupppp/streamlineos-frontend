import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import { useCalendarAdminPolicy, useCalendarAnalytics } from "./calendar-admin";
import { useCalendarWorkflowEffects, useCalendarWorkflowPolicy, useCalendarWorkflowRules } from "./calendar-workflows";
import { useCalendarDeveloperCredentials } from "./calendar-developer";

const get = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => ({ allowed: true, denied: false, pending: false, unavailable: false }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
  isApiError: () => false,
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, throwOnError: readErrorReachesBoundary } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it.each([
  ["governance", () => useCalendarAdminPolicy()],
  ["analytics", () => useCalendarAnalytics("2026-09-01", "2026-10-01")],
  ["workflow policy", () => useCalendarWorkflowPolicy()],
  ["workflow rules", () => useCalendarWorkflowRules()],
  ["workflow effects", () => useCalendarWorkflowEffects()],
  ["developer credentials", () => useCalendarDeveloperCredentials()],
])("keeps a failed Calendar %s read in its own retry state", async (_name, useRead) => {
  get.mockReset().mockRejectedValue(new Error("Calendar read unavailable"));
  const { result } = renderHook(useRead, { wrapper });

  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toEqual(new Error("Calendar read unavailable"));
  expect(get).toHaveBeenCalledTimes(1);
});
