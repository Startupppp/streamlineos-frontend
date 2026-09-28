import type { ReactNode, HTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import type { ProjectListItem } from "@/types/projects";
import { ProjectCard, projectHealthClasses } from "./command-center-rows";

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
