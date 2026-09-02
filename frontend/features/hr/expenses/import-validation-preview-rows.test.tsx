/**
 * The expense import preview is where a person finds out WHICH lines of their
 * file failed validation. It sliced the parsed rows to the first 50 before the
 * table ever saw them, so an invalid row at line 51 was unreachable — the
 * summary counted it and nothing could show it. The rows now all reach the
 * table, which pages them, so the mounted count stays bounded and every row is
 * still reachable.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportValidationPreview } from "./import-validation-preview";

interface ParsedRow {
  category: string;
  amount: number;
  description: string;
  merchant: string;
  paymentMethod: string;
  expenseDate: string;
  valid: boolean;
  error?: string;
}

function makeRows(count: number, invalidFrom: number): ParsedRow[] {
  return Array.from({ length: count }, (_, i) => ({
    category: "Travel",
    amount: 100 + i,
    description: `expense ${i + 1}`,
    merchant: `merchant ${i + 1}`,
    paymentMethod: "CASH",
    expenseDate: "2026-01-01",
    valid: i + 1 < invalidFrom,
    error: i + 1 < invalidFrom ? undefined : `line ${i + 1} has no category`,
  }));
}

const noop = () => undefined;

function renderPreview(rows: ParsedRow[]) {
  return render(
    <ImportValidationPreview
      parsedRows={rows}
      isParsing={false}
      categoryMapping={{}}
      onCategoryMappingChange={noop}
    />,
  );
}

function bodyRowCount(container: HTMLElement): number {
  return container.querySelectorAll("tbody tr").length;
}

describe("ImportValidationPreview — the mounted row count is bounded", () => {
  it("mounts one page of rows for a 500-row file, not 500", () => {
    const { container } = renderPreview(makeRows(500, 400));
    expect(bodyRowCount(container)).toBe(50);
  });

  it("mounts every row when the file already fits one page", () => {
    const { container } = renderPreview(makeRows(12, 99));
    expect(bodyRowCount(container)).toBe(12);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });
});

describe("ImportValidationPreview — a row past the bound is still reachable", () => {
  it("reaches the invalid line 400 that used to sit behind the 50-row slice", async () => {
    const user = userEvent.setup();
    const { container } = renderPreview(makeRows(500, 400));
    const body = container.querySelector("tbody");
    expect(body).not.toBeNull();
    if (!body) return;
    expect(within(body).queryByText("line 400 has no category")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(within(body).getByText("line 500 has no category")).toBeInTheDocument();
  });

  it("still reports the whole file in its counts, not the page", () => {
    renderPreview(makeRows(500, 400));
    expect(screen.getByText("500 rows")).toBeInTheDocument();
    expect(screen.getByText("399 valid")).toBeInTheDocument();
    expect(screen.getByText("101 invalid")).toBeInTheDocument();
  });
});
