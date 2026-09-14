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

jest.mock("@/features/careers/components/referrer-portal-island", () => ({
  ReferrerPortalIsland: ({ data }: { data: { referrerName: string; orgName: string } }) => (
    <div data-testid="referrer-island">
      <span>{data.referrerName}</span>
      <span>{data.orgName}</span>
    </div>
  ),
}));

import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "@/lib/api-envelope";
import { publicGetNoStore } from "@/lib/public-fetch";
import ExternalReferrerPortalPage from "@/app/(public)/refer/link/[referralToken]/page";

const mockedGet = publicGetNoStore as jest.Mock;

const portalData = {
  referrerName: "Alice Smith",
  orgName: "Acme Corp",
  openJobs: [],
  referrals: [],
};

describe("public referrer portal first HTML", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders portal data into the first server HTML", async () => {
    mockedGet.mockResolvedValueOnce(portalData);

    const tree = await ExternalReferrerPortalPage({ params: Promise.resolve({ referralToken: "ref123" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Alice Smith");
    expect(html).toContain("Acme Corp");
  });

  it("calls notFound when the token is not found", async () => {
    mockedGet.mockResolvedValueOnce(null);

    await expect(
      ExternalReferrerPortalPage({ params: Promise.resolve({ referralToken: "bad-token" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders blocked state when the backend returns 403", async () => {
    mockedGet.mockRejectedValueOnce(
      new ApiError("This referrer account is not eligible to submit referrals.", 403),
    );

    const tree = await ExternalReferrerPortalPage({ params: Promise.resolve({ referralToken: "blocked-tok" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("not eligible");
  });
});
