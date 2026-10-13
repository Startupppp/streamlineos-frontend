import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import CalendarPollPage from "./page";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), put: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ token: "signed.poll.token" }),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPut = apiClient.put as jest.Mock;

const poll = {
  id: "f2cb9176-ab06-4734-8dfa-049012e25c3f",
  title: "Quarterly planning",
  status: "open",
  expiresAt: "2026-10-14T10:00:00.000Z",
  holdOptions: true,
  selectedOptionId: null,
  finalizedBookingId: null,
  version: 1,
  options: [
    {
      id: "50576a43-b8e5-494f-85cb-891023d2e810",
      startAt: "2026-10-15T10:00:00.000Z",
      endAt: "2026-10-15T10:30:00.000Z",
      status: "proposed",
      votes: { yes: 1, maybe: 0, no: 0 },
    },
  ],
  viewer: {
    voterId: "10e930d7-43a8-42f2-9dc9-01c8a0b905ce",
    requirement: "required",
    responses: {},
  },
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<CalendarPollPage />, { wrapper: Wrapper });
}

describe("public scheduling poll page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue(poll);
    mockedPut.mockResolvedValue({
      ...poll,
      options: [{ ...poll.options[0], votes: { yes: 2, maybe: 0, no: 0 } }],
      viewer: {
        ...poll.viewer,
        responses: { [poll.options[0].id]: "yes" },
      },
    });
  });

  it("shows vote totals and saves a signed anonymous response", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Quarterly planning" })).toBeInTheDocument();
    expect(screen.getByText("1 yes")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Yes for/ }));
    await waitFor(() =>
      expect(mockedPut).toHaveBeenCalledWith(
        "/public/calendar/polls/signed.poll.token/votes",
        { optionId: poll.options[0].id, response: "yes" },
        undefined,
        expect.anything(),
      ),
    );
    expect(await screen.findByText("Your vote was saved.")).toBeInTheDocument();
  });

  it("keeps results visible and removes voting controls after expiry", async () => {
    mockedGet.mockResolvedValue({ ...poll, status: "expired" });
    renderPage();
    expect(await screen.findByText("Voting has ended because this poll expired.")).toBeInTheDocument();
    expect(screen.getByText("1 yes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Yes for/ })).not.toBeInTheDocument();
  });

  it("hides poll details when the signed link is invalid", async () => {
    mockedGet.mockRejectedValue(new Error("Scheduling poll not found"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("This poll is unavailable");
    expect(screen.queryByText("Quarterly planning")).not.toBeInTheDocument();
  });
});
