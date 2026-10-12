import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProductSettingsPublicationSection } from "./product-settings-publication-section";

let mockPublication: { published: boolean } | undefined = { published: false };
let mockIsLoading = false;
let mockIsError = false;
const mockRefetch = jest.fn();

jest.mock("@/hooks/api/build/roadmap-public", () => ({
  useProductRoadmapPublication: () => ({
    data: mockPublication,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockIsError ? new Error("publication read failed") : null,
    refetch: mockRefetch,
  }),
  usePublishProductRoadmap: () => ({ mutate: jest.fn(), isPending: false }),
  useUnpublishProductRoadmap: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const MANAGED_PRODUCT_ID = 7;

describe("ProductSettingsPublicationSection", () => {
  beforeEach(() => {
    mockPublication = { published: false };
    mockIsLoading = false;
    mockIsError = false;
    mockRefetch.mockClear();
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
});
