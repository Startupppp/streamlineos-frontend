import { Suspense, use, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

/**
 * PRD-C150 at the row, which is where 74 call sites turn a click into a
 * navigation.
 *
 * A row click hands control to `onRowClick`, and when that pushes a route the
 * App Router keeps the CURRENT page painted until the destination resolves. So
 * the honest question is not "does the row eventually change" but "is there a
 * marker in the DOM before the navigation has done anything". These tests
 * never advance a timer and never await between the click and the assertion:
 * the marker either committed in the same pass as the event or it did not.
 *
 * The pending window is held open with a real suspended transition rather than
 * a fake clock, because that is exactly the shape a route push has — a
 * transition that cannot commit yet. With a synchronous `onRowClick` (opening
 * a dialog, say) there is nothing to wait for and the marker clears at once,
 * which is also asserted below so the marker cannot rot into a permanent one.
 */

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (row) => row.name },
];

const rows: Row[] = [
  { id: "r1", name: "Acme" },
  { id: "r2", name: "Globex" },
];

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function Destination({ promise }: { promise: Promise<void> }) {
  use(promise);
  return <div data-testid="destination" />;
}

function Harness({
  promise,
  onActivate,
}: {
  promise: Promise<void>;
  onActivate?: (row: Row) => void;
}) {
  const [navigated, setNavigated] = useState(false);
  return (
    <>
      <DataTable<Row>
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={(row) => {
          onActivate?.(row);
          setNavigated(true);
        }}
      />
      <Suspense fallback={null}>
        {navigated ? <Destination promise={promise} /> : null}
      </Suspense>
    </>
  );
}

function bodyRows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll("tbody tr"));
}

describe("DataTable row activation answers the intent before the destination does", () => {
  it("no row claims to be busy before anything is clicked", () => {
    const { promise } = deferred();
    const { container } = render(<Harness promise={promise} />);
    expect(container.querySelectorAll('tbody tr[aria-busy="true"]')).toHaveLength(
      0,
    );
  });

  it("the clicked row is aria-busy in the same pass as the click — no timer advanced, nothing awaited", () => {
    const { promise, resolve } = deferred();
    const { container } = render(<Harness promise={promise} />);
    fireEvent.click(screen.getByText("Acme"));
    const busy = container.querySelectorAll('tbody tr[aria-busy="true"]');
    expect(busy).toHaveLength(1);
    expect(busy[0]).toHaveTextContent("Acme");
    resolve();
  });

  it("only the clicked row is marked, so the feedback points at the intent", () => {
    const { promise, resolve } = deferred();
    const { container } = render(<Harness promise={promise} />);
    fireEvent.click(screen.getByText("Globex"));
    const [first, second] = bodyRows(container);
    expect(first).not.toHaveAttribute("aria-busy", "true");
    expect(second).toHaveAttribute("aria-busy", "true");
    resolve();
  });

  it("keyboard activation gets the same marker as the mouse", () => {
    const { promise, resolve } = deferred();
    const { container } = render(<Harness promise={promise} />);
    const [first] = bodyRows(container);
    fireEvent.keyDown(first, { key: "Enter" });
    expect(first).toHaveAttribute("aria-busy", "true");
    resolve();
  });

  it("carries a visible pending affordance beside the ARIA one", () => {
    const { promise, resolve } = deferred();
    const { container } = render(<Harness promise={promise} />);
    fireEvent.click(screen.getByText("Acme"));
    expect(
      container.querySelectorAll('tbody tr[data-pending="true"]'),
    ).toHaveLength(1);
    resolve();
  });

  it("the row still hands the intent to its caller", () => {
    const { promise, resolve } = deferred();
    const onActivate = jest.fn();
    render(<Harness promise={promise} onActivate={onActivate} />);
    fireEvent.click(screen.getByText("Globex"));
    expect(onActivate).toHaveBeenCalledWith(rows[1]);
    resolve();
  });

  it("a synchronous handler leaves no residue, so the marker cannot become permanent", async () => {
    const onActivate = jest.fn();
    const { container } = render(
      <DataTable<Row>
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={onActivate}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Acme"));
    });
    expect(onActivate).toHaveBeenCalledWith(rows[0]);
    expect(
      container.querySelectorAll('tbody tr[aria-busy="true"]'),
    ).toHaveLength(0);
  });

  it("a table with no row handler marks nothing at all", () => {
    const { container } = render(
      <DataTable<Row> data={rows} columns={columns} getRowKey={(row) => row.id} />,
    );
    fireEvent.click(screen.getByText("Acme"));
    expect(container.querySelectorAll("tbody tr[aria-busy]")).toHaveLength(0);
  });
});
