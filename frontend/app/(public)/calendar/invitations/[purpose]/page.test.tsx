import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import CalendarInvitationPage from "./page";

let purpose = "rsvp";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ purpose }),
  useSearchParams: () => ({ get: (key: string) => key === "token" ? "signed-token" : null }),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

const invitation = {
  id: "7f2ee9ca-5f5f-489b-9c71-769488380130",
  title: "Quarterly planning",
  startAt: "2026-10-14T10:00:00.000Z",
  endAt: "2026-10-14T11:00:00.000Z",
  role: "required",
  rsvpStatus: "pending",
  meetingUrl: null,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { ...render(<CalendarInvitationPage />, { wrapper: Wrapper }), client };
}

describe("public calendar invitation page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    purpose = "rsvp";
    mockedGet.mockResolvedValue(invitation);
    mockedPost.mockResolvedValue({ ...invitation, rsvpStatus: "accepted" });
  });

  it("loads the RSVP scoped invitation and saves an explicit response", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Quarterly planning" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith(
      "/public/calendar/invitations/rsvp",
      { token: "signed-token", status: "accepted" },
      undefined,
      expect.anything(),
    ));
    expect(await screen.findByText("Your response is accepted.")).toBeInTheDocument();
  });

  it("shows the end date when an invitation crosses a calendar day", async () => {
    mockedGet.mockResolvedValue({ ...invitation, endAt: "2026-10-16T11:00:00.000Z" });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Quarterly planning" })).toBeInTheDocument();
    expect(screen.getByText(/Wednesday, October 14, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Friday, October 16, 2026/).closest("time"))
      .toHaveAttribute("dateTime", "2026-10-16T11:00:00.000Z");
  });

  it("shows meeting access only when the join scoped endpoint returns it", async () => {
    purpose = "join";
    mockedGet.mockResolvedValue({ ...invitation, meetingUrl: "https://meet.example.com/room" });
    renderPage();
    const link = await screen.findByRole("link", { name: "Join meeting" });
    expect(link).toHaveAttribute("href", "https://meet.example.com/room");
    expect(mockedGet).toHaveBeenCalledWith(
      "/public/calendar/invitations/join",
      { token: "signed-token" },
      expect.anything(),
      expect.anything(),
    );
  });

  it("shows only reviewed and explicitly shared meeting content to a join-link guest", async () => {
    purpose = "join";
    mockedGet.mockImplementation((path: string) => path === "/public/calendar/meeting-workspace"
      ? Promise.resolve({
        eventId: 7,
        eventTitle: "Quarterly planning",
        eventStartAt: invitation.startAt,
        eventEndAt: invitation.endAt,
        sharedContexts: [],
        sharedNotes: [{ id: "601e5240-3120-4c31-86cb-d10442ccae58", kind: "NOTE", content: "Guest agenda", sharedWithGuests: true, authorMembershipId: null, version: 1, retentionUntil: null, createdAt: invitation.startAt, updatedAt: invitation.startAt }],
        sharedDrafts: [{ id: "93241195-a367-4d2e-94a5-63ff4d489ef0", kind: "FOLLOW_UP", content: "Send approved recap", ownerMembershipId: null, sharedWithGuests: true, status: "APPLIED", sourceActionProposalId: null, sourceProposal: null, sourceOutcome: null, sourceOutcomeUnavailable: false, version: 2, reviewedAt: invitation.startAt, createdAt: invitation.startAt, updatedAt: invitation.startAt }],
      })
      : Promise.resolve(invitation));

    renderPage();

    expect(await screen.findByText("Guest agenda")).toBeInTheDocument();
    expect(screen.getByText("Send approved recap")).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith(
      "/public/calendar/meeting-workspace",
      { token: "signed-token" },
      expect.anything(),
      expect.anything(),
    );
  });

  it("removes shared workspace content when the join link is revoked", async () => {
    purpose = "join";
    mockedGet.mockImplementation((path: string) => path === "/public/calendar/meeting-workspace"
      ? Promise.resolve({
        eventId: 7,
        eventTitle: "Quarterly planning",
        eventStartAt: invitation.startAt,
        eventEndAt: invitation.endAt,
        sharedContexts: [],
        sharedNotes: [{ id: "601e5240-3120-4c31-86cb-d10442ccae58", kind: "NOTE", content: "Guest agenda", sharedWithGuests: true, authorMembershipId: null, version: 1, retentionUntil: null, createdAt: invitation.startAt, updatedAt: invitation.startAt }],
        sharedDrafts: [],
      })
      : Promise.resolve(invitation));
    const { client } = renderPage();
    expect(await screen.findByText("Guest agenda")).toBeInTheDocument();

    mockedGet.mockRejectedValue(new Error("Invitation link is invalid or expired"));
    await client.invalidateQueries({ queryKey: ["public", "calendar", "invitation", "join", "signed-token"] });

    expect(await screen.findByRole("alert")).toHaveTextContent("This link is no longer available");
    expect(screen.queryByText("Guest agenda")).not.toBeInTheDocument();
  });

  it("renders an obsolete-link state without exposing event details", async () => {
    mockedGet.mockRejectedValue(new Error("Invitation link is invalid or expired"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("This link is no longer available");
    expect(screen.queryByText("Quarterly planning")).not.toBeInTheDocument();
  });

  it("hides cached meeting access after the join link is revoked", async () => {
    purpose = "join";
    mockedGet.mockResolvedValue({ ...invitation, meetingUrl: "https://meet.example.com/room" });
    const { client } = renderPage();
    expect(await screen.findByRole("link", { name: "Join meeting" })).toBeInTheDocument();
    mockedGet.mockRejectedValue(new Error("Invitation link is invalid or expired"));
    await client.invalidateQueries({ queryKey: ["public", "calendar", "invitation", "join", "signed-token"] });
    expect(await screen.findByRole("alert")).toHaveTextContent("This link is no longer available");
    expect(screen.queryByRole("heading", { name: "Quarterly planning" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Join meeting" })).not.toBeInTheDocument();
  });
});
