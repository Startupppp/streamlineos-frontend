import { render, screen, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useMailThread, useMailMessage } from "@/hooks/api/mail";
import {
  mailSummaryToDetail,
  seedMailDetailFromSummary,
} from "./mail-thread-seed";
import type { MailMessageDetail, MailMessageSummary } from "@/types/mail";

const apiGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => apiGet(...args),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

const LIST_ROW: MailMessageSummary = {
  id: "msg-1",
  threadId: "thread-1",
  accountId: 7,
  provider: "gmail",
  from: { name: "Sender", email: "sender@example.com" },
  to: [{ name: null, email: "me@example.com" }],
  subject: "Quarterly plan",
  snippet: "A snippet the list already has",
  date: "2026-02-01T10:00:00.000Z",
  isRead: false,
  isStarred: false,
  hasAttachments: false,
};

const SERVER_THREAD: MailMessageDetail[] = [
  {
    ...LIST_ROW,
    cc: [],
    bodyHtml: "<p>the real body</p>",
    bodyText: null,
    attachments: [],
  },
];

const CONFIG: QueryClientConfig = {
  defaultOptions: { queries: { retry: false } },
};

function makeClient(): QueryClient {
  return new QueryClient(CONFIG);
}

function ThreadProbe() {
  const { data, isLoading } = useMailThread(7, "thread-1");
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="subject">{data?.[0]?.subject ?? "-"}</span>
      <span data-testid="body">{data?.[0]?.bodyHtml ?? "no-body"}</span>
    </div>
  );
}

function MessageProbe() {
  const { data, isLoading } = useMailMessage(7, "msg-1");
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="subject">{data?.subject ?? "-"}</span>
    </div>
  );
}

function renderWith(client: QueryClient, node: React.ReactElement) {
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>,
  );
}

describe("mail thread hydration — seeding the detail cache from the list row", () => {
  beforeEach(() => {
    apiGet.mockReset().mockResolvedValue(SERVER_THREAD);
  });

  it("carries the list row's own fields into the seeded detail", () => {
    expect(mailSummaryToDetail(LIST_ROW)).toEqual({
      ...LIST_ROW,
      cc: [],
      bodyHtml: null,
      bodyText: null,
      attachments: [],
    });
  });

  it("renders the thread with no skeleton, then the background refresh replaces the body", async () => {
    const client = makeClient();
    seedMailDetailFromSummary(client, LIST_ROW);

    renderWith(client, <ThreadProbe />);

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("subject")).toHaveTextContent("Quarterly plan");
    expect(screen.getByTestId("body")).toHaveTextContent("no-body");

    await waitFor(() =>
      expect(screen.getByTestId("body")).toHaveTextContent("the real body"),
    );
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it("BITE PROOF — a seed written without an expired timestamp never refreshes, which is the stale-data bug", async () => {
    const client = makeClient();
    client.setQueryData(
      queryKeys.mail.thread(7, "thread-1"),
      [mailSummaryToDetail(LIST_ROW)],
    );

    renderWith(client, <ThreadProbe />);

    await waitFor(() =>
      expect(screen.getByTestId("subject")).toHaveTextContent("Quarterly plan"),
    );
    expect(apiGet).not.toHaveBeenCalled();
    expect(screen.getByTestId("body")).toHaveTextContent("no-body");
  });

  it("never overwrites a thread the cache has already hydrated", () => {
    const client = makeClient();
    client.setQueryData(queryKeys.mail.thread(7, "thread-1"), SERVER_THREAD);

    seedMailDetailFromSummary(client, LIST_ROW);

    expect(client.getQueryData(queryKeys.mail.thread(7, "thread-1"))).toEqual(
      SERVER_THREAD,
    );
  });

  it("seeds the single-message key when the row carries no thread", async () => {
    const client = makeClient();
    apiGet.mockResolvedValue({
      ...LIST_ROW,
      threadId: null,
      cc: [],
      bodyHtml: "<p>single</p>",
      bodyText: null,
      attachments: [],
    });
    seedMailDetailFromSummary(client, { ...LIST_ROW, threadId: null });

    expect(
      client.getQueryData(queryKeys.mail.thread(7, "thread-1")),
    ).toBeUndefined();

    renderWith(client, <MessageProbe />);

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("subject")).toHaveTextContent("Quarterly plan");
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));
  });

  it("a mail action's invalidation still reaches the seeded key", async () => {
    const client = makeClient();
    seedMailDetailFromSummary(client, LIST_ROW);
    renderWith(client, <ThreadProbe />);
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(1));

    await client.invalidateQueries({ queryKey: queryKeys.mail.all });

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
  });
});
