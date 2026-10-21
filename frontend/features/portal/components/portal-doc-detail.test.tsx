import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

jest.mock("@/hooks/api/portal/use-portal-docs", () => ({
  usePortalDocDetail: jest.fn(),
  usePortalDocDownloadUrl: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  usePortalDocRecordAccess: jest.fn(() => ({ mutate: jest.fn() })),
}));

jest.mock("@/features/portal/components/portal-header", () => ({
  PortalHeader: () => React.createElement("header", null, "Portal Header"),
}));

jest.mock("@/components/shared/kb-content-renderer", () => ({
  __esModule: true,
  default: () => React.createElement("div", { "data-testid": "kb-renderer" }),
}));

import { PortalDocDetailPage } from "./portal-doc-detail";
import { usePortalDocDetail } from "@/hooks/api/portal/use-portal-docs";

const mockUsePortalDocDetail = usePortalDocDetail as jest.Mock;

const BASE_QUERY = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("PortalDocDetailPage", () => {
  it("renders the document title when data is available", () => {
    mockUsePortalDocDetail.mockReturnValue({
      ...BASE_QUERY,
      data: {
        id: 1,
        title: "Team Handbook",
        icon: null,
        coverImage: null,
        kind: "document",
        content: null,
        updatedAt: "2026-10-01T00:00:00Z",
        allowDownload: false,
      },
    });

    render(React.createElement(PortalDocDetailPage, { pageId: 1 }), { wrapper });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Team Handbook");
  });

  it("uses the KbContentRenderer for document-kind pages", () => {
    mockUsePortalDocDetail.mockReturnValue({
      ...BASE_QUERY,
      data: {
        id: 1,
        title: "Doc",
        icon: null,
        coverImage: null,
        kind: "document",
        content: { type: "doc", content: [] },
        updatedAt: "2026-10-01T00:00:00Z",
        allowDownload: false,
      },
    });

    render(React.createElement(PortalDocDetailPage, { pageId: 1 }), { wrapper });

    expect(screen.getByTestId("kb-renderer")).toBeTruthy();
  });

  it("shows the download button for a file page when allowDownload is true", () => {
    mockUsePortalDocDetail.mockReturnValue({
      ...BASE_QUERY,
      data: {
        id: 2,
        title: "Report",
        icon: null,
        coverImage: null,
        kind: "file",
        content: null,
        updatedAt: "2026-10-01T00:00:00Z",
        allowDownload: true,
      },
    });

    render(React.createElement(PortalDocDetailPage, { pageId: 2 }), { wrapper });

    expect(screen.getByRole("button", { name: /download/i })).toBeTruthy();
  });

  it("hides the download button for a file page when allowDownload is false", () => {
    mockUsePortalDocDetail.mockReturnValue({
      ...BASE_QUERY,
      data: {
        id: 2,
        title: "Report",
        icon: null,
        coverImage: null,
        kind: "file",
        content: null,
        updatedAt: "2026-10-01T00:00:00Z",
        allowDownload: false,
      },
    });

    render(React.createElement(PortalDocDetailPage, { pageId: 2 }), { wrapper });

    expect(screen.queryByRole("button", { name: /download/i })).toBeNull();
  });

  it("shows the loading state while data is fetching", () => {
    mockUsePortalDocDetail.mockReturnValue({ ...BASE_QUERY, isLoading: true });

    render(React.createElement(PortalDocDetailPage, { pageId: 1 }), { wrapper });

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("shows the error state when the query fails", () => {
    mockUsePortalDocDetail.mockReturnValue({ ...BASE_QUERY, isError: true });

    render(React.createElement(PortalDocDetailPage, { pageId: 1 }), { wrapper });

    expect(screen.getByText("Could not load document")).toBeTruthy();
  });
});
