import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductSettingsPublicationSection } from "./product-settings-publication-section";

let mockPublication:
  | { published: boolean; issuedAt?: string | null; expiresAt?: string | null }
  | undefined = { published: false };
let mockIsLoading = false;
let mockIsError = false;
let mockPreviewData: unknown = {
  roadmap: { planned: [], in_progress: [], completed: [] },
};
let mockPreviewIsError = false;
const mockRefetch = jest.fn();
const mockPreviewRefetch = jest.fn();
const mockPublishMutate = jest.fn();
let mockCanManage = true;

jest.mock("@/hooks/api/build/roadmap-public", () => ({
  useProductRoadmapPublication: () => ({
    data: mockPublication,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockIsError ? new Error("publication read failed") : null,
    refetch: mockRefetch,
  }),
  useRoadmapPreview: () => ({
    data: mockPreviewIsError ? undefined : mockPreviewData,
    isError: mockPreviewIsError,
    refetch: mockPreviewRefetch,
  }),
  usePublishProductRoadmap: () => ({
    mutate: mockPublishMutate,
    isPending: false,
  }),
  useUnpublishProductRoadmap: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCanManage }));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const MANAGED_PRODUCT_ID = 7;

describe("ProductSettingsPublicationSection", () => {
  beforeEach(() => {
    mockPublication = { published: false };
    mockIsLoading = false;
    mockIsError = false;
    mockPreviewData = {
      roadmap: { planned: [], in_progress: [], completed: [] },
    };
    mockPreviewIsError = false;
    mockRefetch.mockClear();
    mockPreviewRefetch.mockClear();
    mockPublishMutate.mockClear();
    mockCanManage = true;
  });

  it("offers Publish when the product is not published", () => {
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByRole("button", { name: /publish roadmap/i })).toBeInTheDocument();
  });

  it("offers Unpublish when the product is published, so the control matches the real state", () => {
    mockPublication = { published: true };
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByRole("button", { name: /^unpublish$/i })).toBeInTheDocument();
  });

  it("renders an error instead of a Publish button when the publication read fails, so a failed read is never shown as not published", () => {
    mockIsError = true;
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByText("Could not load the publication state")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish roadmap/i })).not.toBeInTheDocument();
  });

  it("re-issues the publication read from the error state", () => {
    mockIsError = true;
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("shows a skeleton rather than an error while the read is still in flight", () => {
    mockIsLoading = true;
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.queryByText("Could not load the publication state")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish roadmap/i })).not.toBeInTheDocument();
  });

  it("offers a non-destructive rotate recovery, not unpublish-and-republish, when the raw link is unrecoverable after a reload", () => {
    mockPublication = {
      published: true,
      issuedAt: "2026-10-12T09:30:00.000Z",
      expiresAt: null,
    };
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(
      screen.getByRole("button", { name: /rotate and copy new link/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/unpublish and publish again/i)).not.toBeInTheDocument();
  });

  it("shows the issuance time and expiry of the active link so an unrecoverable link is still accountable", () => {
    mockPublication = {
      published: true,
      issuedAt: "2026-10-12T09:30:00.000Z",
      expiresAt: "2026-11-12T09:30:00.000Z",
    };
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByText("Link issued")).toBeInTheDocument();
    expect(screen.getByText("Expires")).toBeInTheDocument();
  });

  it("rotates without first revoking, so the publish mutation is what issues the replacement link", () => {
    mockPublication = { published: true, issuedAt: "2026-10-12T09:30:00.000Z" };
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    fireEvent.click(screen.getByRole("button", { name: /rotate and copy new link/i }));
    expect(mockPublishMutate).toHaveBeenCalledTimes(1);
  });

  it("does not report zero public items when the preview read failed, and offers a retry for that read", () => {
    mockPublication = { published: true, issuedAt: "2026-10-12T09:30:00.000Z" };
    mockPreviewIsError = true;
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.queryByText(/no items are marked as public/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/number of publicly visible items could not be loaded/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^retry$/i }));
    expect(mockPreviewRefetch).toHaveBeenCalledTimes(1);
  });

  it("keeps publication metadata readable and hides rotate and unpublish for a viewer", () => {
    mockCanManage = false;
    mockPublication = {
      published: true,
      issuedAt: "2026-10-12T09:30:00.000Z",
      expiresAt: "2026-11-12T09:30:00.000Z",
    };
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Link issued")).toBeInTheDocument();
    expect(screen.getByText("Expires")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rotate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unpublish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish roadmap/i })).not.toBeInTheDocument();
  });

  it("reports a real zero when the preview read succeeded and nothing is public", () => {
    mockPublication = { published: true, issuedAt: "2026-10-12T09:30:00.000Z" };
    render(<ProductSettingsPublicationSection managedProductId={MANAGED_PRODUCT_ID} />);
    expect(screen.getByText(/no items are marked as public/i)).toBeInTheDocument();
  });
});
