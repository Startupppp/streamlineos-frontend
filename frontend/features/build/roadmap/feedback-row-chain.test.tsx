import { render, screen } from "@testing-library/react";
import { FeedbackRow } from "./feedback-row";
import { RoadmapItemCard } from "./roadmap-item-card";
import type { FeedbackPost, RoadmapItem } from "@/types/projects";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useUpdateFeedbackPost: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@animateicons/react/lucide", () => ({
  GitMergeIcon: () => null,
  Trash2Icon: () => null,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    "aria-label": ariaLabel,
    onClick,
  }: {
    "aria-label"?: string;
    onClick?: () => void;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick}>
      {ariaLabel}
    </button>
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    "aria-label": ariaLabel,
    onClick,
  }: {
    children?: React.ReactNode;
    "aria-label"?: string;
    onClick?: () => void;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    "aria-label": ariaLabel,
    className,
  }: {
    href: string;
    children?: React.ReactNode;
    "aria-label"?: string;
    className?: string;
  }) => (
    <a href={href} aria-label={ariaLabel} className={className}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PM_PANEL: "",
}));

jest.mock("@/lib/motion-presets", () => ({
  listItem: {},
  listItemReduced: {},
  pmSnappy: {},
}));

jest.mock("@/lib/text-overflow", () => ({
  TEXT_ONE_LINE: "",
  TEXT_TWO_LINES: "",
}));

jest.mock("./roadmap-constants", () => ({
  FEEDBACK_STATUS_OPTIONS: [
    { value: "open", label: "Open" },
    { value: "planned", label: "Planned" },
  ],
  FEEDBACK_STATUS_VARIANT: { open: "secondary", planned: "default" },
}));

function makePost(overrides: Partial<FeedbackPost> = {}): FeedbackPost {
  return {
    id: 1,
    orgId: "org-1",
    title: "Test feedback",
    description: null,
    status: "open",
    category: null,
    votes: 0,
    submittedByName: null,
    submittedByEmail: null,
    linkedRoadmapItemId: null,
    duplicateOfId: null,
    mergedAt: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeItem(overrides: Partial<RoadmapItem> = {}): RoadmapItem {
  return {
    id: 10,
    orgId: "org-1",
    title: "Roadmap item",
    description: null,
    status: "planned",
    category: null,
    isPublic: true,
    projectId: null,
    epicTicketId: null,
    targetQuarter: null,
    sortOrder: 0,
    votes: 0,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Chain navigability — FeedbackRow", () => {
  it("renders a link to /build/roadmap when linkedRoadmapItemId is set — positive control: anchor present", () => {
    render(
      <FeedbackRow
        post={makePost({ linkedRoadmapItemId: 42 })}
        roadmapItems={[]}
        onDelete={jest.fn()}
        onMerge={jest.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /view roadmap/i })).toBeInTheDocument();
  });

  it("does NOT render the roadmap link when linkedRoadmapItemId is null — negative control: no link present", () => {
    render(
      <FeedbackRow
        post={makePost({ linkedRoadmapItemId: null })}
        roadmapItems={[]}
        onDelete={jest.fn()}
        onMerge={jest.fn()}
      />,
    );
    expect(screen.queryByRole("link", { name: /view roadmap/i })).not.toBeInTheDocument();
  });

  it("roadmap link points to /build/roadmap", () => {
    render(
      <FeedbackRow
        post={makePost({ linkedRoadmapItemId: 5 })}
        roadmapItems={[]}
        onDelete={jest.fn()}
        onMerge={jest.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /view roadmap/i })).toHaveAttribute(
      "href",
      "/build/roadmap",
    );
  });
});

describe("Chain navigability — RoadmapItemCard", () => {
  it("renders a link to the project when projectId is set — positive control: anchor present", () => {
    render(
      <RoadmapItemCard
        item={makeItem({ projectId: 7 })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /view project/i })).toBeInTheDocument();
  });

  it("does NOT render the project link when projectId is null — negative control: no link present", () => {
    render(
      <RoadmapItemCard
        item={makeItem({ projectId: null })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByRole("link", { name: /view project/i })).not.toBeInTheDocument();
  });

  it("project link points to /build/:projectId", () => {
    render(
      <RoadmapItemCard
        item={makeItem({ projectId: 7 })}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByRole("link", { name: /view project/i })).toHaveAttribute(
      "href",
      "/build/7",
    );
  });
});
