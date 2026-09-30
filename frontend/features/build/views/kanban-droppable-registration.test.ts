import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "kanban-virtual-ticket-list.tsx"),
  "utf8",
);

describe("kanban virtual droppable registration", () => {
  it("attaches the DnD ref and props to a stable DOM wrapper", () => {
    expect(source).toContain("ref={provided.innerRef}");
    expect(source).toContain("{...provided.droppableProps}");
    expect(source).not.toContain("listRef={setDroppableRef}");
    expect(source).not.toContain("innerRefCallbackRef");
  });

  it("has no render-scoped layout effect that could unregister the droppable", () => {
    expect(source).not.toContain("useLayoutEffect");
    expect(source).not.toContain('display: "contents"');
  });
});
