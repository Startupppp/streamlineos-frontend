import {
  KbCopyIcon,
  KbFileDownIcon,
  KbHistoryIcon,
  KbImageIcon,
  KbInfoIcon,
  KbLink2Icon,
  KbLockIcon,
  KbMessageSquareIcon,
  KbMoveRightIcon,
  KbSaveIcon,
  KbStarIcon,
  KbTrash2Icon,
  KbUnlockIcon,
  type KbIconComponent,
} from "@/features/wiki/lib/kb-icons";

export const KB_PAGE_ACTION_PERMISSIONS = {
  create: "kb:pages:create",
  update: "kb:pages:update",
  manage: "kb:pages:manage",
  delete: "kb:pages:delete",
  export: "kb:pages:export",
  templates: "kb:templates:manage",
} as const;

export type KbPagePermissionKey =
  (typeof KB_PAGE_ACTION_PERMISSIONS)[keyof typeof KB_PAGE_ACTION_PERMISSIONS];

export type KbPageActionId =
  | "comments"
  | "history"
  | "info"
  | "favorite"
  | "cover"
  | "duplicate"
  | "move"
  | "lock"
  | "saveTemplate"
  | "export"
  | "backlinks"
  | "delete";

export type KbPageActionGroup = "view" | "organize" | "danger";

export interface KbPageActionSubject {
  isFavorite: boolean;
  isLocked: boolean;
  hasCover: boolean;
}

export interface KbPageActionCapabilities {
  canCreate: boolean;
  canUpdate: boolean;
  canManage: boolean;
  canDelete: boolean;
  canExport: boolean;
  canManageTemplates: boolean;
  isEditable: boolean;
}

interface KbPageActionDefinition {
  id: KbPageActionId;
  group: KbPageActionGroup;
  permission: KbPagePermissionKey | null;
  destructive: boolean;
  label: string;
  icon: KbIconComponent;
  toggledLabel?: string;
  toggledIcon?: KbIconComponent;
  isToggled?: (subject: KbPageActionSubject) => boolean;
  isPermitted: (capabilities: KbPageActionCapabilities) => boolean;
}

export interface ResolvedKbPageAction {
  id: KbPageActionId;
  group: KbPageActionGroup;
  permission: KbPagePermissionKey | null;
  destructive: boolean;
  label: string;
  icon: KbIconComponent;
  isToggled: boolean;
}

function alwaysPermitted(): boolean {
  return true;
}

function isFavorited(subject: KbPageActionSubject): boolean {
  return subject.isFavorite;
}

function isLocked(subject: KbPageActionSubject): boolean {
  return subject.isLocked;
}

function hasCover(subject: KbPageActionSubject): boolean {
  return subject.hasCover;
}

function permitsCover(capabilities: KbPageActionCapabilities): boolean {
  return capabilities.isEditable;
}

function permitsDuplicate(capabilities: KbPageActionCapabilities): boolean {
  return capabilities.canCreate;
}

function permitsMove(capabilities: KbPageActionCapabilities): boolean {
  return capabilities.canUpdate;
}

function permitsLock(capabilities: KbPageActionCapabilities): boolean {
  return capabilities.canManage;
}

function permitsSaveTemplate(capabilities: KbPageActionCapabilities): boolean {
  return capabilities.canManageTemplates;
}

function permitsExport(capabilities: KbPageActionCapabilities): boolean {
  return capabilities.canExport;
}

function permitsDelete(capabilities: KbPageActionCapabilities): boolean {
  return capabilities.canDelete;
}

