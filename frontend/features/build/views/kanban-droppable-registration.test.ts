import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "kanban-virtual-ticket-list.tsx"),
  "utf8",
);

type ListHandle = { element: HTMLDivElement | null } | null;

function buildRefPlumbing() {
  const registrations: (HTMLElement | null)[] = [];
  const innerRefCallbackRef: { current: ((el: HTMLElement | null) => void) | null } =
    { current: null };
  const droppableElementRef: { current: HTMLElement | null } = { current: null };

  const setDroppableRef = (handle: ListHandle) => {
    const element = handle?.element ?? null;
    if (!element || element === droppableElementRef.current) return;
    droppableElementRef.current = element;
    innerRefCallbackRef.current?.(element);
  };

  const unmount = () => {
    droppableElementRef.current = null;
    innerRefCallbackRef.current?.(null);
  };

  innerRefCallbackRef.current = (el) => registrations.push(el);
  return { registrations, setDroppableRef, unmount };
}

describe("kanban virtual droppable registration", () => {
  it("registers the list element once when react-window first reports it", () => {
    const { registrations, setDroppableRef } = buildRefPlumbing();
    const element = document.createElement("div");

    setDroppableRef({ element });

    expect(registrations).toEqual([element]);
  });

  it("ignores the null handle react-window emits while rebuilding its imperative handle", () => {
    const { registrations, setDroppableRef } = buildRefPlumbing();
    const element = document.createElement("div");

    setDroppableRef({ element });
    setDroppableRef(null);
    setDroppableRef({ element: null });

    expect(registrations).toEqual([element]);
  });

  it("does not re-register on a re-render that hands back the same element", () => {
    const { registrations, setDroppableRef } = buildRefPlumbing();
    const element = document.createElement("div");

    setDroppableRef({ element });
    setDroppableRef({ element });
    setDroppableRef({ element });

    expect(registrations).toHaveLength(1);
  });

  it("never unregisters the droppable while the column is still mounted", () => {
    const { registrations, setDroppableRef } = buildRefPlumbing();
    const element = document.createElement("div");

    setDroppableRef({ element });
    for (let render = 0; render < 20; render += 1) {
      setDroppableRef(null);
      setDroppableRef({ element });
    }

    expect(registrations.filter((entry) => entry === null)).toHaveLength(0);
  });

  it("registers the replacement element when react-window swaps its outer node", () => {
    const { registrations, setDroppableRef } = buildRefPlumbing();
    const first = document.createElement("div");
    const second = document.createElement("div");

    setDroppableRef({ element: first });
    setDroppableRef({ element: second });

    expect(registrations).toEqual([first, second]);
  });

  it("unregisters exactly once when the column unmounts", () => {
    const { registrations, setDroppableRef, unmount } = buildRefPlumbing();
    const element = document.createElement("div");

    setDroppableRef({ element });
    unmount();

    expect(registrations).toEqual([element, null]);
  });

  it("keeps the droppable props on the list so the dnd data attributes reach the dom", () => {
    expect(source).toContain("{...provided.droppableProps}");
    expect(source).toContain("listRef={setDroppableRef}");
  });

  it("has no render-scoped layout effect that could unregister the droppable", () => {
    expect(source).not.toContain("useLayoutEffect");
    expect(source).not.toContain('display: "contents"');
  });
});
