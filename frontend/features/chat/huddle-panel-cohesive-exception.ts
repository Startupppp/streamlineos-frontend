export const HUDDLE_PANEL_COHESIVE_EXCEPTION = {
  file: "huddle-panel.tsx",
  linesAtRegistration: 513,
  interface: "HuddlePanel React component",
  reason:
    "WebRTC peer-connection state, Ably realtime presence, audio-level meters, screen-share streams and participant video tiles are deeply interdependent. Ten sub-components are already extracted (HuddleChatPanel, DeviceSelector, HuddleAudioSink, HuddleScreenShareView, HuddleParticipantCard, useAblyConnection, useHuddleEvents, useHuddleAudioLevels, useElapsedTime). The remaining body wires them together through shared MediaStream and RTCPeerConnection references that cannot safely be split without introducing ref-forwarding or a context that would exceed the file size.",
  owner: "chat",
  rule: "CLAUDE.md §7 — ≤300 lines target, 500 hard review; a cohesive WebRTC orchestration component is a legitimate exception",
} as const;
