import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { resolveHuddleEndToast, useLeaveHuddle } from "@/hooks/api/chat-huddles";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "u-me", name: "Me", image: null } },
    status: "authenticated",
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(() => "end-toast"),
  },
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
}));

const CHANNEL = 7;
const FAILED_COPY = "Huddle ended in StreamlineOS — the external meeting may still be open";

async function leave(response: object) {
  (apiClient.post as jest.Mock).mockResolvedValue(response);
  (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => undefined));
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useLeaveHuddle(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({ huddleId: 11, channelId: CHANNEL });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("huddle end toast follows the provider confirmation", () => {
  it("claims ended only when the provider confirms", async () => {
    await leave({ ok: true, providerSyncStatus: "pending" });
    expect(toast.loading).toHaveBeenCalledWith("Ending huddle...");
    expect(toast.success).not.toHaveBeenCalled();
    resolveHuddleEndToast(CHANNEL, "confirmed");
    expect(toast.success).toHaveBeenCalledWith("Huddle ended", { id: "end-toast" });
  });

  it("warns that the external meeting may still be open when the provider fails", async () => {
    await leave({ ok: true, providerSyncStatus: "pending" });
    resolveHuddleEndToast(CHANNEL, "failed");
    expect(toast.warning).toHaveBeenCalledWith(FAILED_COPY, { id: "end-toast" });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("falls back to the unconfirmed copy when no confirmation arrives", async () => {
    await leave({ ok: true, providerSyncStatus: "pending" });
    act(() => {
      jest.advanceTimersByTime(15_000);
    });
    expect(toast.warning).toHaveBeenCalledWith(FAILED_COPY, { id: "end-toast" });
    resolveHuddleEndToast(CHANNEL, "confirmed");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("says ended at once when there is no provider event to end", async () => {
    await leave({ ok: true, providerSyncStatus: "skipped" });
    expect(toast.success).toHaveBeenCalledWith("Huddle ended");
    expect(toast.loading).not.toHaveBeenCalled();
  });

  it("shows nothing when another participant is still in the huddle", async () => {
    await leave({ ok: true });
    expect(toast.loading).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
