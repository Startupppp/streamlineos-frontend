import { render } from "@testing-library/react";
import { useKbConversations, useKbConversationMessages } from "./chat-history";
import { useKbResearchBriefs } from "./research-briefs";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

const mockGet = jest.fn<Promise<unknown>, unknown[]>(() =>
  Promise.resolve({ conversations: [], nextCursor: null }),
);
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

let capturedQueryFn: ((ctx: { pageParam: unknown; signal: AbortSignal }) => unknown) | null = null;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: jest.fn((opts: { queryFn: (ctx: { pageParam: unknown; signal: AbortSignal }) => unknown }) => {
      capturedQueryFn = opts.queryFn;
      return { data: undefined, isLoading: false };
    }),
  };
});

beforeEach(() => {
  capturedQueryFn = null;
  mockGet.mockClear();
  mockGet.mockResolvedValue({ conversations: [], nextCursor: null });
});

function ConversationsHook() {
  useKbConversations(true);
  return null;
}

function MessagesHook() {
  useKbConversationMessages(1, true);
  return null;
}

function BriefsHook() {
  useKbResearchBriefs();
  return null;
}

describe("useKbConversations — signal forwarded to apiClient.get", () => {
  it("passes signal as the third argument", async () => {
    render(<ConversationsHook />);
    expect(capturedQueryFn).not.toBeNull();
    const signal = new AbortController().signal;
    await capturedQueryFn!({ pageParam: undefined, signal });
    expect(mockGet).toHaveBeenCalledWith(
      "/kb/ask/conversations",
      expect.any(Object),
      signal,
      expect.any(Function),
    );
  });
});

describe("useKbConversationMessages — signal forwarded to apiClient.get", () => {
  it("passes signal as the third argument", async () => {
    render(<MessagesHook />);
    expect(capturedQueryFn).not.toBeNull();
    const signal = new AbortController().signal;
    mockGet.mockResolvedValueOnce({ messages: [], nextCursor: null });
    await capturedQueryFn!({ pageParam: undefined, signal });
    expect(mockGet).toHaveBeenCalledWith(
      `/kb/ask/conversations/1/messages`,
      expect.any(Object),
      signal,
      expect.any(Function),
    );
  });
});

describe("useKbResearchBriefs — signal forwarded to apiClient.get", () => {
  it("passes signal as the third argument", async () => {
    render(<BriefsHook />);
    expect(capturedQueryFn).not.toBeNull();
    const signal = new AbortController().signal;
    mockGet.mockResolvedValueOnce({ items: [], nextCursor: null });
    await capturedQueryFn!({ pageParam: undefined, signal });
    expect(mockGet).toHaveBeenCalledWith(
      "/kb/research-briefs",
      expect.any(Object),
      signal,
      expect.any(Function),
    );
  });
});
