export const WIDGET_TYPES = [
  "my-issues",
  "projects",
  "approvals",
  "agent-runs",
  "risks",
  "releases",
  "blockers",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export interface WidgetPosition {
  col: number;
  row: number;
  w: number;
  h: number;
}

export interface WidgetSlot {
  type: WidgetType;
  position: WidgetPosition;
  config?: Record<string, unknown>;
}

export interface DashboardLayoutConfig {
  widgets: WidgetSlot[];
}

export const DEFAULT_LAYOUT_FREELANCER: DashboardLayoutConfig = {
  widgets: [
    { type: "my-issues", position: { col: 0, row: 0, w: 5, h: 4 } },
  ],
};

export const DEFAULT_LAYOUT_MEMBER: DashboardLayoutConfig = {
  widgets: [
    { type: "my-issues", position: { col: 0, row: 0, w: 3, h: 4 } },
    { type: "projects", position: { col: 3, row: 0, w: 2, h: 4 } },
  ],
};

export const DEFAULT_LAYOUT_MANAGER: DashboardLayoutConfig = {
  widgets: [
    { type: "my-issues", position: { col: 0, row: 0, w: 3, h: 4 } },
    { type: "projects", position: { col: 3, row: 0, w: 2, h: 4 } },
    { type: "approvals", position: { col: 0, row: 4, w: 2, h: 3 } },
    { type: "agent-runs", position: { col: 2, row: 4, w: 2, h: 3 } },
    { type: "releases", position: { col: 4, row: 4, w: 1, h: 3 } },
  ],
};

export const DEFAULT_LAYOUT_OWNER: DashboardLayoutConfig = {
  widgets: [
    { type: "my-issues", position: { col: 0, row: 0, w: 3, h: 4 } },
    { type: "projects", position: { col: 3, row: 0, w: 2, h: 4 } },
    { type: "approvals", position: { col: 0, row: 4, w: 2, h: 3 } },
    { type: "agent-runs", position: { col: 2, row: 4, w: 2, h: 3 } },
    { type: "releases", position: { col: 4, row: 4, w: 1, h: 3 } },
    { type: "risks", position: { col: 0, row: 7, w: 3, h: 3 } },
    { type: "blockers", position: { col: 3, row: 7, w: 2, h: 3 } },
  ],
};

export type PersonaKey = "freelancer" | "member" | "manager" | "owner";

export const PERSONA_DEFAULTS: Record<PersonaKey, DashboardLayoutConfig> = {
  freelancer: DEFAULT_LAYOUT_FREELANCER,
  member: DEFAULT_LAYOUT_MEMBER,
  manager: DEFAULT_LAYOUT_MANAGER,
  owner: DEFAULT_LAYOUT_OWNER,
};
