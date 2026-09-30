import type { MutableRefObject, ReactNode } from "react";

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
    const attach = (node: HTMLDivElement | null) => {
      listRef?.(node ? { element: node } : null);
    };
    return <div data-testid="virtual-ticket-list" ref={attach} />;
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

  it("does not register a non-scrolling wrapper, which would report scroll offset zero and drop tickets at the wrong index in a scrolled column", () => {
    renderList();

    const list = screen.getByTestId("virtual-ticket-list");
    expect(droppableInnerRef).not.toHaveBeenCalledWith(list.parentElement);
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
