import { render, screen } from "@testing-library/react";
import { FeedbackRow } from "./feedback-row";
import { ChangelogEntryCard } from "./changelog-entry-card";
import type { FeedbackPost, ChangelogEntry } from "@/types/projects";
import { useCan } from "@/hooks/api/access";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

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

jest.mock("@/hooks/api/crm", () => ({
  useCrmOrganizationsForPicker: jest.fn(() => ({
    data: { organizations: [{ id: 9, name: "Acme" }] },
  })),
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
    disabled,
  }: {
    children?: React.ReactNode;
    "aria-label"?: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick} disabled={disabled}>
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
  }: {
    href: string;
    children?: React.ReactNode;
    "aria-label"?: string;
  }) => <a href={href} aria-label={ariaLabel}>{children}</a>,
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
  FEEDBACK_STATUS_OPTIONS: [{ value: "open", label: "Open" }],
  FEEDBACK_STATUS_VARIANT: { open: "secondary" },
  CHANGELOG_TYPE_OPTIONS: [{ value: "feature", label: "Feature" }],
  CHANGELOG_TYPE_VARIANT: { feature: "default" },
}));

jest.mock("date-fns", () => ({
  format: jest.fn(() => "Jan 1, 2026"),
}));

const mockUseCan = useCan as jest.Mock;

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
    crmContactId: null,
    crmOrganizationId: null,
    accountValueSnapshot: null,
    accountTierSnapshot: null,
    linkedRoadmapItemId: null,
    duplicateOfId: null,
    mergedAt: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ChangelogEntry> = {}): ChangelogEntry {
  return {
    id: 1,
    orgId: "org-1",
    title: "v1.0",
    content: "shipped",
    version: null,
    type: "feature",
    isPublished: false,
    linkedRoadmapItemId: null,
    publishedAt: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("FeedbackRow — permission gate", () => {
  it("shows merge and delete buttons when canManage is true — positive control: both present", () => {
    mockUseCan.mockReturnValue(true);
    render(
      <FeedbackRow
        post={makePost()}
        roadmapItems={[]}
        onDelete={jest.fn()}
        onMerge={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /merge/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides merge and delete when canManage is false — negative control: buttons absent", () => {
    mockUseCan.mockReturnValue(false);
    render(
      <FeedbackRow
        post={makePost()}
        roadmapItems={[]}
        onDelete={jest.fn()}
        onMerge={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /merge/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("queries build:roadmap:manage permission — positive control: useCan called with the right key", () => {
    mockUseCan.mockReturnValue(true);
    render(
      <FeedbackRow
        post={makePost()}
        roadmapItems={[]}
        onDelete={jest.fn()}
        onMerge={jest.fn()}
      />,
    );
    expect(mockUseCan).toHaveBeenCalledWith("build:roadmap:manage");
  });
});

describe("ChangelogEntryCard — permission gate", () => {
  it("shows publish, edit and delete controls when canManage is true — positive control: controls present", () => {
    render(
      <ChangelogEntryCard
        entry={makeEntry()}
        isUpdating={false}
        canManage
        onTogglePublish={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("hides publish, edit and delete when canManage is false — negative control: controls absent", () => {
    render(
      <ChangelogEntryCard
        entry={makeEntry()}
        isUpdating={false}
        canManage={false}
        onTogglePublish={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});
