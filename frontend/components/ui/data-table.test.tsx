import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataTableColumn } from "./data-table";

interface HarnessRow {
  id: string;
  name: string;
}

const ROWS: HarnessRow[] = [
  { id: "a", name: "Ada Lovelace" },
  { id: "b", name: "Grace Hopper" },
];

function Harness({
  onRowAction,
  withMobileCard = false,
  withFocusStop = false,
}: {
  onRowAction?: () => void;
  withMobileCard?: boolean;
  withFocusStop?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [openRow, setOpenRow] = useState<HarnessRow | null>(null);

  function handleRowClick(row: HarnessRow) {
    setOpenRow(row);
  }

  function handleSelectionChange(next: Set<string | number>) {
    setSelected(next);
  }

  function renderActionCell(row: HarnessRow) {
    function handleActionClick(event: React.MouseEvent<HTMLButtonElement>) {
      event.stopPropagation();
      onRowAction?.();
    }
    return (
      <>
        {withFocusStop ? (
          <span tabIndex={0}>{`Full name ${row.name}`}</span>
        ) : null}
        <button type="button" onClick={handleActionClick}>
          {`Actions for ${row.name}`}
        </button>
      </>
    );
  }

  function renderMobileCard(row: HarnessRow) {
    function handleCardActionClick(event: React.MouseEvent<HTMLButtonElement>) {
      event.stopPropagation();
      onRowAction?.();
    }
    return (
      <>
        <span>{`Card ${row.name}`}</span>
        <button type="button" onClick={handleCardActionClick}>
          {`Card action for ${row.name}`}
        </button>
      </>
    );
  }

  const columns: DataTableColumn<HarnessRow>[] = [
    { key: "name", header: "Name", cell: (row) => row.name },
    { key: "actions", header: "", cell: renderActionCell },
  ];

  return (
    <div>
      <div data-testid="selection-count">{selected.size}</div>
      {openRow ? <div data-testid="detail-sheet">{openRow.name}</div> : null}
      <DataTable
        data={ROWS}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        selection={{ selected, onChange: handleSelectionChange }}
        toolbar={
          selected.size > 0 ? (
            <button type="button">Bulk approve</button>
          ) : undefined
        }
        mobileCard={withMobileCard ? renderMobileCard : undefined}
      />
    </div>
  );
}

function firstRowCheckbox(): HTMLElement {
  const [checkbox] = screen.getAllByRole("checkbox", { name: "Select row" });
  if (!checkbox) throw new Error("no row checkbox rendered");
  return checkbox;
}

function firstDataRow(): HTMLElement {
  const row = screen.getByText("Ada Lovelace").closest("tr");
  if (!row) throw new Error("no data row rendered");
  return row;
}

describe("DataTable — keyboard activation on interactive row content", () => {
  it("does not cancel the row checkbox's own Space activation", () => {
    render(<Harness />);
    const notPrevented = fireEvent.keyDown(firstRowCheckbox(), {
      key: " ",
      code: "Space",
    });
    expect(notPrevented).toBe(true);
  });

  it("selects the row on Space over its checkbox without opening the detail sheet", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    firstRowCheckbox().focus();

    await user.keyboard(" ");

    expect(screen.getByTestId("selection-count")).toHaveTextContent("1");
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
    expect(firstRowCheckbox()).toHaveAttribute("aria-checked", "true");
  });

  it("does not open the detail sheet on Enter over the row checkbox", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    firstRowCheckbox().focus();

    await user.keyboard("{Enter}");

    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("leaves a second row selectable by keyboard after the first is selected", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    firstRowCheckbox().focus();
    await user.keyboard(" ");

    const boxes = screen.getAllByRole("checkbox", { name: "Select row" });
    const second = boxes[1];
    if (!second) throw new Error("no second row checkbox rendered");
    second.focus();
    await user.keyboard(" ");

    expect(screen.getByTestId("selection-count")).toHaveTextContent("2");
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("does not swallow keys aimed at a row action button", async () => {
    const onRowAction = jest.fn();
    const user = userEvent.setup();
    render(<Harness onRowAction={onRowAction} />);
    const action = screen.getByRole("button", { name: "Actions for Ada Lovelace" });

    const enterNotPrevented = fireEvent.keyDown(action, { key: "Enter" });
    expect(enterNotPrevented).toBe(true);
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();

    action.focus();
    await user.keyboard(" ");

    expect(onRowAction).toHaveBeenCalled();
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("does not activate the row from a focusable descendant such as a truncation tooltip trigger", () => {
    render(<Harness withFocusStop />);
    const focusStop = screen.getByText("Full name Ada Lovelace");

    const notPrevented = fireEvent.keyDown(focusStop, { key: "Enter" });

    expect(notPrevented).toBe(true);
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("does not swallow keys aimed at a button inside a mobile card", () => {
    render(<Harness withMobileCard />);
    const action = screen.getByRole("button", { name: "Card action for Ada Lovelace" });

    const notPrevented = fireEvent.keyDown(action, { key: " ", code: "Space" });

    expect(notPrevented).toBe(true);
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });
});

describe("DataTable — row activation still works", () => {
  it("opens the detail sheet on Enter over the row itself", () => {
    render(<Harness />);

    fireEvent.keyDown(firstDataRow(), { key: "Enter" });

    expect(screen.getByTestId("detail-sheet")).toHaveTextContent("Ada Lovelace");
  });

  it("opens the detail sheet on Space over the row itself", () => {
    render(<Harness />);

    fireEvent.keyDown(firstDataRow(), { key: " ", code: "Space" });

    expect(screen.getByTestId("detail-sheet")).toHaveTextContent("Ada Lovelace");
  });

  it("opens the detail sheet on a row click", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByText("Ada Lovelace"));

    expect(screen.getByTestId("detail-sheet")).toHaveTextContent("Ada Lovelace");
  });

  it("selects on a checkbox click without opening the detail sheet", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(firstRowCheckbox());

    expect(screen.getByTestId("selection-count")).toHaveTextContent("1");
    expect(screen.queryByTestId("detail-sheet")).not.toBeInTheDocument();
  });

  it("opens the detail sheet on Enter over a mobile card", () => {
    render(<Harness withMobileCard />);
    const card = screen.getByRole("button", { name: /^Card Ada Lovelace/ });

    fireEvent.keyDown(card, { key: "Enter" });

    expect(screen.getByTestId("detail-sheet")).toHaveTextContent("Ada Lovelace");
  });
});
