import { render, screen } from "@testing-library/react";

import PublicPageContent from "./public-page-content";

function bullet(text: string, indent = 1) {
  return { type: "p", listStyleType: "disc", indent, children: [{ text }] };
}

function numbered(text: string, listStart?: number) {
  return {
    type: "p",
    listStyleType: "decimal",
    indent: 1,
    ...(listStart === undefined ? {} : { listStart }),
    children: [{ text }],
  };
}

function todo(text: string, checked: boolean) {
  return { type: "p", listStyleType: "todo", indent: 1, checked, children: [{ text }] };
}

describe("PublicPageContent — the editor writes indent lists, so the reader must read them", () => {
  it("renders a bulleted item as a list item, not as a bare paragraph", () => {
    render(<PublicPageContent content={[bullet("first point")]} />);

    const item = screen.getByText("first point").closest("li");
    expect(item).not.toBeNull();
    expect(item?.closest("ul")).not.toBeNull();
  });

  it("numbers a numbered list from the stored listStart rather than restarting at one", () => {
    render(
      <PublicPageContent
        content={[numbered("alpha"), numbered("beta", 2), numbered("gamma", 3)]}
      />,
    );

    const list = screen.getByText("alpha").closest("ol");
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll("li")).toHaveLength(3);
  });

  it("renders a to-do item with a checkbox reflecting its stored state", () => {
    render(<PublicPageContent content={[todo("done", true), todo("open", false)]} />);

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
  });

  it("keeps a to-do read-only for a public reader", () => {
    render(<PublicPageContent content={[todo("open", false)]} />);

    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("keeps nested items nested instead of flattening every level to the margin", () => {
    render(<PublicPageContent content={[bullet("outer", 1), bullet("inner", 2)]} />);

    const outer = screen.getByText("outer").closest("li");
    const inner = screen.getByText("inner").closest("li");
    expect(outer).not.toBeNull();
    expect(inner).not.toBeNull();
    expect(outer?.getAttribute("style")).not.toBe(inner?.getAttribute("style"));
  });

  it("still renders an ordinary paragraph as a paragraph", () => {
    render(<PublicPageContent content={[{ type: "p", children: [{ text: "just prose" }] }]} />);

    expect(screen.getByText("just prose").closest("p")).not.toBeNull();
    expect(screen.getByText("just prose").closest("li")).toBeNull();
  });
});
