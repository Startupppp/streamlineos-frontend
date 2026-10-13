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
  return render(<CalendarInvitationPage />, { wrapper: Wrapper });
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

  it("renders an obsolete-link state without exposing event details", async () => {
    mockedGet.mockRejectedValue(new Error("Invitation link is invalid or expired"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("This link is no longer available");
    expect(screen.queryByText("Quarterly planning")).not.toBeInTheDocument();
  });
});
