import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import {
  VIEWPORT_WIDTH,
  MIXED_QUEUE,
  expectNoTable,
  expectNothingWiderThanTheDevice,
} from "./rf-surface-render-helpers";

const rfQueue = jest.fn();
const useCan = jest.fn((_key: string) => true);

jest.mock("@/hooks/api/inventory/rf-queue", () => ({
  useRfQueue: () => rfQueue(),
}));
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => useCan(key),
}));
jest.mock("@/hooks/api/inventory/picking", () => ({
  usePickWave: () => ({ isLoading: false, isError: false, refetch: jest.fn(), data: null }),
  useConfirmPick: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/api/inventory/putaway", () => ({
  usePutawayTask: () => ({ isLoading: false, isError: false, refetch: jest.fn(), data: null }),
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
const RfPickQueuePage = require("./pick/page").default as () => ReactElement;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RfPutawayQueuePage = require("./putaway/page").default as () => ReactElement;

beforeEach(() => {
  useCan.mockReturnValue(true);
  window.innerWidth = VIEWPORT_WIDTH;
});

describe("T09 - the per-kind RF queues answer instead of 404ing", () => {
  it("shows the picker only their picks, one tap each", () => {
    rfQueue.mockReturnValue({
      isLoading: false,
      isError: false,
      isDenied: false,
      refetch: jest.fn(),
      tasks: MIXED_QUEUE,
    });

    const { container } = render(<RfPickQueuePage />);
    expectNoTable(container);
    expectNothingWiderThanTheDevice(container);

    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(list).getByText("PICK-0001")).toBeInTheDocument();
    expect(within(list).queryByText("PUT-0002")).not.toBeInTheDocument();
    expect(within(list).queryByText("CNT-0003")).not.toBeInTheDocument();
    expect(within(list).getAllByRole("link")).toHaveLength(1);

    expect(screen.getByLabelText(/back to tasks/i)).toHaveAttribute(
      "href",
      "/inventory/rf",
    );
  });

  it("shows the receiver only their putaway tasks", () => {
    rfQueue.mockReturnValue({
      isLoading: false,
      isError: false,
      isDenied: false,
      refetch: jest.fn(),
      tasks: MIXED_QUEUE,
    });

    const { container } = render(<RfPutawayQueuePage />);
    expectNoTable(container);
    expectNothingWiderThanTheDevice(container);

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).getByText("PUT-0002")).toBeInTheDocument();
    expect(within(list).queryByText("PICK-0001")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/back to tasks/i)).toHaveAttribute(
      "href",
      "/inventory/rf",
    );
  });

  it("says nothing is assigned rather than pretending the queue is broken", () => {
    rfQueue.mockReturnValue({
      isLoading: false,
      isError: false,
      isDenied: false,
      refetch: jest.fn(),
      tasks: MIXED_QUEUE.filter((task) => task.kind !== "PICK"),
    });

    const { container } = render(<RfPickQueuePage />);
    expectNoTable(container);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(container.textContent ?? "").toMatch(/no picks assigned to you/i);
  });

  it("says denied rather than showing an empty queue", () => {
    useCan.mockReturnValue(false);
    rfQueue.mockReturnValue({
      isLoading: false,
      isError: false,
      isDenied: true,
      refetch: jest.fn(),
      tasks: [],
    });

    const { container } = render(<RfPickQueuePage />);
    expectNoTable(container);
    expect(screen.queryByText(/no picks assigned to you/i)).not.toBeInTheDocument();
    expect(container.textContent ?? "").toMatch(/permission|access/i);
  });
});
