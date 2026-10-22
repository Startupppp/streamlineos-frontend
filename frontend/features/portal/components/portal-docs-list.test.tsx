import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

jest.mock("@/hooks/api/portal/use-portal-guard", () => ({
  usePortalGuard: jest.fn(() => ({ isReady: true })),
}));

jest.mock("@/hooks/api/portal/use-portal-docs", () => ({
  usePortalDocsList: jest.fn(),
}));

jest.mock("@/features/portal/components/portal-header", () => ({
  PortalHeader: () => React.createElement("header", null, "Portal Header"),
}));

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: () => null,
}));

import { PortalDocsListPage } from "./portal-docs-list";
import { usePortalDocsList } from "@/hooks/api/portal/use-portal-docs";

const mockUsePortalDocsList = usePortalDocsList as jest.Mock;

const BASE_QUERY = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("PortalDocsListPage", () => {
  it("renders the heading", () => {
    mockUsePortalDocsList.mockReturnValue({
      ...BASE_QUERY,
      data: {
        pages: [{ data: [], pagination: { hasMore: false, nextCursor: null, limit: 50 } }],
      },
    });

    render(React.createElement(PortalDocsListPage), { wrapper });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Shared documents");
  });

  it("shows empty state when there are no documents", () => {
    mockUsePortalDocsList.mockReturnValue({
      ...BASE_QUERY,
      data: {
        pages: [{ data: [], pagination: { hasMore: false, nextCursor: null, limit: 50 } }],
      },
    });

    render(React.createElement(PortalDocsListPage), { wrapper });

    expect(screen.getByText("No shared documents")).toBeTruthy();
  });

  it("renders a doc card with a link for each document", () => {
    mockUsePortalDocsList.mockReturnValue({
      ...BASE_QUERY,
      data: {
        pages: [
          {
            data: [
              {
                id: 1,
                title: "Handbook",
                kind: "document",
                spaceId: null,
                expiresAt: "2027-01-01T00:00:00Z",
                allowDownload: false,
              },
            ],
            pagination: { hasMore: false, nextCursor: null, limit: 50 },
          },
        ],
      },
    });

    render(React.createElement(PortalDocsListPage), { wrapper });

    const link = screen.getByRole("link", { name: /Handbook/i });
    expect(link).toHaveAttribute("href", "/shared-docs/1");
  });

  it("shows the error state with a retry button when the query fails", () => {
    mockUsePortalDocsList.mockReturnValue({ ...BASE_QUERY, isError: true });

    render(React.createElement(PortalDocsListPage), { wrapper });

    expect(screen.getByText("Could not load documents")).toBeTruthy();
  });
});
