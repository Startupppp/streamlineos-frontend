import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import { PublicCalendarBookingPage } from "./public-calendar-booking-page";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ token: "booking-token-value-long-enough" }),
  useSearchParams: () => new URLSearchParams("state=customer-state&utm_source=partner"),
}));

const mockedGet = jest.mocked(apiClient.get);
const mockedPost = jest.mocked(apiClient.post);

const offering = {
  title: "Discovery call",
  description: "Choose a time",
  durationMinutes: 30,
  timeZone: "Asia/Kolkata",
  version: 3,
  intakeFields: [
    { key: "company", label: "Company", type: "text", required: true },
    { key: "private_note", label: "Private note", type: "textarea", required: false },
  ],
  cancellationNoticeMinutes: 60,
  rescheduleNoticeMinutes: 60,
  requiresApproval: false,
  availabilityState: "available",
  message: "Choose an available time.",
  slots: [{
    start: "2026-10-20T10:00:00.000Z",
    end: "2026-10-20T10:30:00.000Z",
    localStart: "2026-10-20T15:30:00+05:30",
    localEnd: "2026-10-20T16:00:00+05:30",
  }],
};

const session = {
  sessionToken: "session-token-value-long-enough",
  channel: "embed",
  targetOrigin: "https://customer.example",
  callbackSignature: "signed-callback-state",
  locale: "en-US",
  branding: {
    displayName: "Northwind",
    logoUrl: null,
    primaryColor: "#3366AA",
    showPoweredBy: true,
  },
  copy: {
    locale: "en-US",
    title: "Meet Northwind",
    description: "Pick a convenient time",
    consentLabel: "I agree to scheduling contact",
    fieldLabels: { company: "Organization" },
  },
  callbackFacts: ["outcome"],
  intakeKeys: ["company"],
  consentRequired: true,
  distributionVersion: 2,
};

const hold = {
  id: "6c3108af-c12f-463c-a1c1-61302db73b3a",
  status: "held",
  startAt: offering.slots[0].start,
  endAt: offering.slots[0].end,
  fencingToken: 1,
  expiresAt: "2026-10-20T09:05:00.000Z",
};

const receipt = {
  id: "81568848-ab81-459b-b8af-b4f692055b79",
  bookingId: "7d8262d6-9308-4190-bf59-f1489e14e4c5",
  outcome: "confirmed",
  reasonCode: null,
  startAt: offering.slots[0].start,
  endAt: offering.slots[0].end,
  providerSyncStatus: "pending",
  externalEffectsStatus: "not_requested",
  availability: {
    evaluatedAt: "2026-10-13T10:00:00.000Z",
    asOf: "2026-10-13T10:00:00.000Z",
    coverage: "complete",
  },
  alternatives: [],
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<PublicCalendarBookingPage />, { wrapper: Wrapper });
}

describe("public calendar booking page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockImplementation(async (path) => {
      if (String(path).includes("/callback"))
        return {
          type: "streamline.calendar.booking.completed",
          signature: "signed-callback-state",
          facts: { outcome: "confirmed" },
        };
      return offering;
    });
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return session;
      if (value.endsWith("/holds")) return hold;
      return receipt;
    });
  });

  it("renders localized branding and only configured intake", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Meet Northwind" })).toBeInTheDocument();
    expect(screen.getByLabelText("Organization")).toBeInTheDocument();
    expect(screen.queryByLabelText("Private note")).not.toBeInTheDocument();
    expect(screen.getByText("I agree to scheduling contact")).toBeInTheDocument();
  });

  it("commits once and posts the server-projected callback to the approved origin", async () => {
    const postMessage = jest.spyOn(window.parent, "postMessage").mockImplementation();
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    await user.click(screen.getByRole("radio"));
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Organization"), "Analytical Engines");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByRole("heading", { name: "Your booking is confirmed" })).toBeInTheDocument();
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith(
      {
        type: "streamline.calendar.booking.completed",
        signature: "signed-callback-state",
        facts: { outcome: "confirmed" },
        state: "customer-state",
      },
      "https://customer.example",
    ));
    expect(mockedPost).toHaveBeenCalledWith(
      "/public/calendar/booking/booking-token-value-long-enough/confirm",
      expect.objectContaining({
        expectedRuleVersion: 3,
        guestEmail: "ada@example.com",
        intake: { company: "Analytical Engines" },
        sessionToken: "session-token-value-long-enough",
      }),
      undefined,
      expect.anything(),
    );
    postMessage.mockRestore();
  });

  it("hides offering details when the token cannot be resolved", async () => {
    mockedGet.mockRejectedValue(new Error("Booking page not found"));
    mockedPost.mockRejectedValue(new Error("Booking page not found"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("This booking page is unavailable");
    expect(screen.queryByText("Discovery call")).not.toBeInTheDocument();
  });
});
