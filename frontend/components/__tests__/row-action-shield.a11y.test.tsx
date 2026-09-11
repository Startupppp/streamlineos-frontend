import { fireEvent, render, screen } from "@testing-library/react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { propagationShield } from "@/lib/keyboard-activation";

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
  it("the row ignores Enter from a nested control even in an unshielded cell", () => {
    const { onRowClick, action } = renderTable(bare);
    fireEvent.keyDown(action, { key: "Enter" });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("the row ignores Enter from a nested control behind a click-only shield", () => {
    const { onRowClick, action } = renderTable(clickOnlyShield);
    fireEvent.keyDown(action, { key: "Enter" });
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("BITE PROOF — Enter on the row itself still opens it, so the guard is not a blanket block", () => {
    const { onRowClick, row } = renderTable(bare);
    fireEvent.keyDown(row, { key: "Enter" });
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
