import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * NEO-5 / PEND-5 — the RF surface is not a data table, proved by rendering it.
 *
 * `rf-surface.test.ts` beside this file reads source and forbids four strings:
 * `DataTable`, `DataTableSkeleton`, `<table` and `overflow-x-auto`. That catches
 * the desktop screen being pasted in, and nothing else. A table can arrive
 * through a UI-kit `<Table>`, a third-party grid, a `role="grid"` on a div, or
 * any component three levels down whose own source this file never reads — and
 * every one of those would pass the text check while putting a horizontally
 * scrolling grid in front of somebody holding a scanner in one hand.
 *
 * So this mounts the three RF screens and asks the DOM. `role="table"`,
 * `"grid"`, `"row"`, `"columnheader"` and a literal `<table>` are all absent, at
 * any depth, whoever rendered them.
 *
 * ## What it deliberately does not claim
 *
 * jsdom has no layout, so nothing here measures anything: "fits at 375px" is not
 * a thing this file can say, and asserting it would be a lie a green tick makes
 * convincing. What it can say is that the primary control on each screen is one
 * tappable thing with a name — a link per task, a scan box and a confirm button
 * per runner — and that nothing in the rendered tree declares a fixed width
 * wider than the device.
 */

const VIEWPORT_WIDTH = 375;

/** Every way a table announces itself, whoever rendered it. */
const TABLE_ROLES = ["table", "grid", "row", "columnheader", "rowheader", "gridcell"] as const;

/**
 * A width the device does not have. `min-w-[900px]`, `w-[720px]`, `min-w-3xl`:
 * a class that pins content wider than the screen is a horizontal scroll by
 * another name, which is the thing the unit is actually against.
 */
const FIXED_WIDTH = /\b(?:min-)?w-\[(\d+)px\]/g;

function expectNoTable(container: HTMLElement): void {
  expect(container.querySelectorAll("table")).toHaveLength(0);
  for (const role of TABLE_ROLES) {
    expect(screen.queryAllByRole(role)).toEqual([]);
  }
}

function expectNothingWiderThanTheDevice(container: HTMLElement): void {
  const tooWide: string[] = [];
  for (const el of Array.from(container.querySelectorAll("[class]"))) {
    // `getAttribute`, not `className`: on an SVG that property is an
    // `SVGAnimatedString`, and every icon on these screens is an SVG.
    const classes = el.getAttribute("class") ?? "";
    for (const match of classes.matchAll(FIXED_WIDTH)) {
      if (Number(match[1]) > VIEWPORT_WIDTH) tooWide.push(match[0]);
    }
    if (/overflow-x-(auto|scroll)/.test(classes)) tooWide.push("overflow-x");
  }
  expect(tooWide).toEqual([]);
}

// ---------------------------------------------------------------------------
// The data layer, stubbed. These screens are shells around three hooks; what is
// under test is what they render, not where the rows came from.
// ---------------------------------------------------------------------------

const rfQueue = jest.fn();
const useCan = jest.fn(() => true);
const pickWave = jest.fn();
const putawayTask = jest.fn();

