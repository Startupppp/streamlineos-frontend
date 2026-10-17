import { useRef } from "react";
import { render, waitFor } from "@testing-library/react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { KanbanBoardColumn } from "./kanban-board-column";

jest.mock("./kanban-column-header", () => ({
  KanbanColumnHeader: ({
    dragHandleProps,
  }: {
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
  }) => <button {...dragHandleProps}>To do</button>,
}));

jest.mock("./kanban-quick-add", () => ({
  QuickAddInput: () => null,
}));

function ColumnHarness() {
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  return (
    <DragDropContext onDragEnd={jest.fn()}>
      <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
        {(columnsProvided) => (
          <div ref={columnsProvided.innerRef} {...columnsProvided.droppableProps}>
            <Draggable draggableId="column-1" index={0}>
              {(columnProvided) => (
                <KanbanBoardColumn
                  column={{ id: "TODO", statusId: 1, name: "To do", color: null, order: 0 }}
                  tickets={[]}
                  projectId={1}
                  droppableId="TODO"
                  canManage
                  existingNames={["To do"]}
                  onRename={jest.fn()}
                  onColorChange={jest.fn()}
                  onSelect={jest.fn()}
                  dragStartRef={dragStartRef}
                  canDragTickets
                  columnInnerRef={columnProvided.innerRef}
                  columnDraggableProps={columnProvided.draggableProps}
                  dragHandleProps={columnProvided.dragHandleProps}
                />
              )}
            </Draggable>
            {columnsProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

it("registers the column draggable and its ticket droppable before DnD validation", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  render(<ColumnHarness />);

  await waitFor(() => {
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("provided.innerRef has not been provided with a HTMLElement"),
    );
  });
  consoleError.mockRestore();
});
