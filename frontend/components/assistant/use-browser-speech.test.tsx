import { act, renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { speechTextFromMarkdown, useSpeechInput, useSpeechPlayback } from "./use-browser-speech";

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

class FakeRecognition {
  static latest: FakeRecognition | null = null;
  continuous = true;
  interimResults = false;
  lang = "";
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: { resultIndex: number; results: RecognitionResult[] }) => void) | null = null;
  abort = jest.fn();
  start = jest.fn();
  stop = jest.fn();

  constructor() {
    FakeRecognition.latest = this;
  }
}

class FakeUtterance {
  lang = "";
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly text: string) {}
}

const speechSynthesis = {
  cancel: jest.fn(),
  speak: jest.fn(),
};

function installRecognition() {
  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    value: FakeRecognition,
  });
}

function installSynthesis() {
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: FakeUtterance,
  });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: speechSynthesis,
  });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    configurable: true,
    value: FakeUtterance,
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "MediaRecorder");
  Reflect.deleteProperty(navigator, "mediaDevices");
  Reflect.deleteProperty(window, "SpeechRecognition");
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  Reflect.deleteProperty(window, "speechSynthesis");
  Reflect.deleteProperty(globalThis, "SpeechSynthesisUtterance");
  FakeRecognition.latest = null;
  jest.clearAllMocks();
});

describe("browser speech input", () => {
  it("records only after activation, transcribes on stop, and leaves text editable", async () => {
    const trackStop = jest.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: trackStop }] }) },
    });
    class FakeRecorder {
      static latest: FakeRecorder;
      static isTypeSupported = () => true;
      mimeType = "audio/webm";
      state = "recording";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() { FakeRecorder.latest = this; }
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["spoken words"], { type: "audio/webm" }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: FakeRecorder });
    const upload = jest.spyOn(apiClient, "upload").mockResolvedValue({ text: "Find my tickets" });
    const transcript = jest.fn();
    const { result } = renderHook(() => useSpeechInput());
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    await act(async () => { result.current.start(transcript); await Promise.resolve(); });
    expect(result.current.state).toBe("listening");
    await act(async () => { result.current.stop(); await Promise.resolve(); });
    expect(upload).toHaveBeenCalledWith("/chat/voice/transcribe", expect.any(FormData), expect.anything(), expect.anything());
    expect(transcript).toHaveBeenCalledWith("Find my tickets");
    expect(result.current.state).toBe("idle");
    expect(trackStop).toHaveBeenCalledTimes(1);
    upload.mockRestore();
  });
  it("creates recognition only after an explicit start and commits only final words", () => {
    installRecognition();
    const transcript = jest.fn();
    const { result } = renderHook(() => useSpeechInput());

    expect(FakeRecognition.latest).toBeNull();
    act(() => result.current.start(transcript));
    const recognition = FakeRecognition.latest;
    expect(recognition?.start).toHaveBeenCalledTimes(1);
    expect(recognition?.continuous).toBe(false);
    expect(recognition?.interimResults).toBe(true);

    act(() => recognition?.onresult?.({
      resultIndex: 0,
      results: [
        { isFinal: false, 0: { transcript: "show my" } },
        { isFinal: true, 0: { transcript: "open tickets" } },
      ],
    }));
    expect(result.current.interimTranscript).toBe("show my");
    expect(transcript).toHaveBeenCalledWith("open tickets");
  });

  it("normalizes permission denial and aborts an active session on unmount", () => {
    installRecognition();
    const { result, unmount } = renderHook(() => useSpeechInput());
    act(() => result.current.start(jest.fn()));
    const recognition = FakeRecognition.latest;

    act(() => recognition?.onerror?.({ error: "not-allowed" }));
    expect(result.current.state).toBe("error");
    expect(result.current.message).toMatch(/Microphone access is blocked/);

    act(() => result.current.start(jest.fn()));
    const restarted = FakeRecognition.latest;
    unmount();
    expect(restarted?.abort).toHaveBeenCalledTimes(1);
  });

  it("stops playback before listening and ignores the prior organization session", () => {
    installRecognition();
    const beforeStart = jest.fn();
    const transcript = jest.fn();
    const { result, rerender } = renderHook(
      ({ scopeKey }) => useSpeechInput({ beforeStart, scopeKey }),
      { initialProps: { scopeKey: "org-1" } },
    );

    act(() => result.current.start(transcript));
    const first = FakeRecognition.latest;
    expect(beforeStart).toHaveBeenCalledTimes(1);
    expect(first?.start).toHaveBeenCalledTimes(1);

    rerender({ scopeKey: "org-2" });
    expect(first?.abort).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("idle");
    expect(result.current.interimTranscript).toBe("");

    act(() => first?.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: "old tenant words" } }],
    }));
    expect(transcript).not.toHaveBeenCalled();

    rerender({ scopeKey: "org-1" });
    expect(result.current.state).toBe("idle");
    expect(result.current.message).toBeNull();
  });
});

describe("browser speech output", () => {
  it("speaks cleaned visible prose only after the caller invokes speak", () => {
    installSynthesis();
    const { result } = renderHook(() => useSpeechPlayback());
    expect(speechSynthesis.speak).not.toHaveBeenCalled();

    act(() => result.current.speak("message-1", "**Done.** [Open ticket](/build/1)"));
    expect(speechSynthesis.speak).toHaveBeenCalledTimes(1);
    expect((speechSynthesis.speak.mock.calls[0]?.[0] as FakeUtterance).text).toBe("Done. Open ticket");
  });

  it("removes markdown and code payloads before playback", () => {
    expect(speechTextFromMarkdown("# Result\n```json\n{\"token\":\"secret\"}\n```\n[Open](/x)"))
      .toBe("Result code block Open");
  });

  it("stops playback when the page is hidden", () => {
    installSynthesis();
    const { result } = renderHook(() => useSpeechPlayback("org-1"));
    act(() => result.current.speak("message-1", "A visible answer"));
    expect(result.current.activeKey).toBe("message-1");

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));

    expect(speechSynthesis.cancel).toHaveBeenCalled();
    expect(result.current.activeKey).toBeNull();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it("does not restore stale playback after a round-trip organization change", () => {
    installSynthesis();
    const { result, rerender } = renderHook(
      ({ scopeKey }) => useSpeechPlayback(scopeKey),
      { initialProps: { scopeKey: "org-1" } },
    );
    act(() => result.current.speak("message-1", "A visible answer"));
    expect(result.current.activeKey).toBe("message-1");

    rerender({ scopeKey: "org-2" });
    expect(result.current.activeKey).toBeNull();
    rerender({ scopeKey: "org-1" });
    expect(result.current.activeKey).toBeNull();
  });
});
