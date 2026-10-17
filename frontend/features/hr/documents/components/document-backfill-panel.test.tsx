import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import type { DocumentBackfillPage } from "@/hooks/api/hr/document-backfill";
import { DocumentBackfillPanel } from "./document-backfill-panel";

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: { success: (m: string) => mockToast.success(m), error: (m: string) => mockToast.error(m) } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));

const mockRun = jest.fn();
jest.mock("@/hooks/api/hr/document-backfill", () => ({ useBackfillDocuments: () => ({ mutateAsync: mockRun, isPending: false }) }));

function page(overrides: Partial<DocumentBackfillPage> = {}): DocumentBackfillPage {
  return {
    dryRun: true,
    scanned: 0,
    eligible: 0,
    proposals: { allEmployees: 0, hrOnly: 0 },
    skipped: { alreadyClassified: 0, belongsToAnEmployee: 0, typeNotAllowed: 0, hiringArtefact: 0, inactive: 0 },
    applied: 0,
    nextCursor: null,
    done: true,
    sample: [],
    ...overrides,
  };
}

const PREVIEW = page({
  scanned: 9,
  eligible: 3,
  proposals: { allEmployees: 2, hrOnly: 1 },
  skipped: { alreadyClassified: 1, belongsToAnEmployee: 3, typeNotAllowed: 2, hiringArtefact: 0, inactive: 0 },
  nextCursor: 9,
  sample: [
    { documentId: 4, name: "Leave policy", audience: "ALL_EMPLOYEES" },
    { documentId: 6, name: "Expense policy", audience: "ALL_EMPLOYEES" },
    { documentId: 8, name: "Board minutes", audience: "HR_ONLY" },
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockImplementation((key) => key === "hr:documents:publish");
});

const preview = () => screen.getByRole("button", { name: "Preview" });

describe("DocumentBackfillPanel", () => {
  it("renders nothing for someone who may not publish documents", () => {
    mockCan.mockReturnValue(false);

    const { container } = render(<DocumentBackfillPanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it("offers a preview first, and asks the server for a dry run from the start", async () => {
    mockRun.mockResolvedValue(PREVIEW);
    render(<DocumentBackfillPanel />);

    expect(screen.queryByRole("button", { name: /Classify \d/ })).not.toBeInTheDocument();
    fireEvent.click(preview());

    await waitFor(() => expect(mockRun).toHaveBeenCalledWith({ dryRun: true, cursor: 0 }));
    expect(await screen.findByText(/3 documents of 9 look like company documents/i)).toBeInTheDocument();
    expect(screen.getByText(/2 would be internal, all employees and 1 internal, hr only/i)).toBeInTheDocument();
  });

  it("lists the documents it found by name, and what it is leaving alone and why", async () => {
    mockRun.mockResolvedValue(PREVIEW);
    render(<DocumentBackfillPanel />);

    fireEvent.click(preview());

    expect(await screen.findByText("Leave policy")).toBeInTheDocument();
    expect(screen.getByText("Board minutes")).toBeInTheDocument();
    expect(screen.getByText("1 was already classified by HR")).toBeInTheDocument();
    expect(screen.getByText("3 belong to employees")).toBeInTheDocument();
    expect(screen.getByText("2 are a type that is never shared, such as contracts and payslips")).toBeInTheDocument();
  });

  it("never applies anything on a preview", async () => {
    mockRun.mockResolvedValue(PREVIEW);
    render(<DocumentBackfillPanel />);

    fireEvent.click(preview());
    await screen.findByText("Leave policy");

    expect(mockRun.mock.calls.every(([input]) => input.dryRun === true)).toBe(true);
  });

  it("walks every page of the library, from where the last one ended, and adds them up", async () => {
    mockRun
      .mockResolvedValueOnce(page({ scanned: 100, eligible: 2, proposals: { allEmployees: 2, hrOnly: 0 }, nextCursor: 100, done: false }))
      .mockResolvedValueOnce(page({ scanned: 40, eligible: 1, proposals: { allEmployees: 0, hrOnly: 1 }, nextCursor: 140, done: true }));
    render(<DocumentBackfillPanel />);

    fireEvent.click(preview());

    expect(await screen.findByText(/3 documents of 140 look like company documents/i)).toBeInTheDocument();
    expect(mockRun.mock.calls).toEqual([[{ dryRun: true, cursor: 0 }], [{ dryRun: true, cursor: 100 }]]);
  });

  it("says so, and offers no way to apply, when nothing looks like a company document", async () => {
    mockRun.mockResolvedValue(page({ scanned: 12, skipped: { alreadyClassified: 0, belongsToAnEmployee: 12, typeNotAllowed: 0, hiringArtefact: 0, inactive: 0 } }));
    render(<DocumentBackfillPanel />);

    fireEvent.click(preview());

    expect(await screen.findByText(/checked 12 documents; none needs classifying/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Classify \d/ })).not.toBeInTheDocument();
  });

  it("applies only after the person confirms what it will do, and then asks the server to change things", async () => {
    mockRun.mockResolvedValueOnce(PREVIEW).mockResolvedValueOnce(page({ dryRun: false, scanned: 9, eligible: 3, proposals: { allEmployees: 2, hrOnly: 1 }, applied: 3, nextCursor: 9 }));
    render(<DocumentBackfillPanel />);
    fireEvent.click(preview());

    fireEvent.click(await screen.findByRole("button", { name: "Classify 3 documents" }));

    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/nothing is added to the knowledge base, nothing hr has already classified is changed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Classify" }));

    await waitFor(() => expect(mockRun).toHaveBeenLastCalledWith({ dryRun: false, cursor: 0 }));
    expect(await screen.findByText(/classified 3 documents\. none was added to the knowledge base/i)).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalledWith("Classified 3 documents.");
  });

  it("does not apply when the person cancels the confirmation", async () => {
    mockRun.mockResolvedValue(PREVIEW);
    render(<DocumentBackfillPanel />);
    fireEvent.click(preview());
    fireEvent.click(await screen.findByRole("button", { name: "Classify 3 documents" }));

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(mockRun.mock.calls.every(([input]) => input.dryRun === true)).toBe(true);
  });

  it("shows the message and the request id when a page fails, and carries on from the last cursor rather than starting over", async () => {
    mockRun
      .mockResolvedValueOnce(page({ scanned: 100, eligible: 1, proposals: { allEmployees: 1, hrOnly: 0 }, nextCursor: 100, done: false }))
      .mockRejectedValueOnce(new ApiError("Could not reach the service.", 503, "UNAVAILABLE", { correlationId: "req-9f2" }, "/hr/documents/kb-link/backfill"))
      .mockResolvedValueOnce(page({ scanned: 20, nextCursor: 120, done: true }));
    render(<DocumentBackfillPanel />);

    fireEvent.click(preview());

    expect(await screen.findByText("Could not reach the service.")).toBeInTheDocument();
    expect(screen.getByText("req-9f2")).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith("Could not reach the service.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText(/1 document of 120 look like company documents/i)).toBeInTheDocument();
    expect(mockRun.mock.calls).toEqual([[{ dryRun: true, cursor: 0 }], [{ dryRun: true, cursor: 100 }], [{ dryRun: true, cursor: 100 }]]);
  });

  it("stops a run that is not moving on rather than asking for the same page for ever", async () => {
    mockRun.mockResolvedValue(page({ scanned: 100, nextCursor: 0, done: false }));
    render(<DocumentBackfillPanel />);

    fireEvent.click(preview());

    expect(await screen.findByText(/did not move on to the next documents/i)).toBeInTheDocument();
    expect(mockRun).toHaveBeenCalledTimes(1);
  });
});
