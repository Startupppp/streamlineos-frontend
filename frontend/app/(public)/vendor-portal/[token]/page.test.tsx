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
import { ApiError } from "@/lib/api-envelope";
import { publicGetNoStore } from "@/lib/public-fetch";
import VendorPortalPage from "@/app/(public)/vendor-portal/[token]/page";

const mockedGet = publicGetNoStore as jest.Mock;

describe("public vendor portal first HTML", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders vendor data into the first server HTML", async () => {
    mockedGet.mockResolvedValueOnce({
      vendorName: "TechRecruit Ltd",
      submissions: [
        {
          id: 1,
          candidateName: "Bob Jones",
          jobTitle: "Backend Engineer",
          placementStatus: "INTERVIEWING",
          submittedAt: "2024-01-10T08:00:00.000Z",
        },
      ],
    });

    const tree = await VendorPortalPage({ params: Promise.resolve({ token: "vnd123" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("TechRecruit Ltd");
    expect(html).toContain("Bob Jones");
    expect(html).toContain("Backend Engineer");
  });

  it("calls notFound when the token is not found", async () => {
    mockedGet.mockResolvedValueOnce(null);

    await expect(
      VendorPortalPage({ params: Promise.resolve({ token: "bad-token" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders expired state when the backend returns 410", async () => {
    mockedGet.mockRejectedValueOnce(
      new ApiError("This portal link has expired. Ask your recruiting contact to generate a new one.", 410),
    );

    const tree = await VendorPortalPage({ params: Promise.resolve({ token: "old-token" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("expired");
  });
});
