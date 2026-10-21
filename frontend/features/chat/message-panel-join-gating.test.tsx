import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { CHANNEL_ID, ablyMock, freshClient, wrapperFor } from "@/hooks/api/chat-cache-test-harness";
import { useMessagePanelData } from "./use-message-panel-data";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: true }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useCanState: jest.fn().mockReturnValue("allowed"),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));
jest.mock("@/hooks/api/authorized-mutation", () => {
  const { useMutation } = jest.requireActual("@tanstack/react-query");
  return { useAuthorizedMutation: (_scope: string, options: unknown) => useMutation(options) };
});
jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));
jest.mock("sonner", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), dismiss: jest.fn() }) }));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };
const mockedGet = jest.mocked(apiClient.get);

const channelPrefix = `/chat/channels/${CHANNEL_ID}`;

function channelScopedReads(): string[] {
  return mockedGet.mock.calls.map(([path]) => String(path)).filter((path) => path.startsWith(channelPrefix));
}

beforeEach(() => {
  jest.clearAllMocks();
  useAbly.mockReturnValue(ablyMock());
  mockedGet.mockImplementation((path: string) => {
    if (path.startsWith(channelPrefix))
      return Promise.reject(
        new ApiError("Join #general to read its messages", 403, "CHAT_CHANNEL_JOIN_REQUIRED", {
          channelId: String(CHANNEL_ID),
          channelName: "general",
        }),
      );
    if (path === "/chat/channels") return Promise.resolve({ channels: [], nextCursor: null });
    return new Promise(() => undefined);
  });
});

describe("a non-member deep link reads the timeline once and nothing else channel-scoped", () => {
  it("lands on the join state after a single 403", async () => {
    const { result } = renderHook(
      () =>
        useMessagePanelData({
          channelId: CHANNEL_ID,
          currentUserId: "user-1",
          onBack: jest.fn(),
          onToggleInfo: jest.fn(),
          showInfoPanel: false,
          scrollToMessageId: 41,
        }),
      { wrapper: wrapperFor(freshClient()) },
    );

    await waitFor(() => expect(result.current.workspace.messageList.joinRequired).toEqual({ channelName: "general" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(channelScopedReads()).toEqual([`${channelPrefix}/messages`]);
    expect(jest.mocked(apiClient.post).mock.calls.map(([path]) => String(path)).filter((path) => path.startsWith(channelPrefix))).toEqual([]);
  });
});
