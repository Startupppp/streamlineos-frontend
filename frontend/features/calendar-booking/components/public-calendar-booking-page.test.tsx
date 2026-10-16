import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-envelope";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import { PublicCalendarBookingPage } from "./public-calendar-booking-page";
import { openCheckout } from "@/features/billing/lib/checkout-script";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ token: "booking-token-value-long-enough" }),
  useSearchParams: () => new URLSearchParams("state=customer-state&utm_source=partner"),
}));

jest.mock("@/features/billing/lib/checkout-script", () => ({
  loadCheckoutScript: jest.fn().mockResolvedValue(undefined),
  openCheckout: jest.fn(),
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
  payment: null,
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

function paidSaga(overrides: Record<string, unknown> = {}) {
  return {
    sagaId: "f099eaa2-cfb5-4a6d-8985-9ed88ad74b69",
    bookingId: null,
    providerKey: "razorpay",
    publicKeyId: "rzp_test_public",
    providerOrderId: "order-1",
    amountMinor: 2500,
    currency: "INR",
    paymentState: "order_created",
    bookingState: "pending",
    repairState: "none",
    refundedAmountMinor: 0,
    chargebackAmountMinor: 0,
    version: 2,
    receipt: null,
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, throwOnError: readErrorReachesBoundary }, mutations: { retry: false } },
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

  it("uses the approved session language for the page, slots, and payment amount", async () => {
    mockedPost.mockImplementation(async (path) => {
      if (String(path).endsWith("/sessions")) return {
        ...session,
        locale: "fr-FR",
        copy: { ...session.copy, locale: "fr-FR" },
        payment: { amountMinor: 2500, currency: "INR" },
      };
      throw new Error("Unexpected request");
    });
    renderPage();
    const title = await screen.findByRole("heading", { name: "Meet Northwind" });
    expect(title.closest("main")).toHaveAttribute("lang", "fr-FR");
    const formattedTime = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: offering.timeZone,
    }).format(new Date(offering.slots[0].start));
    expect(screen.getByRole("radio")).toHaveAccessibleName(formattedTime);
    const formattedPrice = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "INR",
    }).format(25);
    expect(screen.getByRole("button", { name: `Pay ${formattedPrice} and book` })).toBeInTheDocument();
  });

  it("uses Hindi for booking controls, validation, and the confirmed receipt", async () => {
    mockedPost.mockImplementation(async (path) => {
      if (String(path).endsWith("/sessions")) return {
        ...session,
        locale: "hi-IN",
        copy: { ...session.copy, locale: "hi-IN", title: "मुलाकात बुक करें", consentLabel: null },
      };
      if (String(path).endsWith("/holds")) return hold;
      return receipt;
    });
    const user = userEvent.setup();
    renderPage();
    const title = await screen.findByRole("heading", { name: "मुलाकात बुक करें" });
    expect(title.closest("main")).toHaveAttribute("lang", "hi-IN");
    expect(screen.getByRole("heading", { name: "समय चुनें" })).toBeInTheDocument();
    expect(screen.getByLabelText("आपका विवरण")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "बुकिंग की पुष्टि करें" }));
    expect(await screen.findByText("अपना नाम दर्ज करें")).toBeInTheDocument();
    await user.click(screen.getByRole("radio"));
    await user.type(screen.getByLabelText("नाम"), "Guest User");
    await user.type(screen.getByLabelText("ईमेल"), "guest@example.test");
    await user.type(screen.getByLabelText("Organization"), "Example");
    await user.click(screen.getByRole("button", { name: "बुकिंग की पुष्टि करें" }));
    expect(await screen.findByRole("heading", { name: "आपकी बुकिंग की पुष्टि हो गई है" })).toBeInTheDocument();
    expect(screen.getByText("बुक किया गया समय")).toBeInTheDocument();
    expect(screen.getByText("कैलेंडर से मिलान जारी है।")).toBeInTheDocument();
  });

  it("has no automated accessibility violations", async () => {
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    expect(await axe(container)).toHaveNoViolations();
  });

  it("focuses a missing required intake field before acquiring a hold", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    await user.click(screen.getByRole("radio"));
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    const intake = screen.getByLabelText("Organization");
    expect(await screen.findByRole("alert", { name: "" })).toHaveTextContent("Enter Organization");
    expect(intake).toHaveAttribute("aria-invalid", "true");
    expect(intake).toHaveFocus();
    expect(mockedPost.mock.calls.some(([path]) => String(path).endsWith("/holds"))).toBe(false);
    await user.type(intake, "Analytical Engines");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByRole("heading", { name: "Your booking is confirmed" })).toBeInTheDocument();
    expect(mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/holds"))).toHaveLength(1);
  });

  it("uses accessible shadcn slot and choice controls with required choice validation", async () => {
    const choiceOffering = {
      ...offering,
      intakeFields: [{ key: "service", label: "Service", type: "select", required: true, options: ["Planning", "Support"] }],
    };
    mockedGet.mockResolvedValue(choiceOffering);
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return { ...session, intakeKeys: ["service"], copy: { ...session.copy, fieldLabels: {} } };
      if (value.endsWith("/holds")) return hold;
      return receipt;
    });
    const user = userEvent.setup();
    renderPage();
    const radio = await screen.findByRole("radio");
    expect(radio).toHaveAccessibleName();
    act(() => radio.focus());
    await user.keyboard("[Space]");
    expect(radio).toHaveAttribute("aria-checked", "true");
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    const choice = screen.getByRole("combobox", { name: "Service" });
    expect(await screen.findByText("Enter Service")).toHaveAttribute("role", "alert");
    expect(choice).toHaveAttribute("aria-invalid", "true");
    expect(choice).toHaveFocus();
    expect(mockedPost.mock.calls.some(([path]) => String(path).endsWith("/holds"))).toBe(false);
    await user.keyboard("[Space][ArrowDown][Enter]");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByRole("heading", { name: "Your booking is confirmed" })).toBeInTheDocument();
    expect(mockedPost.mock.calls.find(([path]) => String(path).endsWith("/confirm"))?.[1])
      .toEqual(expect.objectContaining({ intake: { service: "Support" } }));
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
    const confirmCalls = mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/confirm"));
    expect(confirmCalls).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Refresh booking status" })).not.toBeInTheDocument();
    expect(mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/holds"))).toHaveLength(1);
    postMessage.mockRestore();
  });

  it("does not post callback facts when the returned signature belongs to another session", async () => {
    mockedGet.mockImplementation(async (path) => {
      if (String(path).includes("/callback"))
        return {
          type: "streamline.calendar.booking.completed",
          signature: "another-session-signature",
          facts: { outcome: "confirmed" },
        };
      return offering;
    });
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
    await waitFor(() => expect(mockedGet.mock.calls.some(([path]) =>
      String(path).endsWith("/sessions/session-token-value-long-enough/callback"),
    )).toBe(true));
    expect(postMessage).not.toHaveBeenCalled();
    postMessage.mockRestore();
  });

  it("rechecks an ambiguous confirmation with the original key and without another hold", async () => {
    let confirmations = 0;
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return session;
      if (value.endsWith("/holds")) return hold;
      if (value.endsWith("/confirm")) {
        confirmations += 1;
        if (confirmations === 1) throw new Error("Request timed out");
        return receipt;
      }
      throw new Error("Unexpected request");
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    await user.click(screen.getByRole("radio"));
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Organization"), "Analytical Engines");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByRole("heading", { name: "Booking status needs confirmation" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Check booking status" }));
    expect(await screen.findByRole("heading", { name: "Your booking is confirmed" })).toBeInTheDocument();
    const confirmCalls = mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/confirm"));
    expect(confirmCalls).toHaveLength(2);
    expect(confirmCalls[1][1]).toEqual(confirmCalls[0][1]);
    expect(mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/holds"))).toHaveLength(1);
  });

  it("shows a confirmed receipt without a manual status refresh", async () => {
    let confirmations = 0;
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return session;
      if (value.endsWith("/holds")) return hold;
      if (value.endsWith("/confirm")) {
        confirmations += 1;
        return receipt;
      }
      throw new Error("Unexpected request");
    });
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
    expect(screen.getByRole("heading", { name: "Your booking is confirmed" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm booking" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh booking status" })).not.toBeInTheDocument();
    expect(confirmations).toBe(1);
  });

  it("rechecks a pending receipt with the original request and shows its confirmed outcome", async () => {
    const pendingReceipt = { ...receipt, bookingId: null, outcome: "pending", providerSyncStatus: "not_requested" };
    let confirmations = 0;
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return session;
      if (value.endsWith("/holds")) return hold;
      if (value.endsWith("/confirm")) return ++confirmations === 1 ? pendingReceipt : receipt;
      throw new Error("Unexpected request");
    });
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
    const confirmCalls = mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/confirm"));
    expect(confirmCalls).toHaveLength(2);
    expect(confirmCalls[1][1]).toEqual(confirmCalls[0][1]);
    expect(mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/holds"))).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Refresh booking status" })).not.toBeInTheDocument();
  });

  it.each(["rejected", "uncertain"] as const)("uses a new idempotency identity after a %s slot and offers recovery", async (outcome) => {
    const secondSlot = {
      start: "2026-10-20T11:00:00.000Z",
      end: "2026-10-20T11:30:00.000Z",
      localStart: "2026-10-20T16:30:00+05:30",
      localEnd: "2026-10-20T17:00:00+05:30",
    };
    const secondHoldId = "7c3108af-c12f-463c-a1c1-61302db73b3a";
    mockedGet.mockImplementation(async (path) => {
      if (String(path).includes("/callback")) return { type: "streamline.calendar.booking.completed", signature: "signed-callback-state", facts: { outcome: "confirmed" } };
      return { ...offering, slots: [...offering.slots, secondSlot] };
    });
    mockedPost.mockImplementation(async (path, input) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return { ...session, channel: "page", targetOrigin: null };
      if (value.endsWith("/holds")) return { ...hold, id: (input as { start: string }).start === secondSlot.start ? secondHoldId : hold.id };
      if (value.endsWith("/confirm")) return (input as { holdId: string }).holdId === secondHoldId
        ? receipt
        : { ...receipt, bookingId: null, outcome, reasonCode: outcome === "uncertain" ? "availability_uncertain" : "slot_unavailable", alternatives: [{ start: secondSlot.start, end: secondSlot.end }] };
      throw new Error("Unexpected request");
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    await user.click(screen.getAllByRole("radio")[0]);
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Organization"), "Analytical Engines");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByRole("heading", { name: outcome === "uncertain" ? "We could not confirm availability yet" : "Your booking needs attention" })).toBeInTheDocument();
    expect(screen.getByText("Other available times")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Review / }));
    expect(screen.getAllByRole("radio")[1]).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByRole("heading", { name: "Your booking is confirmed" })).toBeInTheDocument();
    const holdCalls = mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/holds"));
    const commitCalls = mockedPost.mock.calls.filter(([path]) => String(path).endsWith("/confirm"));
    expect(holdCalls).toHaveLength(2);
    expect(commitCalls).toHaveLength(2);
    expect((holdCalls[0][1] as { idempotencyKey: string }).idempotencyKey)
      .not.toBe((holdCalls[1][1] as { idempotencyKey: string }).idempotencyKey);
    expect((commitCalls[0][1] as { idempotencyKey: string }).idempotencyKey)
      .not.toBe((commitCalls[1][1] as { idempotencyKey: string }).idempotencyKey);
  });

  it("refreshes offered times when a hold loses a slot race", async () => {
    const secondSlot = {
      start: "2026-10-20T11:00:00.000Z",
      end: "2026-10-20T11:30:00.000Z",
      localStart: "2026-10-20T16:30:00+05:30",
      localEnd: "2026-10-20T17:00:00+05:30",
    };
    let offeringReads = 0;
    mockedGet.mockImplementation(async () => {
      offeringReads += 1;
      return { ...offering, slots: offeringReads === 1 ? [offering.slots[0], secondSlot] : [secondSlot] };
    });
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return session;
      if (value.endsWith("/holds")) throw new ApiError("Requested slot is no longer available", 409);
      throw new Error("Unexpected request");
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    await user.click(screen.getAllByRole("radio")[0]);
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Organization"), "Analytical Engines");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Requested slot is no longer available");
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(1));
    expect(screen.getByRole("radio")).not.toBeChecked();
    expect((screen.getByRole("radio") as HTMLInputElement).value).toBe(secondSlot.start);
    expect(offeringReads).toBeGreaterThan(1);
  });

  it("shows a payment preparation failure without opening checkout", async () => {
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return { ...session, payment: { amountMinor: 2500, currency: "INR" } };
      if (value.endsWith("/holds")) return hold;
      if (value.endsWith("/payments/prepare")) throw new ApiError("Payment setup is unavailable", 503);
      throw new Error("Unexpected request");
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    await user.click(screen.getByRole("radio"));
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Organization"), "Analytical Engines");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Pay.*and book/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Payment setup is unavailable");
    expect(openCheckout).not.toHaveBeenCalled();
  });

  it("confirms a paid booking only after provider success", async () => {
    const paidSession = { ...session, channel: "page", targetOrigin: null, payment: { amountMinor: 2500, currency: "INR" } };
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return paidSession;
      if (value.endsWith("/holds")) return hold;
      if (value.endsWith("/payments/prepare")) return paidSaga();
      return paidSaga({
        bookingId: receipt.bookingId,
        publicKeyId: null,
        paymentState: "captured",
        bookingState: "confirmed",
        version: 4,
        receipt,
      });
    });
    jest.mocked(openCheckout).mockImplementation((options) => options.onSuccess({
      orderId: "order-1",
      paymentId: "pay-1",
      signature: "provider-signature",
    }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    await user.click(screen.getByRole("radio"));
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Organization"), "Analytical Engines");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Pay.*and book/ }));
    expect(await screen.findByRole("heading", { name: "Your booking is confirmed" })).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledWith(
      "/public/calendar/booking/booking-token-value-long-enough/payments/confirm",
      expect.objectContaining({ paymentId: "pay-1", signature: "provider-signature" }),
      undefined,
      expect.anything(),
    );
  });

  it("never presents a refunded booking race as a confirmed paid booking", async () => {
    const paidSession = { ...session, channel: "page", targetOrigin: null, payment: { amountMinor: 2500, currency: "INR" } };
    mockedPost.mockImplementation(async (path) => {
      const value = String(path);
      if (value.endsWith("/sessions")) return paidSession;
      if (value.endsWith("/holds")) return hold;
      if (value.endsWith("/payments/prepare")) return paidSaga();
      return paidSaga({
        publicKeyId: null,
        paymentState: "refunded",
        bookingState: "cancelled",
        repairState: "resolved",
        refundedAmountMinor: 2500,
        version: 5,
        receipt: { ...receipt, bookingId: null, outcome: "rejected", reasonCode: "capacity_lost" },
      });
    });
    jest.mocked(openCheckout).mockImplementation((options) => options.onSuccess({
      orderId: "order-1",
      paymentId: "pay-1",
      signature: "provider-signature",
    }));
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Meet Northwind" });
    await user.click(screen.getByRole("radio"));
    await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Organization"), "Analytical Engines");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Pay.*and book/ }));
    expect(await screen.findByRole("heading", { name: "Your payment needs attention" })).toBeInTheDocument();
    expect(screen.getByText(/Payment: refunded/)).toBeInTheDocument();
    expect(screen.queryByText("Your booking is confirmed")).not.toBeInTheDocument();
  });

  it("hides offering details when the token cannot be resolved", async () => {
    mockedGet.mockRejectedValue(new ApiError("Booking page not found", 404));
    mockedPost.mockRejectedValue(new ApiError("Booking page not found", 404));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("This booking link is unavailable");
    expect(screen.getByText("It may have expired or already been used. Ask the organizer for a new booking link.")).toBeInTheDocument();
    expect(screen.queryByText("Booking page not found")).not.toBeInTheDocument();
    expect(screen.queryByText("Discovery call")).not.toBeInTheDocument();
  });
});
