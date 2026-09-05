import { z } from "zod";
import { TextEncoder, TextDecoder } from "node:util";
import { ReadableStream } from "node:stream/web";
import { installAbortSignalPolyfill } from "@/test-utils/abort-signal-polyfill";
import { streamAiResult } from "./ai-result-stream";

Object.assign(globalThis, { TextEncoder, TextDecoder });
installAbortSignalPolyfill();
const originalFetch = globalThis.fetch;
const fetchStream = jest.fn<Promise<unknown>, [unknown, RequestInit?]>();

const schema = z.object({ text: z.string(), citations: z.array(z.string()) });

function respond(chunks: string[]) {
  const encoder = new TextEncoder();
  fetchStream.mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/x-ndjson" }), body: new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }) });
}

beforeEach(() => {
  fetchStream.mockReset();
  Object.assign(globalThis, { fetch: (input: unknown, init?: RequestInit) => String(input).includes("/api/auth/session")
    ? Promise.resolve({ ok: false, status: 401 })
    : fetchStream(input, init) });
});
afterAll(() => Object.assign(globalThis, { fetch: originalFetch }));

it("streams split frames and returns only the validated final result", async () => {
  respond(['{"type":"text","text":"Hel', 'lo"}\n', '{"type":"result","data":{"text":"Hello","citations":["source"]}}\n']);
  const onToken = jest.fn();
  const result = await streamAiResult({ path: "/ai/probe", schema, onToken });
  expect(onToken).toHaveBeenCalledWith("Hello");
  expect(result).toEqual({ text: "Hello", citations: ["source"] });
});

it.each([
  ['{"type":"text","text":"Partial"}\n'],
  ['{"type":"result","data":{"text":3,"citations":[]}}\n'],
  ['{"type":"result","data":{"text":"ok","citations":[]}}\n{"type":"text","text":"late"}\n'],
  ['{"type":"result","data":{"text":"ok","citations":[]}}\n{"type":"result","data":{"text":"ok","citations":[]}}\n'],
  ['{"type":"error","message":"private provider error"}\n'],
  ['not json\n'],
])("rejects incomplete, invalid, duplicate and failed streams", async (frame) => {
  respond([frame]);
  await expect(streamAiResult({ path: "/ai/probe", schema })).rejects.toMatchObject({ status: 502 });
});

it("rejects an oversized complete frame before parsing", async () => {
  respond([JSON.stringify({ type: "text", text: "x".repeat(2_000_000) }) + "\n"]);
  const onToken = jest.fn();
  await expect(streamAiResult({ path: "/ai/probe", schema, onToken })).rejects.toMatchObject({ code: "AI_INVALID_OUTPUT" });
  expect(onToken).not.toHaveBeenCalled();
});

it("forwards cancellation and prevents a pre-aborted paid request", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(streamAiResult({ path: "/ai/probe", schema, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  expect(fetchStream).not.toHaveBeenCalled();
});

it("rejects active cancellation without returning a partial result", async () => {
  const abort = new AbortController();
  const encoder = new TextEncoder();
  fetchStream.mockResolvedValue({ ok: true, status: 200, headers: new Headers({ "content-type": "application/x-ndjson" }), body: new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"type":"text","text":"partial"}\n'));
      abort.signal.addEventListener("abort", () => controller.error(new DOMException("Stopped", "AbortError")), { once: true });
    },
  }) });
  const onToken = jest.fn(() => abort.abort());
  await expect(streamAiResult({ path: "/ai/probe", schema, signal: abort.signal, onToken })).rejects.toMatchObject({ name: "AbortError" });
  expect(onToken).toHaveBeenCalledTimes(1);
  expect(fetchStream.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
});
