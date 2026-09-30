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
  List: () => <div data-testid="virtual-ticket-list" />,
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

describe("KanbanVirtualTicketList — droppable registration", () => {
  beforeEach(() => {
    droppableInnerRef.mockClear();
  });

  it("attaches provided.innerRef to a real DOM element on the initial render", () => {
    const dragStartRef: MutableRefObject<{ x: number; y: number } | null> = {
      current: null,
    };

    render(
      <KanbanVirtualTicketList
        tickets={[]}
        projectId={1}
        droppableId="TODO"
        onSelect={jest.fn()}
        dragStartRef={dragStartRef}
        canDragTickets
      />,
    );

    const list = screen.getByTestId("virtual-ticket-list");
    expect(droppableInnerRef).toHaveBeenCalledWith(list.parentElement);
    expect(droppableInnerRef.mock.calls[0]?.[0]).toBeInstanceOf(HTMLElement);
  });
});
