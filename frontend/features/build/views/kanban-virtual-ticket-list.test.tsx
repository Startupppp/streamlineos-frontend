import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";

import { render, screen } from "@testing-library/react";

const droppableInnerRef = jest.fn();

jest.mock("@hello-pangea/dnd", () => ({
  Droppable: ({
    children,
  }: {
    children: (
      provided: {
        innerRef: (element: HTMLElement | null) => void;
        droppableProps: Record<string, string>;
      },
      snapshot: { isDraggingOver: boolean; isUsingPlaceholder?: boolean },
    ) => ReactNode;
  }) =>
    children(
      {
        innerRef: droppableInnerRef,
        droppableProps: { "data-dnd-droppable": "true" },
      },
      { isDraggingOver: false, isUsingPlaceholder: false },
    ),
  Draggable: () => null,
}));

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

import { KanbanVirtualTicketList } from "./kanban-virtual-ticket-list";

function renderList() {
  const dragStartRef: MutableRefObject<{ x: number; y: number } | null> = {
    current: null,
  };

  return render(
    <KanbanVirtualTicketList
      tickets={[]}
      projectId={1}
      droppableId="TODO"
      onSelect={jest.fn()}
      dragStartRef={dragStartRef}
      canDragTickets
    />,
  );
}

describe("KanbanVirtualTicketList — droppable registration", () => {
  beforeEach(() => {
    droppableInnerRef.mockClear();
  });

  it("registers the droppable on the list's own scrolling element, because virtual mode reads scroll offset from it to compute the drop index", () => {
    renderList();

    const list = screen.getByTestId("virtual-ticket-list");
    expect(droppableInnerRef).toHaveBeenCalledWith(list);
    expect(droppableInnerRef.mock.calls[0]?.[0]).toBeInstanceOf(HTMLElement);
  });

  it("registers an HTMLElement before the virtual list publishes its scrolling element, then replaces it with the list", () => {
    renderList();

    const list = screen.getByTestId("virtual-ticket-list");
    expect(droppableInnerRef.mock.calls[0]?.[0]).toBe(list.parentElement);
    expect(droppableInnerRef.mock.calls.at(-1)?.[0]).toBe(list);
  });

  it("keeps the droppable registered across a re-render, so a drag's own renders cannot unregister it mid-drag", () => {
    const { rerender } = renderList();
    droppableInnerRef.mockClear();

    const dragStartRef: MutableRefObject<{ x: number; y: number } | null> = {
      current: null,
    };
    rerender(
      <KanbanVirtualTicketList
        tickets={[]}
        projectId={1}
        droppableId="TODO"
        onSelect={jest.fn()}
        dragStartRef={dragStartRef}
        canDragTickets
      />,
    );

    expect(droppableInnerRef).not.toHaveBeenCalledWith(null);
  });

  it("unregisters the droppable on unmount, so a removed column does not leave a stale registration behind", () => {
    const { unmount } = renderList();
    droppableInnerRef.mockClear();

    unmount();

    expect(droppableInnerRef).toHaveBeenCalledWith(null);
  });
});
