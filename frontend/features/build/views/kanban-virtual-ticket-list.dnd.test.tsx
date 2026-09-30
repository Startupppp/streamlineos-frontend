import { useEffect, useRef, type MutableRefObject } from "react";
import { render, waitFor } from "@testing-library/react";
import { DragDropContext } from "@hello-pangea/dnd";
import { KanbanVirtualTicketList } from "./kanban-virtual-ticket-list";

jest.mock("react-window", () => ({
  List: ({
    listRef,
  }: {
    listRef?: (handle: { element: HTMLDivElement | null } | null) => void;
  }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      listRef?.({ element: elementRef.current });
      return () => listRef?.(null);
    }, [listRef]);
    return <div data-testid="virtual-ticket-list" ref={elementRef} />;
  },
  useDynamicRowHeight: () => ({
    getRowHeight: () => 148,
    getAverageRowHeight: () => 148,
    observeRowElements: () => undefined,
  }),
}));

jest.mock("./kanban-ticket-card", () => ({
  KanbanTicketCard: () => null,
}));

it("registers the virtual droppable before the DnD setup check runs", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  const dragStartRef: MutableRefObject<{ x: number; y: number } | null> = {
    current: null,
  };

  render(
    <DragDropContext onDragEnd={jest.fn()}>
      <KanbanVirtualTicketList
        tickets={[]}
        projectId={1}
        droppableId="TODO"
        onSelect={jest.fn()}
        dragStartRef={dragStartRef}
        canDragTickets
      />
    </DragDropContext>,
  );

  await waitFor(() => {
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("provided.innerRef has not been provided with a HTMLElement"),
    );
  });
  consoleError.mockRestore();
});
