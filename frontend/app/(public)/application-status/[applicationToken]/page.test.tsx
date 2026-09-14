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

describe("public application-status first HTML", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders application data into the first server HTML", async () => {
    mockedGet.mockResolvedValueOnce({
      status: "SHORTLISTED",
      appliedAt: "2024-01-15T10:00:00.000Z",
      updatedAt: "2024-01-20T10:00:00.000Z",
      job: { title: "Senior Engineer", location: "Bangalore", type: "FULL_TIME" },
      candidate: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
    });

    const tree = await ApplicationStatusPage({ params: Promise.resolve({ applicationToken: "abc123" }) });
    const html = renderToStaticMarkup(tree);

    expect(html).toContain("Application Status");
    expect(html).toContain("Senior Engineer");
    expect(html).toContain("Shortlisted");
    expect(html).toContain("Jane");
  });

  it("calls notFound when the token is not found", async () => {
    mockedGet.mockResolvedValueOnce(null);

    await expect(
      ApplicationStatusPage({ params: Promise.resolve({ applicationToken: "bad-token" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
