export const MAX_QUEUED_CANDIDATES = 64;

export interface IncomingSignalData {
  fromUserId: string;
  type: "offer" | "answer" | "ice-candidate";
  payload: {
    sdp?: string;
    fromUserId?: string;
    candidate?: RTCIceCandidateInit;
  };
}

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turnUrls = (process.env.NEXT_PUBLIC_TURN_URL ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  if (turnUrls.length > 0) {
    servers.push({
      urls: turnUrls,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME ?? "",
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? "",
    });
  }
  return servers;
}

export interface SignalHandlerDeps {
  huddleId: number;
  currentUserId: string;
  peerConnections: Map<string, RTCPeerConnection>;
  pendingCandidates: Map<string, RTCIceCandidateInit[]>;
  makingOffer: Set<string>;
  createPeerConnection: (targetUserId: string) => RTCPeerConnection;
  flushPendingCandidates: (targetUserId: string, pc: RTCPeerConnection) => Promise<void>;
  sendSignal: (signal: {
    huddleId: number;
    type: "offer" | "answer" | "ice-candidate";
    targetUserId: string;
    payload: { sdp?: string; fromUserId?: string; candidate?: RTCIceCandidateInit };
  }) => void;
}

export async function handleIncomingSignal(
  signal: IncomingSignalData,
  deps: SignalHandlerDeps,
): Promise<void> {
  const fromUserId = signal.fromUserId;

  if (signal.type === "offer") {
    let pc = deps.peerConnections.get(fromUserId);
    if (!pc) {
      pc = deps.createPeerConnection(fromUserId);
    }
    const polite = deps.currentUserId > fromUserId;
    const collision = deps.makingOffer.has(fromUserId) || pc.signalingState !== "stable";
    if (collision && !polite) return;
    await pc.setRemoteDescription({ type: "offer", sdp: signal.payload.sdp ?? "" });
    await deps.flushPendingCandidates(fromUserId, pc);
    await pc.setLocalDescription();
    const sdp = pc.localDescription?.sdp;
    if (sdp) {
      deps.sendSignal({
        huddleId: deps.huddleId,
        type: "answer",
        targetUserId: fromUserId,
        payload: { sdp, fromUserId: deps.currentUserId },
      });
    }
  } else if (signal.type === "answer") {
    const pc = deps.peerConnections.get(fromUserId);
    if (pc && pc.signalingState === "have-local-offer") {
      await pc.setRemoteDescription({ type: "answer", sdp: signal.payload.sdp ?? "" });
      await deps.flushPendingCandidates(fromUserId, pc);
    }
  } else if (signal.type === "ice-candidate") {
    const candidate = signal.payload.candidate;
    if (!candidate) return;
    const pc = deps.peerConnections.get(fromUserId);
    if (!pc || !pc.remoteDescription) {
      const queue = deps.pendingCandidates.get(fromUserId) ?? [];
      if (queue.length < MAX_QUEUED_CANDIDATES) {
        queue.push(candidate);
        deps.pendingCandidates.set(fromUserId, queue);
      }
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

export function updatedStreamMap(
  prev: Map<string, MediaStream>,
  userId: string,
  stream: MediaStream | null,
): Map<string, MediaStream> {
  const current = prev.get(userId) ?? null;
  if (current === stream) return prev;
  const next = new Map(prev);
  if (stream) next.set(userId, stream);
  else next.delete(userId);
  return next;
}
