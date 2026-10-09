"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import type { CompanionVoiceSettings } from "./companion-voice-settings";

const sessionContract = z.object({
  value: z.string().min(1),
  expiresAt: z.number(),
});
const MAX_SESSION_MS = 10 * 60_000;
const subscribeBrowser = () => () => undefined;
const realtimeSupported = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  typeof RTCPeerConnection !== "undefined";

export type CompanionVoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "working"
  | "speaking"
  | "error";
type WorkspaceResult = { text: string; requiresReview: boolean };

interface VoiceEvent {
  type?: string;
  error?: { message?: string };
  response?: {
    metadata?: { purpose?: string };
    output?: Array<{
      type?: string;
      name?: string;
      call_id?: string;
      arguments?: string;
    }>;
  };
}

export function useCompanionRealtimeVoice(
  scopeKey: string | undefined,
  askWorkspace: (request: string) => Promise<WorkspaceResult>,
  settings: CompanionVoiceSettings,
) {
  const supported = useSyncExternalStore(
    subscribeBrowser,
    realtimeSupported,
    () => false,
  );
  const [state, setState] = useState<CompanionVoiceState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const acknowledgementTimerRef = useRef<number | null>(null);
  const connectionAbortRef = useRef<AbortController | null>(null);
  const connectingRef = useRef(false);
  const generationRef = useRef(0);
  const askRef = useRef(askWorkspace);

  useEffect(() => {
    askRef.current = askWorkspace;
  }, [askWorkspace]);

  const release = useCallback(() => {
    generationRef.current += 1;
    connectingRef.current = false;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    if (connectionTimeoutRef.current !== null)
      window.clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = null;
    if (acknowledgementTimerRef.current !== null)
      window.clearTimeout(acknowledgementTimerRef.current);
    acknowledgementTimerRef.current = null;
    connectionAbortRef.current?.abort();
    connectionAbortRef.current = null;
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    audioRef.current = null;
  }, []);

  const stop = useCallback(() => {
    release();
    setState("idle");
    setMessage(null);
  }, [release]);

  const start = useCallback(async () => {
    if (peerRef.current || connectingRef.current) return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof RTCPeerConnection === "undefined"
    ) {
      setState("error");
      setMessage(
        "Live voice needs a browser with microphone and WebRTC support.",
      );
      return;
    }
    connectingRef.current = true;
    const generation = ++generationRef.current;
    setState("connecting");
    setMessage("Connecting live voice…");
    let peer: RTCPeerConnection | null = null;
    let stream: MediaStream | null = null;
    let stage: "microphone" | "session" | "connection" = "microphone";
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      stage = "session";
      const secret = await apiClient.post(
        "/chat/voice/session",
        settings,
        undefined,
        sessionContract,
      );
      if (generation !== generationRef.current) return;
      stage = "connection";
      peer = new RTCPeerConnection();
      peerRef.current = peer;
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audioRef.current = audio;
      peer.ontrack = ({ streams }) => {
        if (generation !== generationRef.current || !streams[0]) return;
        audio.srcObject = streams[0];
        void audio
          .play()
          .catch(() =>
            setMessage(
              "Your browser blocked audio playback. Allow sound and try again.",
            ),
          );
      };
      peer.onconnectionstatechange = () => {
        if (generation !== generationRef.current) return;
        if (
          peer?.connectionState === "failed" ||
          peer?.connectionState === "disconnected"
        ) {
          stop();
          setState("error");
          setMessage("The voice connection ended. Try again.");
        }
      };
      for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);
      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      let acknowledgementDone = true;
      let completedOutputs: Array<{
        callId: string;
        result: WorkspaceResult;
      }> | null = null;
      const deliverResult = () => {
        if (
          !acknowledgementDone ||
          !completedOutputs ||
          generation !== generationRef.current ||
          channel.readyState !== "open"
        )
          return;
        for (const output of completedOutputs) {
          channel.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: output.callId,
                output: JSON.stringify(output.result),
              },
            }),
          );
        }
        completedOutputs = null;
        setState("thinking");
        setMessage("Preparing a reply…");
        channel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Reply only in the language the user spoke in their most recent utterance. Ignore the language of the tool result. If the user spoke English, reply only in English.",
            },
          }),
        );
      };
      channel.onopen = () => {
        if (generation !== generationRef.current) return;
        setState("listening");
        setMessage(null);
      };
      channel.onmessage = ({ data }: MessageEvent<string>) => {
        if (generation !== generationRef.current) return;
        let event: VoiceEvent;
        try {
          event = JSON.parse(data) as VoiceEvent;
        } catch {
          return;
        }
        if (event.type === "input_audio_buffer.speech_started") {
          setState("listening");
          setMessage(null);
        } else if (event.type === "input_audio_buffer.speech_stopped") {
          setState("thinking");
          setMessage("Thinking…");
        } else if (event.type === "response.output_audio_transcript.delta") {
          setState("speaking");
          setMessage(null);
        } else if (event.type === "response.output_audio.done") {
          if (acknowledgementDone) {
            setState("listening");
            setMessage(null);
          } else {
            setState("working");
            setMessage("Working on it…");
          }
        } else if (event.type === "response.done") {
          if (event.response?.metadata?.purpose === "working_acknowledgement") {
            if (acknowledgementTimerRef.current !== null)
              window.clearTimeout(acknowledgementTimerRef.current);
            acknowledgementTimerRef.current = null;
            acknowledgementDone = true;
            deliverResult();
            return;
          }
          const calls =
            event.response?.output?.filter(
              (item) =>
                item.type === "function_call" &&
                item.name === "ask_streamlineos",
            ) ?? [];
          if (calls.length > 0) {
            setState("working");
            setMessage("Working on it…");
            acknowledgementDone = false;
            channel.send(
              JSON.stringify({
                type: "response.create",
                response: {
                  conversation: "none",
                  metadata: { purpose: "working_acknowledgement" },
                  output_modalities: ["audio"],
                  tool_choice: "none",
                  instructions:
                    "Briefly say that you are working on it, only in the language the user spoke in their most recent utterance. If the user spoke English, say exactly 'I'm working on it.' Do not add anything else.",
                },
              }),
            );
            acknowledgementTimerRef.current = window.setTimeout(() => {
              acknowledgementTimerRef.current = null;
              acknowledgementDone = true;
              deliverResult();
            }, 4000);
            void (async () => {
              const outputs: Array<{
                callId: string;
                result: WorkspaceResult;
              }> = [];
              for (const call of calls) {
                if (generation !== generationRef.current) return;
                if (!call.call_id) continue;
                let request = "";
                try {
                  request =
                    (
                      JSON.parse(call.arguments ?? "{}") as { request?: string }
                    ).request?.trim() ?? "";
                } catch {
                  /* invalid model arguments */
                }
                if (!request) {
                  outputs.push({
                    callId: call.call_id,
                    result: {
                      text: "I could not understand that request. Please repeat it.",
                      requiresReview: false,
                    },
                  });
                  continue;
                }
                try {
                  outputs.push({
                    callId: call.call_id,
                    result: await askRef.current(request),
                  });
                } catch {
                  outputs.push({
                    callId: call.call_id,
                    result: {
                      text: "The workspace request failed. Please try again or open chat.",
                      requiresReview: false,
                    },
                  });
                }
              }
              completedOutputs = outputs;
              deliverResult();
            })();
          }
        } else if (event.type === "error") {
          stop();
          setState("error");
          setMessage(
            event.error?.message ??
              "Live voice encountered an error. End the session and try again.",
          );
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (generation !== generationRef.current) return;
      const connectionAbort = new AbortController();
      connectionAbortRef.current = connectionAbort;
      connectionTimeoutRef.current = window.setTimeout(
        () => connectionAbort.abort(),
        15_000,
      );
      const answer = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret.value}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
        signal: connectionAbort.signal,
      });
      if (connectionTimeoutRef.current !== null)
        window.clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
      connectionAbortRef.current = null;
      if (!answer.ok) throw new Error("Realtime connection refused");
      const sdp = await answer.text();
      if (generation !== generationRef.current) return;
      await peer.setRemoteDescription({ type: "answer", sdp });
      connectingRef.current = false;
      timeoutRef.current = window.setTimeout(() => {
        if (generation !== generationRef.current) return;
        stop();
        setMessage(
          "Voice session ended after ten minutes. Start again to continue.",
        );
      }, MAX_SESSION_MS);
    } catch {
      if (generation !== generationRef.current) return;
      stop();
      setState("error");
      setMessage(
        stage === "microphone"
          ? "Microphone access failed. Check browser permission and try again."
          : stage === "session"
            ? "Live voice is unavailable for this account right now. Try again or open chat."
            : "Live voice could not connect to OpenAI. Check your connection and try again.",
      );
    }
  }, [settings, stop]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      release();
    };
  }, [scopeKey, release, stop]);

  return { supported, state, message, start, stop };
}
