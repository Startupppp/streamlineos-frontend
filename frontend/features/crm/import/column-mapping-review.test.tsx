import { render, screen } from "@testing-library/react";
import type { MappedColumn } from "@/types/crm/import";
import { ColumnMappingReview } from "./column-mapping-review";

const columns: MappedColumn[] = [
  { header: "Company Name", mapping: { kind: "mapped", field: "name", confidence: 1 } },
  { header: "Company Phone", mapping: { kind: "mapped", field: "phone", confidence: 0.7 } },
  { header: "Territory", mapping: { kind: "custom", key: "territory" } },
  { header: "Record ID", mapping: { kind: "unmapped" } },
  { header: "Account Name", mapping: { kind: "ambiguous", candidates: ["name"] } },
];

const renderReview = (overrides: Record<string, string> = {}) => {
  const onOverride = jest.fn();
  render(<ColumnMappingReview columns={columns} overrides={overrides} onOverride={onOverride} />);
  return { onOverride };
};

describe("ColumnMappingReview", () => {
  it("says what will happen to every column, not only the questions", () => {
    // A step that surfaces only the questions leaves a user unable to correct a
    // confident wrong answer, which is the worse failure of the two.
    renderReview();
    expect(screen.getByText("Company Name")).toBeInTheDocument();
    expect(screen.getByText("Record ID")).toBeInTheDocument();
    expect(screen.getByText("Territory")).toBeInTheDocument();
  });

  it("marks a best guess as a guess", () => {
    renderReview();
    expect(screen.getByText(/best guess/i)).toBeInTheDocument();
  });

  it("presents an unrecognised column as kept, not lost", () => {
    // Becoming a custom field is not a lesser outcome; the column survives.
    renderReview();
    expect(screen.getByText("Kept as an extra field")).toBeInTheDocument();
  });

  it("says how many answers it is waiting for", () => {
    renderReview();
    expect(screen.getByText(/1 column needs an answer/i)).toBeInTheDocument();
  });

  it("lets any column be pointed somewhere else", () => {
    const { onOverride } = renderReview();
    // Every column has a control, including the ones already decided.
    expect(screen.getAllByRole("combobox")).toHaveLength(columns.length);
    expect(onOverride).not.toHaveBeenCalled();
  });

  it("shows the person's own answer once they have given one", () => {
    renderReview({ "Account Name": "legalName" });
    expect(screen.getByText(/you chose legal name/i)).toBeInTheDocument();
  });

  it("shows an ignored column as ignored", () => {
    renderReview({ "Territory": "__ignore__" });
    expect(screen.getByText(/will be left alone/i)).toBeInTheDocument();
  });
});
