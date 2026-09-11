import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { renderWithProviders } from "@/test-utils/render";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MeetingFollowUpPanel } from "./meeting-follow-up-panel";
import {
  installFetch,
  jsonOnce,
  refuses,
  streamsThenEnds,
  streamsThenHangs,
  type FetchRecorder,
  type StreamResponder,
} from "./meeting-stream-test-harness";

if (typeof globalThis.TextEncoder === "undefined")
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

installAbortSignalPolyfill();

/**
 * The live calendar follow-up surface. Everything from the panel's click handler
 * down runs for real — `streamMeetingFollowUp`, `streamAiText`, `authedFetch`,
 * the combined abort signal, and `apiClient.post` for the send — with only
 * `global.fetch` mocked.
 */

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({
    data: { isOrgOwner: true, scopes: {} },
    refetch: () => Promise.resolve({ data: { isOrgOwner: true, scopes: {} } }),
  }),
}));
jest.mock("./calendar-connect-inline", () => ({ CalendarConnectInline: () => null }));

const STREAM_PATH = "/ai/meetings/follow-up/stream";
const BUFFERED_PATH = "/ai/meetings/follow-up";
const PROPOSE_PATH = "/ai/meetings/follow-up/propose-send";

const SOURCES = [
  { id: "event-42", title: "Q3 pipeline review", snippet: "Calendar event details" },
  { id: "notes-42", title: "Organizer meeting notes", snippet: "Agreed to ship the pilot" },
];

const WHOLE_DRAFT = [
  "## Subject",
  "Follow-up: Q3 pipeline review",
  "",
  "## Email",
  "Thanks everyone for joining.",
  "We agreed to ship the pilot in October.",
  "",
  "## Action items",
  "- Draft the migration plan | owner: Priya | due: 2026-09-12",
  "- Book the follow-up review | owner: unassigned | due: none",
  "",
  "## Next meeting",
  "2026-09-19",
  "",
].map((line) => `${line}\n`);

const PARTIAL = ["## Subject\n", "Follow-up: Q3 pipeline review\n"];
const PARTIAL_WITH_EMAIL = [...PARTIAL, "## Email\nThanks everyone.\n"];

const originalFetch = globalThis.fetch;
let net: FetchRecorder;

function arrange(respond: StreamResponder): void {
  net = installFetch(respond, {
    [PROPOSE_PATH]: jsonOnce({ proposalId: "prop-1", token: "tok-1", expiresAt: "2026-09-04" }),
  });
}

afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
  jest.restoreAllMocks();
});

function renderPanel() {
  return renderWithProviders(
    <TooltipProvider>
      <MeetingFollowUpPanel eventId="42" />
    </TooltipProvider>,
  );
}

async function draft() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Draft Follow-up/i }));
  return user;
}

function bodySentTo(path: string): Record<string, unknown> {
  const url = net.urls.find((u) => u.endsWith(path));
  return JSON.parse(net.bodies[url ?? ""] ?? "{}") as Record<string, unknown>;
}

async function stopAfter(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole("button", { name: /^Stop$/ }));
  await waitFor(() => expect(net.signal()?.aborted).toBe(true));
}

