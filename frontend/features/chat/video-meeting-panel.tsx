"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Camera, CameraOff, Hand, Loader2, Maximize2, Mic, MicOff, Monitor, MonitorOff, PauseCircle, PhoneOff, PictureInPicture2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useActiveHuddle, useJoinHuddle, useLeaveHuddle, useSetHuddleMute, useRaiseHand, useSetHuddleCamera, useSetHuddleScreenShare } from "@/hooks/api";
import { useMeetingRealtime } from "./meeting-realtime";
import { useWebRTCMeeting } from "./webrtc-meeting";
import { getInitials } from "./chat-helpers";
import type { HuddleParticipant } from "@/types/chat";

function VideoTile({
  stream,
  label,
  isMuted,
  isCameraOff,
  isScreenShare,
  isSelf,
  connectionState,
  videoRef: externalVideoRef,
  onClick,
}: {
  stream: MediaStream | null;
  label: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenShare?: boolean;
  isSelf?: boolean;
  connectionState?: RTCPeerConnectionState;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onClick?: () => void;
}) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef ?? internalVideoRef;
  const isReconnecting = connectionState === "disconnected" || connectionState === "failed";

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center",
        isScreenShare ? "col-span-2 row-span-2" : "aspect-video",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      {stream && !isCameraOff ? (
        <video ref={videoRef} autoPlay playsInline muted={isSelf} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-14 w-14 border-2 border-white/20">
            <AvatarFallback className="bg-zinc-700 text-white text-lg font-bold">
              {getInitials(label)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-white/60">{label}</span>
        </div>
      )}
      {isReconnecting && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
          <span className="text-[12px] text-white/80">Reconnecting…</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-white bg-black/50 px-2 py-0.5 rounded-full truncate max-w-[120px]">
          {isScreenShare ? `${label} (screen)` : label}
        </span>
        {isMuted && (
          <div className="h-5 w-5 rounded-full bg-red-500/90 flex items-center justify-center">
            <MicOff className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoMeetingPanel({
  channelId,
  currentUserId,
  onClose,
}: {
  channelId: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const { data: huddle } = useActiveHuddle(channelId);
  const { subscribeSignal } = useMeetingRealtime(channelId);

  const joinHuddle = useJoinHuddle();
  const leaveHuddle = useLeaveHuddle();
  const setMute = useSetHuddleMute();
  const raiseHand = useRaiseHand();
  const setCameraState = useSetHuddleCamera();
  const setScreenState = useSetHuddleScreenShare();

  const [inMeeting, setInMeeting] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [layout, setLayout] = useState<"grid" | "speaker">("grid");
  const [participantStates, setParticipantStates] = useState<Map<string, RTCPeerConnectionState>>(new Map());

  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);

  const activeParticipants: HuddleParticipant[] = huddle?.participants?.filter(p => !p.leftAt) ?? [];
  const myParticipant = activeParticipants.find(p => p.userId === currentUserId);

  useEffect(() => { setInMeeting(Boolean(myParticipant)); }, [myParticipant]);

  const signalHandler = useCallback(
    (handler: (data: { fromUserId: string; type: string; payload: unknown }) => void) =>
      subscribeSignal(currentUserId, handler),
    [subscribeSignal, currentUserId],
  );

  const {
    localStream, participantStreams, isMuted, isCameraOff, isSharingScreen,
    micError, toggleMute, toggleCamera, startScreenShare, stopScreenShare,
    pauseScreenShare, resumeScreenShare,
  } = useWebRTCMeeting(
    inMeeting ? (huddle?.id ?? null) : null,
    inMeeting ? channelId : null,
    inMeeting ? activeParticipants : [],
    currentUserId,
    "",
    signalHandler,
  );

  useEffect(() => { if (micError) toast.error(`Camera/Mic: ${micError}`); }, [micError]);

  const handleJoin = useCallback(async () => {
    if (!huddle) return;
    try {
      await joinHuddle.mutateAsync({ huddleId: huddle.id, channelId });
      setInMeeting(true);
    } catch (err) { toast.error(getErrorMessage(err)); }
  }, [huddle, joinHuddle, channelId]);

  const handleLeave = useCallback(async () => {
    if (!huddle) return;
    try {
      await leaveHuddle.mutateAsync({ huddleId: huddle.id, channelId });
      setInMeeting(false);
      onClose();
    } catch (err) { toast.error(getErrorMessage(err)); }
  }, [huddle, leaveHuddle, channelId, onClose]);

  const handleMuteToggle = useCallback(async () => {
    if (!huddle) return;
    toggleMute();
    await setMute.mutateAsync({ huddleId: huddle.id, channelId, muted: !isMuted }).catch(() => {});
  }, [huddle, toggleMute, setMute, channelId, isMuted]);

  const handleCameraToggle = useCallback(async () => {
    if (!huddle) return;
    toggleCamera();
    await setCameraState.mutateAsync({ huddleId: huddle.id, channelId, isCameraOff: !isCameraOff }).catch(() => {});
  }, [huddle, toggleCamera, setCameraState, channelId, isCameraOff]);

  const handleStartScreenShare = useCallback(async () => {
    await startScreenShare();
    if (huddle) await setScreenState.mutateAsync({ huddleId: huddle.id, channelId, isScreenSharing: true }).catch(() => {});
  }, [startScreenShare, setScreenState, huddle, channelId]);

  const handleStopScreenShare = useCallback(async () => {
    stopScreenShare();
    if (huddle) await setScreenState.mutateAsync({ huddleId: huddle.id, channelId, isScreenSharing: false }).catch(() => {});
  }, [stopScreenShare, setScreenState, huddle, channelId]);

  const handleRaiseHand = useCallback(async () => {
    if (!huddle) return;
    const next = !handRaised;
    setHandRaised(next);
    await raiseHand.mutateAsync({ huddleId: huddle.id, channelId, raised: next }).catch(() => setHandRaised(!next));
  }, [huddle, handRaised, raiseHand, channelId]);

  const handlePiP = useCallback(async () => {
    const video = localVideoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (_err) {}
  }, []);

  const handleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (_err) {}
  }, []);

  const handleScreenShareFullscreen = useCallback(async () => {
    const video = screenShareRef.current;
    if (!video) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await video.requestFullscreen();
      }
    } catch (_err) {}
  }, []);

  useEffect(() => {
    const newStates = new Map<string, RTCPeerConnectionState>();
    for (const { userId } of participantStreams.values()) {
      newStates.set(userId, "connected");
    }
    setParticipantStates(newStates);
  }, [participantStreams]);

  if (!huddle || huddle.status !== "active") return null;

  const participantList = [...participantStreams.values()];
  const screenShareTile = participantList.find(p => p.isScreenShare);
  const videoTiles = participantList.filter(p => !p.isScreenShare);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Video Meeting</h2>
          <span className="text-xs text-white/40">· {activeParticipants.length} participants</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayout(l => l === "grid" ? "speaker" : "grid")}
            className="h-8 px-3 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {layout === "grid" ? "Speaker view" : "Grid view"}
          </button>
          <button
            onClick={handlePiP}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Picture in Picture"
            aria-label="Picture in Picture"
          >
            <PictureInPicture2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Fullscreen"
            aria-label="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="h-8 px-3 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10">
            Minimize
          </button>
        </div>
      </div>

      <div className={cn(
        "flex-1 p-4 overflow-auto",
        layout === "grid"
          ? "grid gap-3 auto-rows-fr"
          : "flex flex-col gap-3",
        layout === "grid" && videoTiles.length <= 1 && "grid-cols-1",
        layout === "grid" && videoTiles.length === 2 && "grid-cols-2",
        layout === "grid" && videoTiles.length >= 3 && "grid-cols-3",
      )}>
        {screenShareTile && (
          <div className="col-span-full">
            <VideoTile
              stream={screenShareTile.stream}
              label={activeParticipants.find(p => p.userId === screenShareTile.userId)?.user?.name ?? "User"}
              isScreenShare
              videoRef={screenShareRef}
              onClick={handleScreenShareFullscreen}
            />
          </div>
        )}

        <VideoTile
          stream={localStream}
          label="You"
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isSelf
          videoRef={localVideoRef}
        />

        {videoTiles.map(({ userId, stream }) => {
          const participant = activeParticipants.find(p => p.userId === userId);
          return (
            <VideoTile
              key={userId}
              stream={stream}
              label={participant?.user?.name ?? "User"}
              isMuted={participant?.isMuted}
              isCameraOff={participant?.isCameraOff}
              connectionState={participantStates.get(userId)}
            />
          );
        })}

        {!inMeeting && (
          <div className="col-span-full flex flex-col items-center justify-center gap-4 py-16">
            <Camera className="h-12 w-12 text-white/20" />
            <p className="text-white/60 text-sm">Meeting in progress with {activeParticipants.length} participant{activeParticipants.length !== 1 ? "s" : ""}</p>
            <button
              onClick={handleJoin}
              disabled={joinHuddle.isPending}
              className="h-10 px-6 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Join Meeting
            </button>
          </div>
        )}
      </div>

      {inMeeting && (
        <div className="shrink-0 border-t border-white/10 py-4 flex items-center justify-center gap-3">
          <button
            onClick={handleMuteToggle}
            className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-colors", isMuted ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20")}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            onClick={handleCameraToggle}
            className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-colors", isCameraOff ? "bg-red-500 text-white" : "bg-white/10 text-white hover:bg-white/20")}
            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
          >
            {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
          </button>
          <button
            onClick={isSharingScreen ? handleStopScreenShare : handleStartScreenShare}
            className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-colors", isSharingScreen ? "bg-blue-500 text-white" : "bg-white/10 text-white hover:bg-white/20")}
            title={isSharingScreen ? "Stop sharing" : "Share screen"}
          >
            {isSharingScreen ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </button>
          {isSharingScreen && (
            <button
              onClick={pauseScreenShare}
              className="h-11 w-11 rounded-full flex items-center justify-center transition-colors bg-white/10 text-white hover:bg-white/20"
              title="Pause screen share"
            >
              <PauseCircle className="h-5 w-5" />
            </button>
          )}
          {!isSharingScreen && (
            <button
              onClick={resumeScreenShare}
              className="h-11 w-11 rounded-full flex items-center justify-center transition-colors bg-white/10 text-white hover:bg-white/20"
              title="Resume screen share"
            >
              <PlayCircle className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleRaiseHand}
            className={cn("h-11 w-11 rounded-full flex items-center justify-center transition-colors", handRaised ? "bg-amber-400 text-white" : "bg-white/10 text-white hover:bg-white/20")}
            title="Raise hand"
          >
            <Hand className="h-5 w-5" />
          </button>
          <button
            onClick={handleLeave}
            className="h-11 w-24 rounded-full bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <PhoneOff className="h-4 w-4" />
            Leave
          </button>
        </div>
      )}
    </div>
  );
}
