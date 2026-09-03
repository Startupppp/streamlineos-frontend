import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MeetingPrepPanel } from "./meeting-prep-panel";

if (typeof globalThis.TextEncoder === "undefined")
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

installAbortSignalPolyfill();

/**
 * The live calendar prep surface. Everything from the panel's click handler down
 * runs for real — `streamMeetingPrep`, `streamAiText`, `authedFetch`, the
 * combined abort signal — with only `global.fetch` mocked, because the two
 * defects this seam keeps reproducing (a buffered POST wearing a Stop button,
 * and a signal that type-checks in a slot nothing reads) are both invisible to a
 * test that stubs the client.
 */

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("./use-calendar-connections", () => ({
  useCalendarConnections: () => ({ data: [{ id: "1", status: "active" }] }),
}));
jest.mock("./calendar-connect-inline", () => ({
  CalendarConnectInline: () => null,
}));

const STREAM_PATH = "/ai/meetings/prep/stream";
const BUFFERED_PATH = "/ai/meetings/prep";
const SOURCES = [
  { id: "event-42", title: "Q3 pipeline review", snippet: "Calendar event details" },
  { id: "attendees-42", title: "3 attendees", snippet: "Ada, Grace, Alan" },
];

const AGENDA = [
  "## Agenda",
  "- 09:00 Opening (5 min)",
  "",
  "## Key topics",
  "- Pipeline health",
  "",
  "## Suggested duration",
  "45 minutes",
  "",
  "## Preparation notes",
  "Bring the pipeline export.",
  "",
];

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;
let requestSignal: AbortSignal | null;
let requestedUrls: string[];

interface Chunk {
  done: boolean;
  value?: Uint8Array;
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function sourcesHeaders(): Headers {
  return new Headers({ "x-ai-sources": encodeURIComponent(JSON.stringify(SOURCES)) });
}

function bodyOf(chunks: string[], signal: AbortSignal | null) {
  const queued: Chunk[] = chunks.map((c) => ({ done: false, value: encode(c) }));
  queued.push({ done: true });
  return {
    getReader: () => ({
      read: (): Promise<Chunk> => {
        if (signal?.aborted) return Promise.reject(new DOMException("aborted", "AbortError"));
        return Promise.resolve(queued.shift() ?? { done: true });
      },
    }),
  };
}

/** Serves the given deltas, then hangs until the signal aborts. */
function heldBody(signal: AbortSignal | null, chunks: string[]) {
  const queued = [...chunks];
  return {
    getReader: () => ({
      read: (): Promise<Chunk> => {
        if (signal?.aborted) return Promise.reject(new DOMException("aborted", "AbortError"));
        const next = queued.shift();
        if (next !== undefined) return Promise.resolve({ done: false, value: encode(next) });
        return new Promise<Chunk>((_, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        });
      },
    }),
  };
}

function installFetch(respond: (signal: AbortSignal | null) => Record<string, unknown>): void {
  requestSignal = null;
  requestedUrls = [];
  fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session")) return Promise.resolve({ ok: false, status: 401 });
    const signal = init?.signal ?? null;
    if (!signal) throw new Error("authedFetch reached global fetch with no signal");
    requestSignal = signal;
    requestedUrls.push(url);
    return Promise.resolve(respond(signal));
  });
  Object.assign(globalThis, { fetch: fetchMock });
}

function okStream(chunks: string[]) {
  return (signal: AbortSignal | null) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: sourcesHeaders(),
    body: bodyOf(chunks, signal),
  });
}

function held(chunks: string[]) {
  return (signal: AbortSignal | null) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: sourcesHeaders(),
    body: heldBody(signal, chunks),
  });
}

function refuse(status: number, body: Record<string, unknown>) {
  return () => ({
    ok: false,
    status,
    statusText: "Payment Required",
    headers: new Headers(),
    json: () => Promise.resolve(body),
  });
}

afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
  jest.restoreAllMocks();
});

/** The app mounts one `TooltipProvider` at the root (`components/providers/query-provider.tsx`). */
function renderPanel() {
  return render(
    <TooltipProvider>
      <MeetingPrepPanel eventId="42" eventTitle="Q3 pipeline review" />
    </TooltipProvider>,
  );
}

async function draft() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Draft Agenda/i }));
  return user;
}

