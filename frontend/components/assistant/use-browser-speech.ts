"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { isApiError } from "@/lib/api-envelope";

type SpeechInputState = "idle" | "requesting" | "listening" | "processing" | "error";
const MAX_RECORDING_MS = 30_000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const transcriptionContract = z.object({ text: z.string() });

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface UseSpeechInputOptions {
  beforeStart?: () => void;
  scopeKey?: string;
}

function subscribeBrowserCapability() {
  return () => undefined;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function speechInputSupported() {
  return (typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined") || getSpeechRecognition() !== null;
}

function speechOutputSupported() {
  return typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;
}

function recognitionErrorMessage(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed")
    return "Microphone access is blocked. Allow it in your browser settings to use voice input.";
  if (code === "no-speech") return "I did not hear anything. Try speaking again.";
  if (code === "audio-capture") return "No microphone is available.";
  if (code === "network") return "Voice recognition could not connect. Try again.";
  if (code === "language-not-supported") return "Your browser does not support voice input in this language.";
  return "Voice input stopped unexpectedly. Try again.";
}

export function useSpeechInput({ beforeStart, scopeKey }: UseSpeechInputOptions = {}) {
  const supported = useSyncExternalStore(subscribeBrowserCapability, speechInputSupported, () => false);

  const sk = scopeKey ?? "";

  const [stateEntry, setStateEntry] = useState<{ sk: string; v: SpeechInputState }>(() => ({ sk, v: "idle" }));
  const [interimEntry, setInterimEntry] = useState<{ sk: string; v: string }>(() => ({ sk, v: "" }));
  const [msgEntry, setMsgEntry] = useState<{ sk: string; v: string | null }>(() => ({ sk, v: null }));

  const state: SpeechInputState = stateEntry.sk === sk ? stateEntry.v : "idle";
  const interimTranscript: string = interimEntry.sk === sk ? interimEntry.v : "";
  const message: string | null = msgEntry.sk === sk ? msgEntry.v : null;

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const uploadRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const setState = useCallback((v: SpeechInputState | ((prev: SpeechInputState) => SpeechInputState)) => {
    setStateEntry(prev => {
      const curr: SpeechInputState = prev.sk === sk ? prev.v : "idle";
      return { sk, v: typeof v === "function" ? v(curr) : v };
    });
  }, [sk]);

  const setInterimTranscript = useCallback((v: string) => {
    setInterimEntry({ sk, v });
  }, [sk]);

  const setMessage = useCallback((v: string | null) => {
    setMsgEntry({ sk, v });
  }, [sk]);

  const releaseMedia = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current || recorderRef.current || uploadRef.current) return;
    setInterimTranscript("");
    setMessage(null);
    setState("idle");
  }, [setInterimTranscript, setMessage, setState]);

  const cancel = useCallback(() => {
    generationRef.current += 1;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    uploadRef.current?.abort();
    uploadRef.current = null;
    releaseMedia();
    setInterimTranscript("");
    setMessage(null);
    setState("idle");
  }, [releaseMedia, setInterimTranscript, setMessage, setState]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      setState("processing");
      setMessage("Turning your voice into text…");
      recorderRef.current.stop();
      return;
    }
    if (!recognitionRef.current) return;
    setState("processing");
    setInterimTranscript("");
    setMessage("Processing speech…");
    recognitionRef.current.stop();
  }, [setInterimTranscript, setMessage, setState]);

  const start = useCallback((onTranscript: (transcript: string) => void) => {
    beforeStart?.();
    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      const generation = ++generationRef.current;
      setState("requesting");
      setMessage("Waiting for microphone access…");
      void (async () => {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          if (generation !== generationRef.current) return;
          setState("error");
          setMessage("Microphone access is unavailable. Check browser permission and try again.");
          return;
        }
        if (generation !== generationRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const mimeType = ["audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        } catch {
          releaseMedia();
          setState("error");
          setMessage("Audio recording is unavailable in this browser.");
          return;
        }
        const chunks: Blob[] = [];
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => {
          if (generation !== generationRef.current) return;
          releaseMedia();
          setState("error");
          setMessage("Recording stopped unexpectedly. Try again.");
        };
        recorder.onstop = () => {
          releaseMedia();
          if (generation !== generationRef.current) return;
          const audio = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
          if (!audio.size || audio.size > MAX_AUDIO_BYTES) {
            setState("error");
            setMessage(audio.size ? "Recording is too long. Try a shorter message." : "I did not hear anything. Try speaking again.");
            return;
          }
          const abort = new AbortController();
          uploadRef.current = abort;
          const form = new FormData();
          form.append("file", audio, `companion.${audio.type.includes("mp4") ? "mp4" : "webm"}`);
          setState("processing");
          setMessage("Turning your voice into text…");
          void apiClient.upload("/chat/voice/transcribe", form, transcriptionContract, { signal: abort.signal })
            .then(({ text }) => {
              if (generation !== generationRef.current) return;
              onTranscript(text);
              setState("idle");
              setMessage("Transcript ready. Review it before sending.");
            })
            .catch((error: unknown) => {
              if (generation !== generationRef.current) return;
              setState("error");
              setMessage(isApiError(error) && error.status === 400
                ? error.message
                : "Voice transcription could not connect. Try again or type your message.");
            })
            .finally(() => { if (uploadRef.current === abort) uploadRef.current = null; });
        };
        try {
          recorder.start();
          setState("listening");
          setMessage("Listening… tap the microphone when you are done.");
          timeoutRef.current = window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, MAX_RECORDING_MS);
        } catch {
          releaseMedia();
          setState("error");
          setMessage("Audio recording could not start. Try again.");
        }
      })();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setState("error");
      setMessage("Voice input is not supported in this browser.");
      return;
    }
    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || navigator.language || "en-US";
    recognitionRef.current = recognition;
    setInterimTranscript("");
    setMessage("Listening…");
    setState("listening");
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      setInterimTranscript(interimText.trim());
      if (finalText.trim()) onTranscript(finalText.trim());
    };
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setInterimTranscript("");
      if (event.error === "aborted") {
        setMessage(null);
        setState("idle");
        return;
      }
      setMessage(recognitionErrorMessage(event.error));
      setState("error");
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setInterimTranscript("");
      setMessage(null);
      setState((current) => current === "error" ? current : "idle");
    };
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setMessage("Voice input could not start. Try again.");
      setState("error");
    }
  }, [beforeStart, releaseMedia, setInterimTranscript, setMessage, setState]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") cancel();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      generationRef.current += 1;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      uploadRef.current?.abort();
      uploadRef.current = null;
      releaseMedia();
    };
  }, [cancel, releaseMedia]);

  return {
    cancel,
    interimTranscript,
    message,
    reset,
    start,
    state,
    stop,
    supported,
  };
}

