import type { ReactNode, HTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import type { ProjectListItem } from "@/types/projects";
import { ProjectCard } from "./command-center-rows";
import { projectHealthClasses } from "./command-center-rows-model";
import { WIDGET_CATALOG, getWidgetEntry } from "./widget-catalog";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
    span: ({ children, ...rest }: HTMLAttributes<HTMLSpanElement>) => (
      <span {...rest}>{children}</span>
    ),
  },
  useReducedMotion: () => true,
}));

jest.mock("@/lib/motion-presets", () => ({
  listItem: {},
  listItemReduced: {},
  pmSnappy: {},
  pmSpring: {},
}));

jest.mock("@/components/pm-chrome", () => ({ PM_ROW: "" }));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@animateicons/react/lucide", () => ({
  ChevronRightIcon: () => null,
  LayoutGridIcon: () => null,
  LayoutListIcon: () => null,
  SettingsIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/features/build/shared/priority-badge", () => ({
  PriorityBadge: () => null,
}));

jest.mock("@/components/shared/ticket-status-badge", () => ({
  StatusBadge: () => null,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: () => "/build/1/issues/1",
}));

function makeProject(health: ProjectListItem["health"]): ProjectListItem {
  return {
    id: 1,
    name: "Atlas",
    description: null,
    key: "ATL",
    status: "ACTIVE",
    progress: { total: 10, done: 5, percentage: 50 },
    health,
  } as unknown as ProjectListItem;
}

describe("ProjectCard — project health is the Command Center core field, not progress", () => {
  it("renders the On track label for a project the server reports as on_track", () => {
    render(<ProjectCard project={makeProject("on_track")} />);
    expect(screen.getByText("On track")).toBeInTheDocument();
  });

  it("renders the At risk label for a project the server reports as at_risk", () => {
    render(<ProjectCard project={makeProject("at_risk")} />);
    expect(screen.getByText("At risk")).toBeInTheDocument();
    expect(screen.queryByText("On track")).not.toBeInTheDocument();
  });

  it("renders the Off track label for a project the server reports as off_track", () => {
    render(<ProjectCard project={makeProject("off_track")} />);
    expect(screen.getByText("Off track")).toBeInTheDocument();
    expect(screen.queryByText("On track")).not.toBeInTheDocument();
  });

  it("distinguishes the three health values by tone so the badge is not one colour for every state", () => {
    const onTrack = projectHealthClasses("on_track");
    const atRisk = projectHealthClasses("at_risk");
    const offTrack = projectHealthClasses("off_track");
    expect(new Set([onTrack, atRisk, offTrack]).size).toBe(3);
  });

  it("draws every health tone from the design-token helper rather than a raw colour literal", () => {
    for (const health of ["on_track", "at_risk", "off_track"] as const) {
      expect(projectHealthClasses(health)).toMatch(/^bg-status-[a-z]+-surface /);
    }
  });
});

describe("widget-catalog drill-down hrefs — each widget routes to the correct surface", () => {
  it("my-issues routes to /build/my-work so keyboard drill-down lands on the tickets list", () => {
    expect(getWidgetEntry("my-issues").drillDownHref).toBe("/build/my-work");
  });

  it("projects routes to /build/projects so the drill-down reaches the project list", () => {
    expect(getWidgetEntry("projects").drillDownHref).toBe("/build/projects");
  });

  it("approvals routes to /build/approvals so the drill-down lands on the approvals queue", () => {
    expect(getWidgetEntry("approvals").drillDownHref).toBe("/build/approvals");
  });

  it("blockers drill-down appends a filter so the destination pre-filters to blocked tickets", () => {
    expect(getWidgetEntry("blockers").drillDownHref).toContain("filter=blocked");
  });

  it("every catalog entry has a non-empty title so widgets are never unlabelled", () => {
    for (const [, entry] of Object.entries(WIDGET_CATALOG)) {
      expect(entry.title.length).toBeGreaterThan(0);
    }
  });

  it("every catalog entry has a non-empty drillDownHref so navigation always has a destination", () => {
    for (const [, entry] of Object.entries(WIDGET_CATALOG)) {
      expect(entry.drillDownHref.length).toBeGreaterThan(0);
    }
  });
});
