export const CHANNEL_SIDEBAR_COHESIVE_EXCEPTION = {
  file: "channel-sidebar.tsx",
  linesAtRegistration: 535,
  interface: "ChannelSidebar React component",
  reason:
    "Seven collapsed-section states and four dialog states (new DM, new group, search, invite) share the same channel list context and cannot be split without prop-drilling or a context layer that would be larger than the file itself. Every candidate sub-section is already extracted (ChannelListEntry, SidebarSearchButton, ChatSidebarNav, NewDMDialog, NewGroupDialog). The remaining body is tightly coupled mutual state that forms a single cohesive UI unit.",
  owner: "chat",
  rule: "CLAUDE.md §7 — ≤300 lines target, 500 hard review; a cohesive UI component with deeply coupled state is a legitimate exception",
} as const;