export type SpeechInputController = ReturnType<typeof useSpeechInput>;

export function speechTextFromMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeechPlayback(scopeKey?: string) {
  const supported = useSyncExternalStore(subscribeBrowserCapability, speechOutputSupported, () => false);

  const sk = scopeKey ?? "";

  const [activeEntry, setActiveEntry] = useState<{ sk: string; v: string | null }>(() => ({ sk, v: null }));
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const activeKey: string | null = activeEntry.sk === sk ? activeEntry.v : null;

  const setActiveKey = useCallback((v: string | null) => {
    setActiveEntry({ sk, v });
  }, [sk]);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setActiveKey(null);
  }, [setActiveKey]);

  const speak = useCallback((key: string, value: string) => {
    if (!speechOutputSupported()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechTextFromMarkdown(value));
    utterance.lang = document.documentElement.lang || navigator.language || "en-US";
    utterance.rate = 1;
    utteranceRef.current = utterance;
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setActiveKey(null);
    };
    utterance.onerror = utterance.onend;
    setActiveKey(key);
    window.speechSynthesis.speak(utterance);
  }, [setActiveKey]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") stop();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (utteranceRef.current) window.speechSynthesis?.cancel();
      utteranceRef.current = null;
    };
  }, [stop]);

  return {
    activeKey,
    speak,
    stop,
    supported,
  };
}

export type SpeechPlaybackController = ReturnType<typeof useSpeechPlayback>;
