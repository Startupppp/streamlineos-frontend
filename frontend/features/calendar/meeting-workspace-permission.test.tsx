import { render, screen } from "@testing-library/react";
import { calendarMeetingWorkspaceContract } from "@/hooks/api/calendar-meeting-workspace-schema";
import { MeetingWorkspaceContext } from "./meeting-workspace-context";
import { MeetingWorkspaceGovernance } from "./meeting-workspace-governance";

jest.mock("@/hooks/api/calendar-meeting-workspace", () => ({
  useAddCalendarMeetingContext: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateCalendarMeetingContext: () => ({ mutate: jest.fn() }),
  useUpdateCalendarMeetingWorkspace: () => ({ mutate: jest.fn() }),
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
});
