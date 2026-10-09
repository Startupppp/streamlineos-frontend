"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechInputState = "idle" | "listening" | "processing" | "error";

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
  return getSpeechRecognition() !== null;
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
  const [state, setState] = useState<SpeechInputState>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [renderScope, setRenderScope] = useState(scopeKey);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  if (renderScope !== scopeKey) {
    setRenderScope(scopeKey);
    setInterimTranscript("");
    setMessage(null);
    setState("idle");
  }

  const reset = useCallback(() => {
    if (recognitionRef.current) return;
    setInterimTranscript("");
    setMessage(null);
    setState("idle");
  }, []);

  const cancel = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.abort();
    recognitionRef.current = null;
    setInterimTranscript("");
    setMessage("Voice input cancelled.");
    setState("idle");
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    setState("processing");
    setInterimTranscript("");
    setMessage("Processing speech…");
    recognitionRef.current.stop();
  }, []);

  const start = useCallback((onTranscript: (transcript: string) => void) => {
    beforeStart?.();
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
  }, [beforeStart]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") cancel();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, [cancel, scopeKey]);

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
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [renderScope, setRenderScope] = useState(scopeKey);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  if (renderScope !== scopeKey) {
    setRenderScope(scopeKey);
    setActiveKey(null);
  }

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setActiveKey(null);
  }, []);

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
  }, []);

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
  }, [scopeKey, stop]);

  return {
    activeKey,
    speak,
    stop,
    supported,
  };
}

export type SpeechPlaybackController = ReturnType<typeof useSpeechPlayback>;
