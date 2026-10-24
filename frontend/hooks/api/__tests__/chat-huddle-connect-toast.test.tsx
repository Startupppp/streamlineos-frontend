import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { useStartHuddle } from "@/hooks/api/chat-huddles";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
}));

type ToastOptions = { action?: { label: string; onClick: () => void } };

const assign = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign },
  });
});

async function failStart(error: ApiError) {
  (apiClient.post as jest.Mock).mockRejectedValue(error);
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useStartHuddle(), { wrapper });
  await act(async () => {
    await hook.result.current.mutateAsync({ channelId: 7 }).catch(() => undefined);
  });
  const [message, options] = (toast.error as jest.Mock).mock.calls[0] as [string, ToastOptions | undefined];
  return { message, options };
}

const CONNECT_DETAILS = { connectPath: "/calendar?accounts=1" };

describe("useStartHuddle error handling by backend code", () => {
  it("shows the connect copy for HUDDLE_NO_CONNECTION and navigates to details.connectPath", async () => {
    const { message, options } = await failStart(
      new ApiError("No calendar", 412, "HUDDLE_NO_CONNECTION", CONNECT_DETAILS),
    );
    expect(options?.action?.label).toBe("Connect calendar");
    expect(message).toBe("Connect Google or Microsoft calendar to start a meeting");
    options?.action?.onClick();
    expect(assign).toHaveBeenCalledWith("/calendar?accounts=1");
  });

  it.each([
    ["google_meet", "Reconnect Google to start a meeting", "Reconnect Google"],
    ["microsoft_teams", "Reconnect Microsoft to start a meeting", "Reconnect Microsoft"],
    [undefined, "Reconnect your calendar to start a meeting", "Reconnect calendar"],
  ])("shows provider-aware reconnect copy for HUDDLE_RECONNECT with provider %s", async (provider, text, label) => {
    const { message, options } = await failStart(
      new ApiError("Expired", 412, "HUDDLE_RECONNECT", { ...CONNECT_DETAILS, provider }),
    );
    expect(message).toBe(text);
    expect(options?.action?.label).toBe(label);
    options?.action?.onClick();
    expect(assign).toHaveBeenCalledWith("/calendar?accounts=1");
  });

  it("explains Teams for Business is required for HUDDLE_TEAMS_UNSUPPORTED", async () => {
    const { message } = await failStart(
      new ApiError("Unsupported", 412, "HUDDLE_TEAMS_UNSUPPORTED", CONNECT_DETAILS),
    );
    expect(message).toMatch(/Teams for Business/);
  });

  it("refuses to navigate to a connectPath that leaves the app", async () => {
    const { options } = await failStart(
      new ApiError("No calendar", 412, "HUDDLE_NO_CONNECTION", { connectPath: "//evil.example/x" }),
    );
    options?.action?.onClick();
    expect(assign).toHaveBeenCalledWith("/calendar?accounts=1");
  });

  it("falls back to the default connect path when details are missing", async () => {
    const { options } = await failStart(new ApiError("No calendar", 412, "HUDDLE_NO_CONNECTION"));
    options?.action?.onClick();
    expect(assign).toHaveBeenCalledWith("/calendar?accounts=1");
  });

  it("makes HUDDLE_PROVIDER_UNAVAILABLE retryable with Try again, retrying the same channel", async () => {
    const { options } = await failStart(new ApiError("Provider down", 503, "HUDDLE_PROVIDER_UNAVAILABLE"));
    expect(options?.action?.label).toBe("Try again");
    (apiClient.post as jest.Mock).mockClear();
    (apiClient.post as jest.Mock).mockRejectedValue(new Error("again"));
    await act(async () => {
      options?.action?.onClick();
    });
    expect((apiClient.post as jest.Mock).mock.calls[0]?.[0]).toBe("/chat/channels/7/huddle/start");
  });

  it("explains the free plan limit for FEATURE_NOT_AVAILABLE and links to billing", async () => {
    const { message, options } = await failStart(
      new ApiError("Upgrade", 402, "FEATURE_NOT_AVAILABLE", {
        feature: "chatGroupHuddles",
        upgradePath: "/settings/billing",
      }),
    );
    expect(message).toMatch(/direct messages/i);
    expect(options?.action?.label).toBe("View plans");
    options?.action?.onClick();
    expect(assign).toHaveBeenCalledWith("/settings/billing");
  });

  it("shows the server message for an uncoded failure", async () => {
    const { message, options } = await failStart(new ApiError("Boom", 500));
    expect(message).toBe("Boom");
    expect(options).toBeUndefined();
  });
});
