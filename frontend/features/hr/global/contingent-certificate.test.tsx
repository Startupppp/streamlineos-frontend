import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { ContingentPageContent } from "./contingent-page-content";

const HOOKS = join(process.cwd(), "hooks/api/hr/global.ts");
const SOURCE = join(process.cwd(), "features/hr/global/contingent-page-content.tsx");

const certificate = jest.fn();
const refetch = jest.fn();

const contract = {
  id: 5,
  contractType: "intern",
  status: "active",
  startDate: "2026-01-01",
  endDate: null,
  stipendCents: null,
  agencyVendor: null,
};

jest.mock("@/hooks/api/hr/global", () => ({
  useContracts: () => ({
    data: { data: [contract] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useEndContract: () => ({ mutate: jest.fn(), isPending: false }),
  useConvertToEmployee: () => ({ mutate: jest.fn(), isPending: false }),
  useInternshipCertificate: () => certificate(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("./contract-sheet", () => ({
  ContractSheet: () => null,
}));

jest.mock("@/components/shared/sanitized-html", () => ({
  SanitizedHtml: ({ html }: { html: string }) => <div data-testid="certificate-body">{html}</div>,
}));

function openCertificate() {
  render(<ContingentPageContent />);
  fireEvent.click(screen.getByRole("button", { name: /certificate/i }));
}

function failing(status: number) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  certificate.mockReturnValue({
    data: { html: "<p>Certificate body</p>", templateId: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B2-023 a certificate that could not be read is a different compliance fact from one that does not exist", () => {
  it("keeps the failed certificate read inline instead of throwing it to the /hr boundary", () => {
    const source = readFileSync(HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source).toContain("...INLINE_READ_ERROR,");
  });

  it("no longer reports the failure only through a toast, which is easy to miss and may be occluded", () => {
    expect(readFileSync(SOURCE, "utf8")).not.toContain("toast");
  });

  it("opens a dialog that says the certificate could not be read when the read 500s", () => {
    certificate.mockReturnValue(failing(500));
    openCertificate();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load the certificate/i);
  });

  it("does not claim the certificate is absent while the read is erroring", () => {
    certificate.mockReturnValue(failing(500));
    openCertificate();

    expect(screen.queryByText(/no certificate issued yet/i)).toBeNull();
  });

  it("retries the certificate read itself", () => {
    certificate.mockReturnValue(failing(500));
    openCertificate();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says plainly that no certificate exists when the backend answers 404, which is not a retryable failure of the read", () => {
    certificate.mockReturnValue(failing(404));
    openCertificate();

    expect(screen.getByText(/no certificate issued yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still renders the certificate when the read succeeds", () => {
    openCertificate();

    expect(screen.getByTestId("certificate-body")).toHaveTextContent("Certificate body");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("the failed read's request id is quotable to support", () => {
  it("renders the copyable reference the backend echoed on the error envelope", () => {
    certificate.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, { correlationId: "req-abc123" }),
      refetch,
    });
    openCertificate();
    expect(screen.getByText(/reference/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc123")).toBeInTheDocument();
  });
});
