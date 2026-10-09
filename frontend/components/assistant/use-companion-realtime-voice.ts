"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";

const sessionContract = z.object({ value: z.string().min(1), expiresAt: z.number() });
const MAX_SESSION_MS = 10 * 60_000;
const subscribeBrowser = () => () => undefined;
const realtimeSupported = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof RTCPeerConnection !== "undefined";

export type CompanionVoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
type WorkspaceResult = { text: string; requiresReview: boolean };

interface VoiceEvent {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
  response?: { output?: Array<{ type?: string; name?: string; call_id?: string; arguments?: string }> };
}

export function useCompanionRealtimeVoice(
  scopeKey: string | undefined,
  askWorkspace: (request: string) => Promise<WorkspaceResult>,
) {
  const supported = useSyncExternalStore(subscribeBrowser, realtimeSupported, () => false);
  const [state, setState] = useState<CompanionVoiceState>("idle");
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const askRef = useRef(askWorkspace);
  askRef.current = askWorkspace;

  const stop = useCallback(() => {
    generationRef.current += 1;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
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
    setState("idle");
    setMessage(null);
    setCaption("");
  }, []);

  const start = useCallback(async () => {
    if (peerRef.current || state === "connecting") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setState("error");
      setMessage("Live voice needs a browser with microphone and WebRTC support.");
      return;
    }
    const generation = ++generationRef.current;
    setState("connecting");
    setCaption("");
    setMessage("Connecting live voice…");
    let peer: RTCPeerConnection | null = null;
    let stream: MediaStream | null = null;
    let stage: "microphone" | "session" | "connection" = "microphone";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (generation !== generationRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      stage = "session";
      const secret = await apiClient.post("/chat/voice/session", undefined, undefined, sessionContract);
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
        void audio.play().catch(() => setMessage("Your browser blocked audio playback. Allow sound and try again."));
      };
      peer.onconnectionstatechange = () => {
        if (generation !== generationRef.current) return;
        if (peer?.connectionState === "failed" || peer?.connectionState === "disconnected") {
          stop();
          setState("error");
          setMessage("The voice connection ended. Try again.");
        }
      };
      for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);
      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onopen = () => {
        if (generation !== generationRef.current) return;
        setState("listening");
        setMessage("I'm listening. Speak naturally; you can interrupt me.");
      };
      channel.onmessage = ({ data }: MessageEvent<string>) => {
        if (generation !== generationRef.current) return;
        let event: VoiceEvent;
        try { event = JSON.parse(data) as VoiceEvent; } catch { return; }
        if (event.type === "input_audio_buffer.speech_started") {
          setState("listening");
          setCaption("");
        } else if (event.type === "input_audio_buffer.speech_stopped") {
          setState("thinking");
          setMessage("Thinking…");
        } else if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
          setCaption(`You: ${event.transcript}`);
        } else if (event.type === "response.output_audio_transcript.delta" && event.delta) {
          setState("speaking");
          setCaption((current) => current.startsWith("Companion: ") ? `${current}${event.delta}` : `Companion: ${event.delta}`);
        } else if (event.type === "response.output_audio.done") {
          setState("listening");
          setMessage("I'm listening. Speak naturally; you can interrupt me.");
        } else if (event.type === "response.done") {
          const calls = event.response?.output?.filter((item) => item.type === "function_call" && item.name === "ask_streamlineos") ?? [];
          if (calls.length > 0) {
            setState("thinking");
            setMessage("Checking your workspace…");
            void Promise.all(calls.map(async (call) => {
              if (!call.call_id) return null;
              let request = "";
              try { request = (JSON.parse(call.arguments ?? "{}") as { request?: string }).request?.trim() ?? ""; } catch { /* invalid model arguments */ }
              if (!request) return { callId: call.call_id, result: { text: "I could not understand that request. Please repeat it.", requiresReview: false } };
              try { return { callId: call.call_id, result: await askRef.current(request) }; }
              catch { return { callId: call.call_id, result: { text: "The workspace request failed. Please try again or open chat.", requiresReview: false } }; }
            })).then((outputs) => {
              if (generation !== generationRef.current || channel.readyState !== "open") return;
              for (const output of outputs) {
                if (!output) continue;
                channel.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: output.callId, output: JSON.stringify(output.result) } }));
              }
              channel.send(JSON.stringify({ type: "response.create" }));
            });
          }
        } else if (event.type === "error") {
          stop();
          setState("error");
          setMessage(event.error?.message ?? "Live voice encountered an error. End the session and try again.");
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (generation !== generationRef.current) return;
      const answer = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret.value}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
        signal: AbortSignal.timeout(15_000),
      });
      if (!answer.ok) throw new Error("Realtime connection refused");
      const sdp = await answer.text();
      if (generation !== generationRef.current) return;
      await peer.setRemoteDescription({ type: "answer", sdp });
      timeoutRef.current = window.setTimeout(() => {
        if (generation !== generationRef.current) return;
        stop();
        setMessage("Voice session ended after ten minutes. Start again to continue.");
      }, MAX_SESSION_MS);
    } catch {
      if (generation !== generationRef.current) return;
      stop();
      setState("error");
      setMessage(stage === "microphone"
        ? "Microphone access failed. Check browser permission and try again."
        : stage === "session"
          ? "Live voice is unavailable for this account right now. Try again or open chat."
          : "Live voice could not connect to OpenAI. Check your connection and try again.");
    }
  }, [state, stop]);

  useEffect(() => {
    const onHidden = () => { if (document.visibilityState === "hidden") stop(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => { document.removeEventListener("visibilitychange", onHidden); stop(); };
  }, [scopeKey, stop]);

  return { supported, state, caption, message, start, stop };
}
