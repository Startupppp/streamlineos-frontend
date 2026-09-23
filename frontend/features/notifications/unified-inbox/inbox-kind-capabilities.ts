import type { InboxKind } from "@/types/inbox";

export interface KindCapabilities {
  canMarkRead: boolean;
  canArchive: boolean;
  canSnooze: boolean;
  canDelete: boolean;
}

export const KIND_CAPABILITIES: Record<InboxKind, KindCapabilities> = {
  notification: {
    canMarkRead: true,
    canArchive: true,
    canSnooze: true,
    canDelete: true,
  },
  broadcast: {
    canMarkRead: false,
    canArchive: false,
    canSnooze: false,
    canDelete: false,
  },
  mail: {
    canMarkRead: false,
    canArchive: false,
    canSnooze: false,
    canDelete: false,
  },
  build_approval: {
    canMarkRead: false,
    canArchive: false,
    canSnooze: false,
    canDelete: false,
  },
};

export function resolvedCapabilities(kinds: InboxKind[]): KindCapabilities {
  if (kinds.length === 0)
    return {
      canMarkRead: false,
      canArchive: false,
      canSnooze: false,
      canDelete: false,
    };
  return {
    canMarkRead: kinds.some((k) => KIND_CAPABILITIES[k].canMarkRead),
    canArchive: kinds.some((k) => KIND_CAPABILITIES[k].canArchive),
    canSnooze: kinds.some((k) => KIND_CAPABILITIES[k].canSnooze),
    canDelete: kinds.some((k) => KIND_CAPABILITIES[k].canDelete),
  };
}
