import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportExportPage } from "./import-export-page";

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/hr/import-export", () => ({
  useCreateImportJob: () => ({ mutate: jest.fn(), isPending: false }),
  useCommitImportJob: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("./job-history-table", () => ({ JobHistoryTable: () => null }));
jest.mock("@/components/import-export/import-export-grid", () => ({ ImportExportGrid: () => null }));
jest.mock("@/components/hr/reporting-lines/policy-missing-banner", () => ({ PolicyMissingBanner: () => null }));

describe("HR import — employees entity (HRM-15 §7.4)", () => {
  it("documents the canonical reporting columns, same names as bulk onboarding", async () => {
    render(<ImportExportPage />);
    // Employees is the first import card.
    const [employeesImport] = screen.getAllByRole("button", { name: /Import CSV/ });
    if (!employeesImport) throw new Error("no import card rendered");
    await userEvent.click(employeesImport);
    expect(await screen.findByText("Import Employees")).toBeInTheDocument();

    for (const column of [
      "primaryManagerEmail",
      "secondaryManagerEmail1",
      "secondaryManagerEmail2",
      "secondaryManagerEmail3",
      "topLevelRoleReason",
      "effectiveFrom",
      "clearPrimaryManager",
    ]) {
      expect(await screen.findByText(column)).toBeInTheDocument();
    }
    expect(screen.queryByText("managerEmail")).not.toBeInTheDocument();
  });
});
