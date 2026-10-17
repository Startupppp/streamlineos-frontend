import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { HUDDLE_CONNECT_PATH, useStartHuddle } from "@/hooks/api/chat-huddles";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
}));

/**
 * CHAT-009: a huddle is a Google Meet room, so starting one without a usable Google Calendar
 * connection is a 412 by design. The toast must say how to fix it and take the user there.
 */
describe("useStartHuddle — no connected Google account", () => {
  it("offers a Connect Google Calendar action that opens the calendar accounts sheet", async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(
      new ApiError("Huddles run on Google Meet…", 412),
    );
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useStartHuddle(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(7).catch(() => undefined);
    });

    const [, options] = (toast.error as jest.Mock).mock.calls[0] as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(options.action.label).toBe("Connect Google Calendar");
    expect(HUDDLE_CONNECT_PATH).toBe("/calendar?accounts=1");
  });
});
