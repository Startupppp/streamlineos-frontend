import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";

const richDocuments = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useRichDocuments: () => richDocuments(),
  useDeleteRichDocument: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import { LettersHistoryTable } from "./letters-history-table";
import { ExpiringDocumentsTable } from "./expiring-documents-table";
import { RichDocumentsSection } from "./rich-documents-section";

function correlated(id: string) {
  return new ApiError("Internal server error", 500, "INTERNAL", {
    correlationId: id,
  });
}

describe("HRMS-B2-007 a failed documents-tab read is quotable to support", () => {
  it("renders the letters table on a healthy session, so the failure case below is not passing on a table that never mounts", () => {
    render(
      <LettersHistoryTable letters={[]} isLoading={false} isError={false} onRetry={jest.fn()} />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the failed letters call's request id under the message", () => {
    render(
      <LettersHistoryTable
        letters={[]}
        isLoading={false}
        isError
        error={correlated("req_le7701")}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_le7701")).toBeInTheDocument();
  });

  it("renders the failed expiry call's request id under the message", () => {
    render(
      <ExpiringDocumentsTable
        expiringDocuments={[]}
        expiringCertifications={[]}
        isLoading={false}
        isError
        error={correlated("req_ex2240")}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_ex2240")).toBeInTheDocument();
  });

  it("renders nothing for a rich-documents read that genuinely returns no rows, so the failure case below is not the only thing this section can render", () => {
    richDocuments.mockReturnValue({
      data: { data: [], pagination: { nextCursor: null, hasMore: false } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    const { container } = render(<RichDocumentsSection />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the failed rich-documents call's request id instead of falling through to silence", () => {
    richDocuments.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: correlated("req_rd5518"),
      refetch: jest.fn(),
    });
    render(<RichDocumentsSection />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_rd5518")).toBeInTheDocument();
  });
});
