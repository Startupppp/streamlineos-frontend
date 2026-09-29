import { fireEvent, render, screen } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { EpicCard } from "./epic-card";

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: () => null,
  ChevronDownIcon: () => null,
  ChevronRightIcon: () => null,
  PlusIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/pm-chrome", () => ({
  PM_PANEL: "pm-panel",
  PM_PANEL_SOLID: "pm-panel-solid",
}));

jest.mock("./edit-epic-dialog", () => ({ EditEpicDialog: () => null }));
jest.mock("./epic-story-row", () => ({ EpicStoryRow: () => null }));
jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

const EPIC = {
  id: 9,
  title: "Checkout rewrite",
  description: "Replace the legacy funnel",
  status: "IN_PROGRESS",
  priority: "HIGH",
  points: null,
  version: 2,
  startDate: "2026-02-01",
  dueDate: "2026-03-15",
  assignee: {
    id: "user-1",
    name: null,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    image: null,
  },
};

function renderCard(overrides: Record<string, unknown> = {}) {
  return render(
    <EpicCard
      epic={EPIC}
      stories={[]}
      projectId={42}
      projectKey="PAY"
      unlinkedStories={[]}
      onDeleteEpic={jest.fn()}
      onLinkStory={jest.fn()}
      onCreateStory={jest.fn()}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  (useCan as jest.Mock).mockReturnValue(true);
});

describe("EpicCard — the core fields the page contract lists are on the card", () => {
  it("renders the epic's own status beside its priority, which is a different field", () => {
    renderCard();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders the owner by display name rather than an id or nothing at all", () => {
    renderCard();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("user-1")).not.toBeInTheDocument();
  });

  it("renders the start and due dates the epic carries", () => {
    renderCard();
    expect(screen.getByText(/Feb 1/)).toBeInTheDocument();
    expect(screen.getByText(/Mar 15, 2026/)).toBeInTheDocument();
  });

  it("renders the dependency count the page hands it", () => {
    renderCard({ dependencyCount: 3 });
    expect(screen.getByText("3 dependencies")).toBeInTheDocument();
  });

  it("renders one dependency in the singular, and none at all at zero", () => {
    const { unmount } = renderCard({ dependencyCount: 1 });
    expect(screen.getByText("1 dependency")).toBeInTheDocument();
    unmount();
    renderCard({ dependencyCount: 0 });
    expect(screen.queryByText(/dependenc/)).not.toBeInTheDocument();
  });

  it("renders no owner or date line for an epic that carries neither, so an unset field is not invented", () => {
    renderCard({
      epic: { ...EPIC, assignee: null, startDate: null, dueDate: null },
    });
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByText(/Mar 15, 2026/)).not.toBeInTheDocument();
  });
});

describe("EpicCard — right click reaches the same authorized commands as the row menu", () => {
  it("opens the actions menu on a right click, so the context gesture is not a dead end", () => {
    renderCard();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByText("Checkout rewrite"));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("opens no menu on a right click for a viewer with neither update nor delete, so the gesture never offers a denied command", () => {
    (useCan as jest.Mock).mockReturnValue(false);
    renderCard();
    fireEvent.contextMenu(screen.getByText("Checkout rewrite"));
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});
