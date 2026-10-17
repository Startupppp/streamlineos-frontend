/** @jest-environment node */

jest.mock("server-only", () => ({}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("@/lib/public-fetch", () => ({
  publicGetNoStore: jest.fn(),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { publicGetNoStore } from "@/lib/public-fetch";
import ApplicationStatusPage from "@/app/(public)/application-status/[applicationToken]/page";

const mockedGet = publicGetNoStore as jest.Mock;

const SHORTLISTED_CANDIDATE = {
  status: "in_review",
  statusText: "Your application is being reviewed.",
  appliedAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-20T10:00:00.000Z",
  jobTitle: "Senior Engineer",
  jobLocation: "Bengaluru",
  jobType: "FULL_TIME",
  organisationName: "Acme",
  candidateFirstName: "Jane",
  bookingUrl: null,
  offerUrl: null,
};

describe("public application-status first HTML", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the application into the first server HTML", async () => {
    mockedGet.mockResolvedValueOnce(SHORTLISTED_CANDIDATE);

    const tree = await ApplicationStatusPage({
      params: Promise.resolve({ applicationToken: "abc123" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Senior Engineer");
    expect(html).toContain("Acme");
    expect(html).toContain("Under review");
    expect(html).toContain("Jane");
  });

  /**
   * This candidate is SHORTLISTED internally. The page used to say so — the
   * previous version of this test asserted it — and that is precisely what the
   * portal must not disclose: telling a candidate they were shortlisted means
   * the silence of a candidate who was not is information too.
   */
  it("never shows the internal pipeline vocabulary", async () => {
    mockedGet.mockResolvedValueOnce(SHORTLISTED_CANDIDATE);

    const tree = await ApplicationStatusPage({
      params: Promise.resolve({ applicationToken: "abc123" }),
    });
    const html = renderToStaticMarkup(tree);

    for (const internal of [
      "Shortlisted",
      "SHORTLISTED",
      "APPLIED",
      "INTERVIEWING",
      "OFFERED",
      "ACCEPTED",
      "WITHDRAWN",
    ]) {
      expect(html).not.toContain(internal);
    }
  });

  /**
   * The contract carries no email or surname, so the page cannot render one —
   * this pins that the page does not reintroduce them from somewhere else.
   *
   * Matched as an address shape rather than a bare "@": Tailwind emits `@`
   * inside container-query and arbitrary-variant class names, so the obvious
   * assertion fails on the stylesheet rather than on a leak.
   */
  it("shows no contact details for the candidate", async () => {
    mockedGet.mockResolvedValueOnce({ ...SHORTLISTED_CANDIDATE });

    const tree = await ApplicationStatusPage({
      params: Promise.resolve({ applicationToken: "abc123" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/);
    expect(html).not.toContain("Doe");
  });

  it("offers the booking and offer links only when they are live", async () => {
    mockedGet.mockResolvedValueOnce({
      ...SHORTLISTED_CANDIDATE,
      status: "offer",
      statusText: "There is an offer for you.",
      bookingUrl: "/interview-booking/tok-1",
      offerUrl: "/offer/tok-2",
    });

    const tree = await ApplicationStatusPage({
      params: Promise.resolve({ applicationToken: "abc123" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("/interview-booking/tok-1");
    expect(html).toContain("/offer/tok-2");
  });

  it("shows no action links when there is nothing live to act on", async () => {
    mockedGet.mockResolvedValueOnce(SHORTLISTED_CANDIDATE);

    const tree = await ApplicationStatusPage({
      params: Promise.resolve({ applicationToken: "abc123" }),
    });
    const html = renderToStaticMarkup(tree);

    expect(html).not.toContain("interview-booking");
    expect(html).not.toContain("Choose an interview time");
  });

  it("calls notFound when the token is not found", async () => {
    mockedGet.mockResolvedValueOnce(null);

    await expect(
      ApplicationStatusPage({ params: Promise.resolve({ applicationToken: "bad-token" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
