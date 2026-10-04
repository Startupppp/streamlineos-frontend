import { render, screen } from "@testing-library/react";
import { IncidentTimeline } from "./incident-timeline";

jest.mock("@/hooks/api/build/incidents", () => ({
  useAddIncidentUpdate: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/lib/date-utils", () => ({
  formatDateTime: (v: string) => v,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

type Update = {
  id: number;
  message: string;
  newStatus?: string | null;
  createdAt: string;
  createdByName?: string | null;
  createdByEmail?: string | null;
};

function makeUpdate(overrides: Partial<Update> = {}): Update {
  return {
    id: 1,
    message: "Initial response deployed",
    newStatus: null,
    createdAt: "2026-01-01T10:00:00.000Z",
    createdByName: "Alice",
    createdByEmail: null,
    ...overrides,
  };
}

describe("IncidentTimeline", () => {
  it("renders empty-state message when no updates exist", () => {
    render(
      <IncidentTimeline
        projectId={1}
        incidentId={1}
        updates={[]}
        canManage={false}
        unresolvedFollowUps={0}
      />,
    );
    expect(screen.getByText(/no updates yet/i)).toBeInTheDocument();
  });

  it("renders update message when updates are present", () => {
    render(
      <IncidentTimeline
        projectId={1}
        incidentId={1}
        updates={[makeUpdate({ message: "Deployed hotfix" })]}
        canManage={false}
        unresolvedFollowUps={0}
      />,
    );
    expect(screen.getByText("Deployed hotfix")).toBeInTheDocument();
  });

  it("shows status transition badge when update has newStatus resolved", () => {
    render(
      <IncidentTimeline
        projectId={1}
        incidentId={1}
        updates={[makeUpdate({ newStatus: "resolved", message: "Issue fixed" })]}
        canManage={false}
        unresolvedFollowUps={0}
      />,
    );
    expect(screen.getByText(/→/)).toBeInTheDocument();
    expect(screen.getByText(/Resolved/)).toBeInTheDocument();
  });

  it("does NOT show status transition badge when update has no newStatus", () => {
    render(
      <IncidentTimeline
        projectId={1}
        incidentId={1}
        updates={[makeUpdate({ newStatus: null, message: "Just a note" })]}
        canManage={false}
        unresolvedFollowUps={0}
      />,
    );
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
    expect(screen.getByText("Just a note")).toBeInTheDocument();
  });

  it("displays actor name in each timeline entry", () => {
    render(
      <IncidentTimeline
        projectId={1}
        incidentId={1}
        updates={[makeUpdate({ createdByName: "Bob", createdAt: "2026-01-02T12:00:00.000Z" })]}
        canManage={false}
        unresolvedFollowUps={0}
      />,
    );
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it("does not render the add-update form when canManage is false", () => {
    render(
      <IncidentTimeline
        projectId={1}
        incidentId={1}
        updates={[]}
        canManage={false}
        unresolvedFollowUps={0}
      />,
    );
    expect(screen.queryByRole("button", { name: /post update/i })).not.toBeInTheDocument();
  });

  it("renders updates sorted newest-first even when they arrive out of chronological order", () => {
    const updates = [
      makeUpdate({ id: 10, message: "earliest", createdAt: "2026-01-01T08:00:00.000Z" }),
      makeUpdate({ id: 30, message: "latest", createdAt: "2026-01-01T12:00:00.000Z" }),
      makeUpdate({ id: 20, message: "middle", createdAt: "2026-01-01T10:00:00.000Z" }),
    ];
    render(
      <IncidentTimeline
        projectId={1}
        incidentId={1}
        updates={updates}
        canManage={false}
        unresolvedFollowUps={0}
      />,
    );
    const messages = screen.getAllByText(/earliest|middle|latest/);
    expect(messages[0]).toHaveTextContent("latest");
    expect(messages[1]).toHaveTextContent("middle");
    expect(messages[2]).toHaveTextContent("earliest");
  });
});
