import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "node:util";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { KbPageAiActions } from "@/features/wiki/components/kb-page-ai-actions";
import { KbArticleAiActions } from "@/features/help-centre/components/kb-article-ai-actions";

if (typeof globalThis.TextEncoder === "undefined")
  Object.assign(globalThis, { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder });

installAbortSignalPolyfill();

/**
 * Both KB document surfaces, driven from the menu item a user clicks all the way
 * down through `streamKbDocAi` -> `streamAiText` -> `authedFetch` to the wire,
 * with only `global.fetch` mocked.
 *
 * Stubbing the transport would hide the two defects this seam keeps producing:
 * a panel that still POSTs the buffered sibling while wearing a Stop button, and
 * an abort signal that type-checks in a slot nothing reads. Both are only
 * visible at the fetch boundary, so that is where the assertions are.
 */

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;
let requestSignal: AbortSignal | null;
let requestSignals: AbortSignal[];
let requestedUrls: string[];

interface Chunk {
  done: boolean;
  value?: Uint8Array;
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
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

function installFetch(respond: (signal: AbortSignal | null) => Record<string, unknown>): void {
  requestSignal = null;
  requestSignals = [];
  requestedUrls = [];
  fetchMock = jest.fn((input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/api/auth/session")) return Promise.resolve({ ok: false, status: 401 });
    const signal = init?.signal ?? null;
    if (!signal) throw new Error("authedFetch reached global fetch with no signal");
    requestSignal = signal;
    if (signal) requestSignals.push(signal);
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
    headers: new Headers(),
    body: bodyOf(chunks, signal),
  });
}

function held(chunks: string[]) {
  return (signal: AbortSignal | null) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    body: heldBody(signal, chunks),
  });
}

afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
  jest.restoreAllMocks();
});

interface Surface {
  name: string;
  scope: "pages" | "articles";
  render: () => void;
  summarizeLabel: RegExp;
  improveLabel: RegExp;
  askLabel: RegExp;
}

const SURFACES: Surface[] = [
  {
    name: "KbPageAiActions",
    scope: "pages",
    render: () => {
      render(<KbPageAiActions pageId={7} />);
    },
    summarizeLabel: /summarize this page/i,
    improveLabel: /improve writing/i,
    askLabel: /ask about this page/i,
  },
  {
    name: "KbArticleAiActions",
    scope: "articles",
    render: () => {
      render(<KbArticleAiActions articleId={7} />);
    },
    summarizeLabel: /summarize this article/i,
    improveLabel: /improve writing/i,
    askLabel: /ask about this article/i,
  },
];

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^ai$/i }));
}

describe.each(SURFACES)("$name — the KB document actions stream", (surface) => {
  it("posts to the /stream route and never to the buffered sibling", async () => {
    installFetch(okStream(["Bullet one. ", "Bullet two."]));
    const user = userEvent.setup();
    surface.render();

    await openMenu(user);
    await user.click(await screen.findByText(surface.summarizeLabel));

    await waitFor(() => {
      expect(requestedUrls.length).toBeGreaterThan(0);
    });
    expect(requestedUrls[0]).toContain(`/kb/${surface.scope}/7/ai/summarize/stream`);
    expect(requestedUrls.some((u) => /\/ai\/summarize$/.test(u))).toBe(false);
  });

  it("renders tokens as they arrive, before the answer is complete", async () => {
    installFetch(held(["The first half. "]));
    const user = userEvent.setup();
    surface.render();

    await openMenu(user);
    await user.click(await screen.findByText(surface.improveLabel));

    expect(await screen.findByText(/The first half\./)).toBeInTheDocument();
    expect(requestedUrls[0]).toContain(`/kb/${surface.scope}/7/ai/improve/stream`);
  });

  it("Stop aborts the outgoing request and keeps what arrived", async () => {
    installFetch(held(["Partial rewrite. "]));
    const user = userEvent.setup();
    surface.render();

    await openMenu(user);
    await user.click(await screen.findByText(surface.improveLabel));
    await screen.findByText(/Partial rewrite\./);

    await user.click(screen.getByRole("button", { name: /^stop$/i }));

    await waitFor(() => {
      expect(requestSignal?.aborted).toBe(true);
    });
    expect(screen.getByText(/Partial rewrite\./)).toBeInTheDocument();
  });

  /**
   * Reopening the menu dismisses the result popover, and that dismissal is what
   * cancels the run behind it. The invariant is not "one stream ever" but "never
   * two paid streams live at once" — so the assertion is on the FIRST request's
   * signal, which must already be aborted by the time the second is dispatched.
   * Asserting only the request count would have read this correct behaviour as a
   * double charge.
   */
  it("cancels the running stream before it dispatches a second one", async () => {
    installFetch(held(["one "]));
    const user = userEvent.setup();
    surface.render();

    await openMenu(user);
    await user.click(await screen.findByText(surface.improveLabel));
    await screen.findByText(/one/);

    await openMenu(user);
    await user.click(await screen.findByText(surface.summarizeLabel));

    await waitFor(() => {
      expect(requestSignals).toHaveLength(2);
    });
    expect(requestSignals[0]?.aborted).toBe(true);
    expect(requestSignals[1]?.aborted).toBe(false);
  });

  it("the ask sheet streams its answer to the ask/stream route", async () => {
    installFetch(okStream(["Yes — ", "you need Node 20."]));
    const user = userEvent.setup();
    surface.render();

    await openMenu(user);
    await user.click(await screen.findByText(surface.askLabel));

    await user.type(await screen.findByPlaceholderText(/prerequisites/i), "What do I need?");
    await user.click(screen.getByRole("button", { name: /^ask$/i }));

    expect(await screen.findByText(/you need Node 20\./)).toBeInTheDocument();
    expect(requestedUrls[0]).toContain(`/kb/${surface.scope}/7/ai/ask/stream`);
  });

  it("a stale answer from a stopped ask never lands on the surface", async () => {
    installFetch(held(["stale answer"]));
    const user = userEvent.setup();
    surface.render();

    await openMenu(user);
    await user.click(await screen.findByText(surface.askLabel));
    await user.type(await screen.findByPlaceholderText(/prerequisites/i), "First question?");
    await user.click(screen.getByRole("button", { name: /^ask$/i }));
    await screen.findByText(/stale answer/);

    await user.click(screen.getByRole("button", { name: /^stop$/i }));

    await waitFor(() => {
      expect(requestSignal?.aborted).toBe(true);
    });
    expect(screen.queryByText(/stale answer/)).not.toBeInTheDocument();
  });
});