describe("the calendar meeting prep panel streams", () => {
  it("posts to the /stream route and never to the buffered sibling", async () => {
    installFetch(okStream(AGENDA.map((line) => `${line}\n`)));
    renderPanel();
    await draft();

    await waitFor(() => expect(requestedUrls).toHaveLength(1));
    expect(requestedUrls[0]?.endsWith(STREAM_PATH)).toBe(true);
    expect(requestedUrls.some((u) => u.endsWith(BUFFERED_PATH))).toBe(false);
  });

  it("renders the structured sections, not raw markdown", async () => {
    installFetch(okStream(AGENDA.map((line) => `${line}\n`)));
    renderPanel();
    await draft();

    expect(await screen.findByText("- 09:00 Opening (5 min)")).toBeInTheDocument();
    expect(await screen.findByText("Pipeline health")).toBeInTheDocument();
    expect(await screen.findByText("45 minutes")).toBeInTheDocument();
    expect(await screen.findByText("Bring the pipeline export.")).toBeInTheDocument();
    expect(screen.queryByText(/^## /)).not.toBeInTheDocument();
  });

  it("shows the agenda before the answer is complete", async () => {
    installFetch(held(["## Agenda\n", "- 09:00 Opening (5 min)\n"]));
    renderPanel();
    await draft();

    expect(await screen.findByText("- 09:00 Opening (5 min)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Stop$/ })).toBeInTheDocument();
    expect(screen.queryByText("45 minutes")).not.toBeInTheDocument();
  });

  it("renders citations from x-ai-sources before the body finishes", async () => {
    installFetch(held(["## Agenda\n", "- 09:00 Opening (5 min)\n"]));
    renderPanel();
    await draft();

    expect(await screen.findByText("Q3 pipeline review")).toBeInTheDocument();
    expect(await screen.findByText("3 attendees")).toBeInTheDocument();
  });

  it("Stop aborts the outgoing request and keeps the partial agenda and its citations", async () => {
    installFetch(held(["## Agenda\n", "- 09:00 Opening (5 min)\n"]));
    renderPanel();
    const user = await draft();

    await screen.findByText("- 09:00 Opening (5 min)");
    expect(requestSignal?.aborted).toBe(false);

    await user.click(screen.getByRole("button", { name: /^Stop$/ }));

    await waitFor(() => expect(requestSignal?.aborted).toBe(true));
    expect(await screen.findByText(/Stopped — partial agenda kept/)).toBeInTheDocument();
    expect(screen.getByText("- 09:00 Opening (5 min)")).toBeInTheDocument();
    expect(screen.getByText("3 attendees")).toBeInTheDocument();
  });

  it("aborts the stream when the panel unmounts", async () => {
    installFetch(held(["## Agenda\n"]));
    const view = renderPanel();
    await draft();

    await waitFor(() => expect(requestSignal).not.toBeNull());
    expect(requestSignal?.aborted).toBe(false);

    await act(async () => {
      view.unmount();
      await Promise.resolve();
    });

    expect(requestSignal?.aborted).toBe(true);
  });

  it("does not open a second paid stream while one is running", async () => {
    installFetch(held(["## Agenda\n", "- 09:00 Opening (5 min)\n"]));
    renderPanel();
    const user = await draft();

    await screen.findByText("- 09:00 Opening (5 min)");
    await user.click(screen.getByRole("button", { name: /^Stop$/ }));
    await waitFor(() => expect(requestSignal?.aborted).toBe(true));

    expect(requestedUrls).toHaveLength(1);
  });

  it("renders credit exhaustion as a top-up, with no retry that cannot help", async () => {
    installFetch(refuse(402, { message: "Out of credits", code: "INSUFFICIENT_CREDITS" }));
    renderPanel();
    await draft();

    expect(await screen.findByText("AI credits exhausted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Top up AI credits/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try again|Draft Agenda|Retry/i })).toBeNull();
    expect(screen.queryByText(/Include context from/)).toBeNull();
  });

  it("offers a retry for a transient failure, which credit exhaustion does not get", async () => {
    installFetch(refuse(503, { message: "The AI provider is down" }));
    renderPanel();
    await draft();

    expect(await screen.findByRole("button", { name: /Try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Draft Agenda/i })).toBeInTheDocument();
  });

  it("never serialises the abort signal into the request body", async () => {
    installFetch(okStream(["## Agenda\nOpening.\n"]));
    renderPanel();
    await draft();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = fetchMock.mock.calls.at(-1)?.[1] as RequestInit;
    expect(init.signal).toBeDefined();
    expect(String(init.body)).not.toContain("signal");
    expect(String(init.body)).toContain("eventId");
  });
});
