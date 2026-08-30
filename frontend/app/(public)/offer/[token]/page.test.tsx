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

jest.mock("@/features/careers/components/offer-action-island", () => ({
  OfferActionIsland: ({ offer }: { offer: { offeredDesignation: string } }) => (
    <div data-testid="offer-island">{offer.offeredDesignation}</div>
  ),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "@/lib/api-envelope";
import { publicGetNoStore } from "@/lib/public-fetch";
import OfferAcceptancePage from "@/app/(public)/offer/[token]/page";

const mockedGet = publicGetNoStore as jest.Mock;

const activeOffer = {
  id: 1,
  offerStatus: "SENT",
  offeredSalary: "1200000",
  offeredDesignation: "Senior Software Engineer",
  joiningDate: null,
  validUntil: "2024-12-31T23:59:59.000Z",
  notes: null,
  acceptanceTokenExpiresAt: null,
  currency: "INR",
  negotiations: [],
};

describe("public offer acceptance first HTML", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders active offer data into the first server HTML", async () => {
    mockedGet.mockResolvedValueOnce(activeOffer);

    const tree = await OfferAcceptancePage({ params: Promise.resolve({ token: "tok123" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Offer Letter");
    expect(html).toContain("Senior Software Engineer");
  });

  it("renders already-responded state server-side when offer is ACCEPTED", async () => {
    mockedGet.mockResolvedValueOnce({ ...activeOffer, offerStatus: "ACCEPTED" });

    const tree = await OfferAcceptancePage({ params: Promise.resolve({ token: "tok123" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Offer Accepted");
    expect(html).not.toContain("OfferActionIsland");
  });

  it("calls notFound when the token is not found", async () => {
    mockedGet.mockResolvedValueOnce(null);

    await expect(
      OfferAcceptancePage({ params: Promise.resolve({ token: "bad-token" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders expired state when the backend returns 410", async () => {
    mockedGet.mockRejectedValueOnce(new ApiError("This offer link has expired.", 410));

    const tree = await OfferAcceptancePage({ params: Promise.resolve({ token: "old-token" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("expired");
  });
});