describe("the calendar meeting follow-up panel streams", () => {
  it("posts to the /stream route and never to the buffered sibling", async () => {
    arrange(streamsThenEnds(WHOLE_DRAFT, SOURCES));
    renderPanel();
    await draft();

    await waitFor(() => expect(net.urls).toHaveLength(1));
    expect(net.urls[0]?.endsWith(STREAM_PATH)).toBe(true);
    expect(net.urls.some((u) => u.endsWith(BUFFERED_PATH))).toBe(false);
  });

  it("renders the structured draft, not raw markdown", async () => {
    arrange(streamsThenEnds(WHOLE_DRAFT, SOURCES));
    renderPanel();
    await draft();

    expect(await screen.findByText("Follow-up: Q3 pipeline review")).toBeInTheDocument();
    expect(await screen.findByText(/We agreed to ship the pilot in October\./)).toBeInTheDocument();
    expect(await screen.findByText("Draft the migration plan")).toBeInTheDocument();
    expect(await screen.findByText("→ Priya")).toBeInTheDocument();
    expect(await screen.findByText("2026-09-12")).toBeInTheDocument();
    expect(await screen.findByText("2026-09-19")).toBeInTheDocument();
    expect(screen.queryByText(/^## /)).not.toBeInTheDocument();
    expect(screen.queryByText(/owner:/)).not.toBeInTheDocument();
  });

  it("renders an unowned action item without inventing an owner or a due date", async () => {
    arrange(streamsThenEnds(WHOLE_DRAFT, SOURCES));
    renderPanel();
    await draft();

    expect(await screen.findByText("Book the follow-up review")).toBeInTheDocument();
    expect(screen.queryByText("→ unassigned")).toBeNull();
    expect(screen.queryByText("none")).toBeNull();
  });

  it("shows the draft before the answer is complete", async () => {
    arrange(streamsThenHangs(PARTIAL_WITH_EMAIL, SOURCES));
    renderPanel();
    await draft();

    expect(await screen.findByText("Follow-up: Q3 pipeline review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Stop$/ })).toBeInTheDocument();
    expect(screen.queryByText("Draft the migration plan")).not.toBeInTheDocument();
  });

  it("renders citations from x-ai-sources before the body finishes", async () => {
    arrange(streamsThenHangs(PARTIAL, SOURCES));
    renderPanel();
    await draft();

    expect(await screen.findByText("Q3 pipeline review")).toBeInTheDocument();
    expect(await screen.findByText("Organizer meeting notes")).toBeInTheDocument();
  });

  it("Stop aborts the outgoing request and keeps the partial draft and its citations", async () => {
    arrange(streamsThenHangs(PARTIAL_WITH_EMAIL, SOURCES));
    renderPanel();
    const user = await draft();

    await screen.findByText("Follow-up: Q3 pipeline review");
    expect(net.signal()?.aborted).toBe(false);
    await stopAfter(user);

    expect(await screen.findByText(/Stopped — partial draft kept/)).toBeInTheDocument();
    expect(screen.getByText("Follow-up: Q3 pipeline review")).toBeInTheDocument();
    expect(screen.getByText("Organizer meeting notes")).toBeInTheDocument();
  });

  it("aborts the stream when the panel unmounts", async () => {
    arrange(streamsThenHangs(["## Subject\n"], SOURCES));
    const view = renderPanel();
    await draft();

    await waitFor(() => expect(net.signal()).not.toBeNull());
    expect(net.signal()?.aborted).toBe(false);

    await act(async () => {
      view.unmount();
      await Promise.resolve();
    });

    expect(net.signal()?.aborted).toBe(true);
  });

  it("does not open a second paid stream while one is running", async () => {
    arrange(streamsThenHangs(PARTIAL, SOURCES));
    renderPanel();
    const user = await draft();

    await screen.findByText("Follow-up: Q3 pipeline review");
    await stopAfter(user);

    expect(net.urls).toHaveLength(1);
  });

  it("sends the draft it reconstructed from the stream, not an empty record", async () => {
    arrange(streamsThenEnds(WHOLE_DRAFT, SOURCES));
    renderPanel();
    const user = await draft();

    const send = await screen.findByRole("button", { name: /Send via Calendar/i });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);

    await waitFor(() => expect(net.urls.some((u) => u.endsWith(PROPOSE_PATH))).toBe(true));
    const sent = bodySentTo(PROPOSE_PATH) as {
      followUpDraft: {
        subject: string;
        body: string;
        actionItems: { item: string; assignee?: string; dueDate?: string }[];
        nextMeetingDate?: string;
      };
      channel: string;
    };
    expect(sent.followUpDraft.subject).toBe("Follow-up: Q3 pipeline review");
    expect(sent.followUpDraft.body).toContain("We agreed to ship the pilot in October.");
    expect(sent.followUpDraft.actionItems).toEqual([
      { item: "Draft the migration plan", assignee: "Priya", dueDate: "2026-09-12" },
      { item: "Book the follow-up review" },
    ]);
    expect(sent.followUpDraft.nextMeetingDate).toBe("2026-09-19");
    expect(sent.channel).toBe("calendar");
  });

  it("does not offer a send for a draft stopped before the email arrived", async () => {
    arrange(streamsThenHangs(PARTIAL, SOURCES));
    renderPanel();
    const user = await draft();

    await screen.findByText("Follow-up: Q3 pipeline review");
    await stopAfter(user);

    expect(await screen.findByRole("button", { name: /Send via Calendar/i })).toBeDisabled();
  });

  it("renders credit exhaustion as a top-up, with no retry that cannot help", async () => {
    arrange(refuses(402, { message: "Out of credits", code: "INSUFFICIENT_CREDITS" }));
    renderPanel();
    await draft();

    expect(await screen.findByText("AI credits exhausted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Top up AI credits/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try again|Draft Follow-up|Retry/i })).toBeNull();
    expect(screen.queryByText(/Meeting notes/)).toBeNull();
  });

  it("offers a retry for a transient failure, which credit exhaustion does not get", async () => {
    arrange(refuses(503, { message: "The AI provider is down" }));
    renderPanel();
    await draft();

    expect(await screen.findByRole("button", { name: /Try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Draft Follow-up/i })).toBeInTheDocument();
  });

  it("never serialises the abort signal into the request body", async () => {
    arrange(streamsThenEnds(WHOLE_DRAFT, SOURCES));
    renderPanel();
    await draft();

    await waitFor(() => expect(net.mock).toHaveBeenCalled());
    const body = bodySentTo(STREAM_PATH);
    expect(body).not.toHaveProperty("signal");
    expect(body).not.toHaveProperty("onToken");
    expect(body).not.toHaveProperty("onSources");
    expect(body["eventId"]).toBe("42");
  });
});
