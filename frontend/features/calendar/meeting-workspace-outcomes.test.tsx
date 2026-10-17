import { render, screen } from "@testing-library/react";
import { calendarMeetingWorkspaceContract } from "@/hooks/api/calendar-meeting-workspace-schema";
import { MeetingWorkspaceOutcomes } from "./meeting-workspace-outcomes";

jest.mock("@/hooks/api/calendar-meeting-workspace", () => ({
  useAddCalendarMeetingDraft: () => ({ mutate: jest.fn(), isPending: false }),
  useReviewCalendarMeetingDraft: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/calendar-source-actions", () => ({
  useConfirmCalendarSourceActionProposal: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./meeting-workspace-source-action-draft", () => ({
  MeetingWorkspaceSourceActionDraft: () => null,
}));

function workspace(sourceOutcomeUnavailable: boolean) {
  return calendarMeetingWorkspaceContract.parse({
    id: "744d39ef-7f53-46dd-80fa-185d3aa71cf2",
    eventId: 12,
    eventTitle: "Review",
    eventStartAt: "2026-10-13T09:00:00.000Z",
    eventEndAt: "2026-10-13T10:00:00.000Z",
    agenda: null,
    canManage: false,
    version: 1,
    retentionUntil: null,
    recordingConsentStatus: "PENDING",
    recordingConsentAt: null,
    contexts: [],
    notes: [],
    drafts: [{
      id: "19054157-214c-4dd7-b0d8-92c0953da6d7",
      kind: "ACTION",
      content: "Follow up with the customer",
      ownerMembershipId: null,
      sharedWithGuests: true,
      status: "PROPOSED",
      sourceActionProposalId: null,
      sourceProposal: null,
      sourceOutcome: null,
      sourceOutcomeUnavailable,
      version: 2,
      reviewedAt: "2026-10-13T09:30:00.000Z",
      createdAt: "2026-10-13T09:00:00.000Z",
      updatedAt: "2026-10-13T09:30:00.000Z",
    }],
    sourceCoverage: { available: 0, unavailable: 0, stale: 0, consentRequired: 0 },
    createdAt: "2026-10-13T09:00:00.000Z",
    updatedAt: "2026-10-13T09:30:00.000Z",
  });
}

describe("meeting outcome partial-source visibility", () => {
  it("preserves the server failure signal and shows it alongside the reviewed draft", () => {
    const value = workspace(true);
    expect(value.drafts[0].sourceOutcomeUnavailable).toBe(true);
    render(<MeetingWorkspaceOutcomes workspace={value} onRefresh={jest.fn()} />);
    expect(screen.getByText("Follow up with the customer")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Source action status is temporarily unavailable");
    expect(screen.getByText("Shared with guests")).toBeInTheDocument();
  });

  it("does not show a failure when the source lookup succeeded", () => {
    render(<MeetingWorkspaceOutcomes workspace={workspace(false)} onRefresh={jest.fn()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
