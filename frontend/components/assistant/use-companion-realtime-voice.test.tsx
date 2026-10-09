import { act, renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useCompanionRealtimeVoice } from "./use-companion-realtime-voice";

jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn() } }));

class FakeChannel {
  readyState = "open";
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  send = jest.fn();
  close = jest.fn();
  emit(value: unknown) { this.onmessage?.({ data: JSON.stringify(value) } as MessageEvent<string>); }
}

class FakePeer {
  connectionState = "connected";
  ontrack: ((event: { streams: MediaStream[] }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  channel = new FakeChannel();
  addTrack = jest.fn();
  createDataChannel = jest.fn(() => this.channel);
  createOffer = jest.fn(async () => ({ type: "offer" as const, sdp: "offer-sdp" }));
  setLocalDescription = jest.fn(async () => undefined);
  setRemoteDescription = jest.fn(async () => undefined);
  close = jest.fn();
}

const originalFetch = global.fetch;
const originalRtc = global.RTCPeerConnection;
const originalMediaDevices = navigator.mediaDevices;
const originalAbortTimeout = AbortSignal.timeout;

beforeEach(() => jest.clearAllMocks());

afterEach(() => {
  global.fetch = originalFetch;
  global.RTCPeerConnection = originalRtc;
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: originalMediaDevices });
  Object.defineProperty(AbortSignal, "timeout", { configurable: true, value: originalAbortTimeout });
  jest.restoreAllMocks();
});

it("keeps live voice in the pet and sends workspace requests through the existing task callback", async () => {
  const peer = new FakePeer();
  const track = { stop: jest.fn() };
  const media = { getAudioTracks: () => [track], getTracks: () => [track] };
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: jest.fn(async () => media) } });
  global.RTCPeerConnection = jest.fn(() => peer) as unknown as typeof RTCPeerConnection;
  global.fetch = jest.fn(async () => ({ ok: true, text: async () => "answer-sdp" })) as unknown as typeof fetch;
  Object.defineProperty(AbortSignal, "timeout", { configurable: true, value: () => new AbortController().signal });
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  jest.mocked(apiClient.post).mockResolvedValue({ value: "ek_test", expiresAt: 12345 });
  const ask = jest.fn(async () => ({ text: "Three open tickets. Review the linked results in chat.", requiresReview: false }));
  const { result } = renderHook(() => useCompanionRealtimeVoice("org-a", ask, { voice: "cedar" }));

  await act(async () => { await result.current.start(); });
  expect(peer.createOffer).toHaveBeenCalled();
  expect(apiClient.post).toHaveBeenCalledWith("/chat/voice/session", { voice: "cedar" }, undefined, expect.anything());
  expect(global.fetch).toHaveBeenCalledWith("https://api.openai.com/v1/realtime/calls", expect.objectContaining({ method: "POST", body: "offer-sdp" }));
  act(() => { peer.channel.onopen?.(); });
  expect(result.current.state).toBe("listening");
  expect(result.current.message).toBeNull();
  act(() => { peer.channel.emit({ type: "input_audio_buffer.speech_stopped" }); });
  expect(result.current.state).toBe("thinking");
  act(() => { peer.channel.emit({ type: "conversation.item.input_audio_transcription.completed", transcript: "Private spoken request" }); });
  expect(result.current).not.toHaveProperty("caption");
  act(() => { peer.channel.emit({ type: "response.done", response: { output: [{ type: "function_call", name: "ask_streamlineos", call_id: "call-1", arguments: JSON.stringify({ request: "How many open tickets?" }) }] } }); });
  expect(result.current.state).toBe("working");
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('"purpose":"working_acknowledgement"'));
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining("language the user spoke in their most recent utterance"));
  await waitFor(() => expect(ask).toHaveBeenCalledWith("How many open tickets?"));
  expect(peer.channel.send).not.toHaveBeenCalledWith(expect.stringContaining('"type":"function_call_output"'));
  act(() => { peer.channel.emit({ type: "response.done", response: { metadata: { purpose: "working_acknowledgement" } } }); });
  await waitFor(() => expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('"type":"function_call_output"')));
  expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining("If the user spoke English, reply only in English"));
  act(() => { result.current.stop(); });
  expect(track.stop).toHaveBeenCalled();
  expect(peer.close).toHaveBeenCalled();
});

it("shows a recoverable microphone error without creating a provider session", async () => {
  global.RTCPeerConnection = jest.fn(() => new FakePeer()) as unknown as typeof RTCPeerConnection;
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: jest.fn(async () => { throw new Error("denied"); }) } });
  const { result } = renderHook(() => useCompanionRealtimeVoice("org-a", jest.fn(), { voice: "marin" }));
  await act(async () => { await result.current.start(); });
  expect(result.current.state).toBe("error");
  expect(result.current.message).toContain("browser permission");
  expect(apiClient.post).not.toHaveBeenCalled();
});

it("runs multiple workspace calls in order and stops pending work on end", async () => {
  const peer = new FakePeer();
  const track = { stop: jest.fn() };
  const media = { getAudioTracks: () => [track], getTracks: () => [track] };
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: jest.fn(async () => media) } });
  global.RTCPeerConnection = jest.fn(() => peer) as unknown as typeof RTCPeerConnection;
  global.fetch = jest.fn(async () => ({ ok: true, text: async () => "answer-sdp" })) as unknown as typeof fetch;
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  jest.mocked(apiClient.post).mockResolvedValue({ value: "ek_test", expiresAt: 12345 });
  let finishFirst: (() => void) | undefined;
  const firstPending = new Promise<void>((resolve) => { finishFirst = resolve; });
  const ask = jest.fn(async (request: string) => {
    if (request === "first") await firstPending;
    return { text: request, requiresReview: false };
  });
  const { result } = renderHook(() => useCompanionRealtimeVoice("org-a", ask, { voice: "cedar" }));
  await act(async () => { await result.current.start(); });
  act(() => { peer.channel.emit({ type: "response.done", response: { output: [
    { type: "function_call", name: "ask_streamlineos", call_id: "one", arguments: '{"request":"first"}' },
    { type: "function_call", name: "ask_streamlineos", call_id: "two", arguments: '{"request":"second"}' },
  ] } }); });
  expect(ask).toHaveBeenCalledTimes(1);
  finishFirst?.();
  await waitFor(() => expect(ask).toHaveBeenNthCalledWith(2, "second"));
  act(() => { peer.channel.emit({ type: "response.done", response: { metadata: { purpose: "working_acknowledgement" } } }); });
  await waitFor(() => expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('"call_id":"two"')));
  act(() => { result.current.stop(); });
  expect(track.stop).toHaveBeenCalled();
});
