import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HrImportJob } from "@/hooks/api/hr/import-export";
import { importJob } from "./import-fixtures";
import { ImportWizardSheet } from "./import-wizard-sheet";

const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock("sonner", () => ({ toast: { success: (m: string) => mockToast.success(m), error: (m: string) => mockToast.error(m), warning: (m: string) => mockToast.warning(m) } }));

const mockCreate = jest.fn();
const mockCommit = jest.fn();
jest.mock("@/hooks/api/hr/import-export", () => ({
  useCreateImportJob: () => ({ mutate: mockCreate, isPending: false }),
  useCommitImportJob: () => ({ mutate: mockCommit, isPending: false }),
  useHrImportJob: () => ({ data: undefined, isLoading: false, isError: false, error: null }),
}));

const previewed = importJob({ status: "previewed", totalRows: 2, validRows: 2, errorRows: 0 });

function commitReturns(result: HrImportJob) {
  mockCreate.mockImplementation((_body: unknown, options: { onSuccess: (r: unknown) => void }) => options.onSuccess({ job: previewed, summary: { total: 2, valid: 2, errors: 0, topErrors: [] } }));
  mockCommit.mockImplementation((_body: unknown, options: { onSuccess: (r: HrImportJob) => void }) => options.onSuccess(result));
}

async function commitTheSheet() {
  const onOpenChange = jest.fn();
  render(<ImportWizardSheet open onOpenChange={onOpenChange} entity="document_metadata" entityLabel="Documents" columns={["employeeEmail", "name"]} />);
  const file = new File(["employeeEmail,name\na@b.com,Offer\nc@d.com,ID"], "documents.csv", { type: "text/csv" });
  await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);
  await userEvent.click(await screen.findByRole("button", { name: /validate 2 rows/i }));
  await userEvent.click(await screen.findByRole("button", { name: /commit 2 rows/i }));
  return { onOpenChange };
}

beforeEach(() => jest.clearAllMocks());

describe("ImportWizardSheet — after a commit", () => {
  it("stays open and shows what was written, instead of closing on 'committed successfully'", async () => {
    commitReturns(importJob({ totalRows: 2, validRows: 2, createdRows: 1, updatedRows: 0, unchangedRows: 1 }));

    const { onOpenChange } = await commitTheSheet();

    expect(await screen.findByText("Imported")).toBeInTheDocument();
    expect(screen.getByText("New").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("Already there").nextSibling).toHaveTextContent("1");
    expect(mockToast.success).toHaveBeenCalledWith("Documents imported: 1 new, 0 changed, 1 already there.");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("never says it committed successfully over a job that wrote nothing", async () => {
    commitReturns(importJob({ status: "failed", totalRows: 2, validRows: 0, errorRows: 2 }));

    await commitTheSheet();

    expect(await screen.findByText("Nothing was imported")).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith("Nothing was imported. 2 rows failed.");
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("warns, rather than celebrates, when some rows were written and some failed", async () => {
    commitReturns(importJob({ totalRows: 2, validRows: 1, createdRows: 1, errorRows: 1 }));

    await commitTheSheet();

    expect(await screen.findByText("Imported with problems")).toBeInTheDocument();
    expect(mockToast.warning).toHaveBeenCalledWith("Documents imported with problems: 1 written, 1 failed.");
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("closes only when the person is done", async () => {
    commitReturns(importJob({ totalRows: 2, validRows: 2, createdRows: 2 }));
    const { onOpenChange } = await commitTheSheet();

    await userEvent.click(await screen.findByRole("button", { name: "Done" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("tells a document import that its emails must match employees who already exist", () => {
    render(<ImportWizardSheet open onOpenChange={jest.fn()} entity="document_metadata" entityLabel="Documents" columns={["employeeEmail"]} />);

    expect(screen.getByText(/must be the work email of an employee who already exists/i)).toBeInTheDocument();
  });

  it("does not say that for an import that has nothing to do with people", () => {
    render(<ImportWizardSheet open onOpenChange={jest.fn()} entity="assets" entityLabel="Assets" columns={["name"]} />);

    expect(screen.queryByText(/must be the work email/i)).not.toBeInTheDocument();
  });
});
