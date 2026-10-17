import { fireEvent, render, screen } from "@testing-library/react";
import { calendarMeetingWorkspaceContract } from "@/hooks/api/calendar-meeting-workspace-schema";
import { MeetingWorkspaceContext } from "./meeting-workspace-context";
import { MeetingWorkspaceGovernance } from "./meeting-workspace-governance";

const mockUpdateMeetingWorkspace = jest.fn();

jest.mock("@/hooks/api/calendar-meeting-workspace", () => ({
  useAddCalendarMeetingContext: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateCalendarMeetingContext: () => ({ mutate: jest.fn() }),
  useUpdateCalendarMeetingWorkspace: () => ({ mutate: mockUpdateMeetingWorkspace }),
}));

function workspace(canManage: boolean) {
  return calendarMeetingWorkspaceContract.parse({
    id: "744d39ef-7f53-46dd-80fa-185d3aa71cf2",
    eventId: 12,
    eventTitle: "Review",
    eventStartAt: "2026-10-13T09:00:00.000Z",
    eventEndAt: "2026-10-13T10:00:00.000Z",
    agenda: null,
    canManage,
    version: 1,
    retentionUntil: null,
    recordingConsentStatus: "PENDING",
    recordingConsentAt: null,
    contexts: [{
      id: "19054157-214c-4dd7-b0d8-92c0953da6d7",
      contextType: "ENTITY",
      sourceKey: "deal",
      sourceRecordId: "842",
      state: "STALE",
      title: "Deal review",
      summary: null,
      href: "/crm/deals/842",
      sourceVersion: "v2",
      sharedWithGuests: false,
      consentStatus: "NOT_REQUIRED",
      staleAt: null,
      retentionUntil: null,
      failureCode: "SOURCE_VERSION_CHANGED",
      version: 1,
    }],
    notes: [],
    drafts: [],
    sourceCoverage: { available: 0, unavailable: 0, stale: 1, consentRequired: 0 },
    createdAt: "2026-10-13T08:00:00.000Z",
    updatedAt: "2026-10-13T08:00:00.000Z",
  });
}

describe("meeting workspace capability controls", () => {
  it("shows current context and governance state without organizer mutations to an attendee", () => {
    const value = workspace(false);
    render(<><MeetingWorkspaceContext workspace={value} /><MeetingWorkspaceGovernance workspace={value} /></>);
    expect(screen.getByText("Deal review")).toBeInTheDocument();
    expect(screen.getByText("STALE")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Link context" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share with guests" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record consent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("shows organizer controls when the server grants management", () => {
    const value = workspace(true);
    render(<><MeetingWorkspaceContext workspace={value} /><MeetingWorkspaceGovernance workspace={value} /></>);
    expect(screen.getByRole("button", { name: "Link context" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record consent" })).toBeInTheDocument();
  });

  it("shows the latest retention date after a workspace update", () => {
    const initial = { ...workspace(true), retentionUntil: "2026-11-01T23:59:59.999Z" };
    const { rerender } = render(<MeetingWorkspaceGovernance workspace={initial} />);
    expect(screen.getByRole("button", { name: "Remove retained workspace content after" })).toHaveTextContent("November 1st, 2026");

    rerender(<MeetingWorkspaceGovernance workspace={{ ...initial, version: 2, retentionUntil: "2026-12-02T23:59:59.999Z" }} />);

    expect(screen.getByRole("button", { name: "Remove retained workspace content after" })).toHaveTextContent("December 2nd, 2026");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mockUpdateMeetingWorkspace).toHaveBeenCalledWith(
      { workspaceId: initial.id, expectedVersion: 2, retentionUntil: "2026-12-02T23:59:59.999Z" },
      expect.any(Object),
    );
  });

  it("shows failure states without opening unavailable source content", () => {
    const value = workspace(false);
    const original = value.contexts[0];
    const contexts = [
      { ...original, id: "49300e37-a9a5-4819-9045-b65aff30a49a", state: "UNAVAILABLE" as const, title: null, summary: null, href: null, sourceKey: null, sourceRecordId: null, failureCode: "PERMISSION_OR_SOURCE_UNAVAILABLE" },
      { ...original, id: "fd5f6a4f-c71a-4b3b-8ed2-8782dd405174", state: "CONSENT_REQUIRED" as const, title: null, summary: null, href: null, sourceKey: null, sourceRecordId: null, failureCode: "CONSENT_WITHDRAWN", contextType: "TRANSCRIPT" as const },
      { ...original, id: "462a4485-4424-4890-9c0c-460582f96665", state: "EXPIRED" as const, title: null, summary: null, href: null, sourceKey: null, sourceRecordId: null, failureCode: "RETENTION_EXPIRED" },
    ];
    render(<><MeetingWorkspaceContext workspace={{ ...value, contexts }} /><MeetingWorkspaceGovernance workspace={value} /></>);
    expect(screen.getByText("UNAVAILABLE")).toBeInTheDocument();
    expect(screen.getByText("CONSENT REQUIRED")).toBeInTheDocument();
    expect(screen.getByText("EXPIRED")).toBeInTheDocument();
    expect(screen.getByText("permission or source unavailable")).toBeInTheDocument();
    expect(screen.getByText("consent withdrawn")).toBeInTheDocument();
    expect(screen.getByText("retention expired")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open source" })).not.toBeInTheDocument();
  });
});
