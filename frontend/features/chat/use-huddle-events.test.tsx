import { act, renderHook, waitFor } from "@testing-library/react";
import { ablyMock } from "@/hooks/api/chat-cache-test-harness";
import type { HuddleParticipant } from "@/types/chat";
import { useHuddleEvents } from "./use-huddle-events";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "u-me" } }, status: "authenticated" }),
}));
jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("./use-ably-connection", () => ({ useAblyConnection: () => ({ isConnected: true }) }));
jest.mock("sonner", () => ({ toast: jest.fn() }));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };
const { toast } = jest.requireMock("sonner") as { toast: jest.Mock };

function participant(userId: string, name: string): HuddleParticipant {
  return { id: 1, huddleId: 11, joinedAt: "2026-10-20T10:00:00.000Z", leftAt: null, userId, user: { id: userId, name, image: null } };
}

beforeEach(() => jest.clearAllMocks());

describe("useHuddleEvents", () => {
  it("keeps one subscription across participant refetches and still names the newest participant", async () => {
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const { rerender, unmount } = renderHook(
      ({ participants }) => useHuddleEvents({ channelId: 7, currentUserId: "u-me", participants }),
      { initialProps: { participants: [participant("u-ada", "Ada")] } },
    );
    await waitFor(() => expect(ably.handlers.get("huddle:user_joined")?.length).toBe(1));
    rerender({ participants: [participant("u-ada", "Ada"), participant("u-bo", "Bo")] });
    const channel = ably.channels.get();
    expect(channel.unsubscribe).not.toHaveBeenCalled();
    expect(ably.handlers.get("huddle:user_joined")?.length).toBe(1);
    act(() => {
      ably.handlers.get("huddle:user_joined")?.[0]?.({ data: { userId: "u-bo" } });
    });
    expect(toast).toHaveBeenCalledWith("Bo joined the huddle");
    unmount();
  });

  it("ignores a frame whose body does not carry a userId instead of announcing someone", async () => {
    const ably = ablyMock();
    useAbly.mockReturnValue(ably);
    const { unmount } = renderHook(() =>
      useHuddleEvents({ channelId: 7, currentUserId: "u-me", participants: [] }),
    );
    await waitFor(() => expect(ably.handlers.get("huddle:user_left")?.length).toBe(1));
    act(() => {
      ably.handlers.get("huddle:user_left")?.[0]?.({ data: "garbage" });
    });
    expect(toast).not.toHaveBeenCalled();
    unmount();
  });
});