const KB_PAGE_ACTION_DEFINITIONS: readonly KbPageActionDefinition[] = [
  {
    id: "comments",
    group: "view",
    permission: null,
    destructive: false,
    label: "Comments",
    icon: KbMessageSquareIcon,
    isPermitted: alwaysPermitted,
  },
  {
    id: "history",
    group: "view",
    permission: null,
    destructive: false,
    label: "Version history",
    icon: KbHistoryIcon,
    isPermitted: alwaysPermitted,
  },
  {
    id: "info",
    group: "view",
    permission: null,
    destructive: false,
    label: "Page info",
    icon: KbInfoIcon,
    isPermitted: alwaysPermitted,
  },
  {
    id: "backlinks",
    group: "view",
    permission: null,
    destructive: false,
    label: "Backlinks",
    icon: KbLink2Icon,
    isPermitted: alwaysPermitted,
  },
  {
    id: "favorite",
    group: "view",
    permission: null,
    destructive: false,
    label: "Add to favorites",
    icon: KbStarIcon,
    toggledLabel: "Remove from favorites",
    isToggled: isFavorited,
    isPermitted: alwaysPermitted,
  },
  {
    id: "cover",
    group: "organize",
    permission: KB_PAGE_ACTION_PERMISSIONS.update,
    destructive: false,
    label: "Add cover",
    icon: KbImageIcon,
    toggledLabel: "Change cover",
    isToggled: hasCover,
    isPermitted: permitsCover,
  },
  {
    id: "duplicate",
    group: "organize",
    permission: KB_PAGE_ACTION_PERMISSIONS.create,
    destructive: false,
    label: "Duplicate",
    icon: KbCopyIcon,
    isPermitted: permitsDuplicate,
  },
  {
    id: "move",
    group: "organize",
    permission: KB_PAGE_ACTION_PERMISSIONS.update,
    destructive: false,
    label: "Move",
    icon: KbMoveRightIcon,
    isPermitted: permitsMove,
  },
  {
    id: "lock",
    group: "organize",
    permission: KB_PAGE_ACTION_PERMISSIONS.manage,
    destructive: false,
    label: "Lock page",
    icon: KbLockIcon,
    toggledLabel: "Unlock page",
    toggledIcon: KbUnlockIcon,
    isToggled: isLocked,
    isPermitted: permitsLock,
  },
  {
    id: "saveTemplate",
    group: "organize",
    permission: KB_PAGE_ACTION_PERMISSIONS.templates,
    destructive: false,
    label: "Save as template",
    icon: KbSaveIcon,
    isPermitted: permitsSaveTemplate,
  },
  {
    id: "export",
    group: "organize",
    permission: KB_PAGE_ACTION_PERMISSIONS.export,
    destructive: false,
    label: "Export HTML",
    icon: KbFileDownIcon,
    isPermitted: permitsExport,
  },
  {
    id: "delete",
    group: "danger",
    permission: KB_PAGE_ACTION_PERMISSIONS.delete,
    destructive: true,
    label: "Delete",
    icon: KbTrash2Icon,
    isPermitted: permitsDelete,
  },
];

export const KB_PAGE_ACTION_IDS: readonly KbPageActionId[] =
  KB_PAGE_ACTION_DEFINITIONS.map((definition) => definition.id);

export function toKbPageActionId(
  value: string | undefined,
): KbPageActionId | undefined {
  return KB_PAGE_ACTION_IDS.find((actionId) => actionId === value);
}

function resolveAction(
  definition: KbPageActionDefinition,
  subject: KbPageActionSubject,
): ResolvedKbPageAction {
  const toggled = definition.isToggled?.(subject) ?? false;
  return {
    id: definition.id,
    group: definition.group,
    permission: definition.permission,
    destructive: definition.destructive,
    label: toggled
      ? (definition.toggledLabel ?? definition.label)
      : definition.label,
    icon: toggled
      ? (definition.toggledIcon ?? definition.icon)
      : definition.icon,
    isToggled: toggled,
  };
}

export function resolveKbPageActions(
  subject: KbPageActionSubject,
  capabilities: KbPageActionCapabilities,
): ResolvedKbPageAction[] {
  return KB_PAGE_ACTION_DEFINITIONS.filter((definition) =>
    definition.isPermitted(capabilities),
  ).map((definition) => resolveAction(definition, subject));
}

export function groupKbPageActions(
  actions: readonly ResolvedKbPageAction[],
): ResolvedKbPageAction[][] {
  const groups: KbPageActionGroup[] = ["view", "organize", "danger"];
  return groups
    .map((group) => actions.filter((action) => action.group === group))
    .filter((group) => group.length > 0);
}