jest.mock("@/hooks/api/inventory/rf-queue", () => ({
  useRfQueue: () => rfQueue(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => useCan(key),
}));
jest.mock("@/hooks/api/inventory/picking", () => ({
  usePickWave: () => pickWave(),
  useConfirmPick: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/inventory/putaway", () => ({
  usePutawayTask: () => putawayTask(),
  useCompletePutaway: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/inventory/scan", () => ({
  useCaptureScan: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("next/navigation", () => ({
  useParams: () => ({ pickListId: "1", taskId: "1" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn() }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfQueuePage = require("./page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfPickPage = require("./pick/[pickListId]/page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfPutawayPage = require("./putaway/[taskId]/page").default as () => ReactElement;

beforeEach(() => {
  useCan.mockReturnValue(true);
  window.innerWidth = VIEWPORT_WIDTH;
});

describe("NEO-5 - the rendered RF surface has no data table", () => {
  it("lists the operator's tasks as tappable rows, not a grid", () => {
    rfQueue.mockReturnValue({
      isLoading: false,
      isError: false,
      isDenied: false,
      refetch: jest.fn(),
      tasks: [
        {
          kind: "PICK",
          id: 1,
          reference: "PICK-0001",
          summary: "3 lines to pick",
          warehouseId: 1,
          href: "/inventory/rf/pick/1",
        },
        {
          kind: "PUTAWAY",
          id: 2,
          reference: "PUT-0002",
          summary: "1 pallet to put away",
          warehouseId: 1,
          href: "/inventory/rf/putaway/2",
        },
        {
          kind: "COUNT",
          id: 3,
          reference: "CNT-0003",
          summary: "12 bins to count",
          warehouseId: 1,
          href: "/inventory/cycle-counts?count=3",
        },
      ],
    });

    const { container } = render(<RfQueuePage />);
    expectNoTable(container);
    expectNothingWiderThanTheDevice(container);

    // One tap per task, and the task says what it is without a column header to
    // explain it. Three kinds — pick, put away and count — so a queue that
    // quietly dropped one is a failure rather than a shorter list.
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    for (const reference of ["PICK-0001", "PUT-0002", "CNT-0003"]) {
      expect(within(list).getByText(reference)).toBeInTheDocument();
    }
    expect(within(list).getAllByRole("link")).toHaveLength(3);
  });

  it("walks a pick line as one screen: scan, then confirm", () => {
    pickWave.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      data: {
        id: 1,
        pickNumber: "PICK-0001",
        lines: [
          {
            id: 10,
            line_closed: false,
            sku: "NEO-1",
            product_name: "NEO widget",
            location_code: "A-01-01",
            lot_number: null,
            quantity_to_pick: "5.0000",
            quantity_picked: "0.0000",
          },
          {
            id: 11,
            line_closed: false,
            sku: "NEO-2",
            product_name: "NEO gadget",
            location_code: "A-01-02",
            lot_number: null,
            quantity_to_pick: "2.0000",
            quantity_picked: "0.0000",
          },
        ],
      },
    });

    const { container } = render(<RfPickPage />);
    expectNoTable(container);
    expectNothingWiderThanTheDevice(container);

    // One line, not two: the choosing was done by whatever built the wave.
    expect(screen.getByText("A-01-01")).toBeInTheDocument();
    expect(screen.queryByText("A-01-02")).not.toBeInTheDocument();

    // The scan box is the primary control, and it comes before the command.
    const scan = screen.getByLabelText(/scan/i);
    const confirm = screen.getByRole("button", { name: /confirm/i });
    expect(scan).toBeInTheDocument();
    expect(scan.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("walks a putaway task the same way", () => {
    putawayTask.mockReturnValue({
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      data: {
        task: { id: 1, taskNumber: "PUT-0002", grnId: 7 },
        lines: [
          {
            id: 20,
            sku: "NEO-1",
            variant_name: "NEO widget",
            to_location_id: 5,
            to_location_code: "A-01-01",
            lot_number: null,
            quantity: "100.0000",
            quantity_moved: "0.0000",
            remaining: "100.0000",
            suggestions: [],
          },
        ],
      },
    });

    const { container } = render(<RfPutawayPage />);
    expectNoTable(container);
    expectNothingWiderThanTheDevice(container);

    expect(screen.getByText("A-01-01")).toBeInTheDocument();
    const scan = screen.getByLabelText(/scan/i);
    const confirm = screen.getByRole("button", { name: /confirm/i });
    expect(scan.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says denied rather than showing an empty list", () => {
    // The state this programme keeps finding collapsed. An operator who may not
    // see the queue is told so; they are not shown "nothing assigned to you",
    // which is a different and untrue sentence.
    rfQueue.mockReturnValue({
      isLoading: false,
      isError: false,
      isDenied: true,
      refetch: jest.fn(),
      tasks: [],
    });

    const { container } = render(<RfQueuePage />);
    expectNoTable(container);
    expect(screen.queryByText(/nothing assigned to you/i)).not.toBeInTheDocument();
    expect(container.textContent ?? "").toMatch(/permission|access/i);
  });
});
