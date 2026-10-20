import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThreadPanel } from "./thread-panel";

const mutateAsync = jest.fn();

jest.mock("@/hooks/api/chat-search", () => ({
  useThreadReplies: () => ({
    data: { pages: [{ parentMessage: null, replies: [], nextCursor: undefined }], pageParams: [] },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useSendThreadReply: () => ({ mutateAsync, isPending: false }),
}));

jest.mock("@/hooks/api/chat-core-read", () => ({ useChatOrgUsers: () => ({ data: [] }) }));

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn(), dismiss: jest.fn() }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: { onMouseEnter: jest.fn(), onMouseLeave: jest.fn() },
  }),
}));

function noop() {
  return undefined;
}

beforeAll(() => {
  if (typeof globalThis.crypto?.randomUUID === "function") return;
  let n = 0;
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => {
      n += 1;
      return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    },
  });
});

beforeEach(() => jest.clearAllMocks());

async function send(text: string) {
  const user = userEvent.setup();
  const box = screen.getByRole("textbox", { name: "Reply in thread" });
  await user.clear(box);
  await user.type(box, text);
  await user.click(screen.getByRole("button", { name: "Send reply" }));
}

describe("ThreadPanel reply clientKey", () => {
  it("resends a failed reply with the same clientKey, so a reply the server already committed is not duplicated", async () => {
    mutateAsync.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(undefined);
    render(<ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} />);
    await send("hello");
    await screen.findByDisplayValue("hello");
    await send("hello");
    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(mutateAsync.mock.calls[1][0].clientKey).toBe(mutateAsync.mock.calls[0][0].clientKey);
  });

  it("mints a new clientKey once the reply text changes or the previous reply went through", async () => {
    mutateAsync.mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(undefined);
    render(<ThreadPanel channelId={1} parentMessageId={7} currentUserId="user-1" onClose={noop} />);
    await send("hello");
    await send("hello again");
    await send("hello again");
    const keys = mutateAsync.mock.calls.map(([input]) => input.clientKey);
    expect(keys[1]).not.toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[1]);
  });
});
