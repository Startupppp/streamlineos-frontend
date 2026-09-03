import { fireEvent, render, screen } from "@testing-library/react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { propagationShield } from "@/lib/keyboard-activation";

/**
 * A `DataTable` row with `onRowClick` carries its own `onKeyDown`, and that
 * handler does not look at the event target. So an Enter or a Space pressed on
 * a control INSIDE an action cell bubbles to the row and fires the row's
 * navigation as well as the control's own action — the keyboard user gets two
 * things for one keystroke.
 *
 * A mouse user was already protected: every action cell stopped the click.
 * Only the keyboard half was missing, which is what `propagationShield`
 * supplies. The bite proofs are the unshielded cells, which show the defect is
 * real rather than hypothetical.
 */

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "r1", name: "Ada" }];

function columns(
  wrapper: (node: React.ReactNode) => React.ReactNode,
  onAction: () => void,
): DataTableColumn<Row>[] {
  return [
    { key: "name", header: "Name", cell: (row) => <span>{row.name}</span> },
    {
      key: "actions",
      header: "",
      cell: () =>
        wrapper(
          <button type="button" onClick={onAction}>
            Revoke
          </button>,
        ),
    },
  ];
}

function shielded(node: React.ReactNode): React.ReactNode {
  return <div {...propagationShield}>{node}</div>;
}

function clickOnlyShield(node: React.ReactNode): React.ReactNode {
  return <div onClick={(e) => e.stopPropagation()}>{node}</div>;
}

function bare(node: React.ReactNode): React.ReactNode {
  return <div>{node}</div>;
}

function renderTable(wrapper: (node: React.ReactNode) => React.ReactNode): {
  onRowClick: jest.Mock;
  onAction: jest.Mock;
  action: HTMLElement;
  row: HTMLElement;
} {
  const onRowClick = jest.fn();
  const onAction = jest.fn();
  const { container } = render(
    <DataTable
      data={ROWS}
      columns={columns(wrapper, onAction)}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
    />,
  );
  const row = container.querySelector("tbody tr[tabindex]");
  if (!(row instanceof HTMLElement))
    throw new Error("the data table no longer puts its clickable row in the tab order");
  return {
    onRowClick,
    onAction,
    action: screen.getByRole("button", { name: "Revoke" }),
    row,
  };
}

describe("an action control inside a clickable row", () => {
  it("BITE PROOF — an unshielded cell lets Enter reach the row as well", () => {
    const { onRowClick, action } = renderTable(bare);
    fireEvent.keyDown(action, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("BITE PROOF — stopping only the click leaves the keyboard defect in place", () => {
    const { onRowClick, action } = renderTable(clickOnlyShield);
    fireEvent.keyDown(action, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("the shared shield stops Enter reaching the row", () => {
    const { onRowClick, action } = renderTable(shielded);
    fireEvent.keyDown(action, { key: "Enter" });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("the shared shield stops Space reaching the row", () => {
    const { onRowClick, action } = renderTable(shielded);
    fireEvent.keyDown(action, { key: " " });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("the shared shield still stops a mouse click reaching the row", () => {
    const { onRowClick, onAction, action } = renderTable(shielded);
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("the shield does not swallow the control's own activation", () => {
    const { onAction, action } = renderTable(shielded);
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("the row itself still activates from the keyboard", () => {
    const { onRowClick, row } = renderTable(shielded);
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });
});
