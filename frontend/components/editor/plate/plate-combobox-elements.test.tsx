import { fireEvent, render, screen } from "@testing-library/react";
import type { PlateElementProps } from "platejs/react";
import { EmojiInputElement, SlashInputElement } from "./plate-combobox-elements";

let query = "";

jest.mock("platejs", () => ({
  NodeApi: { string: () => query },
}));

jest.mock("platejs/react", () => ({
  PlateElement: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useEditorRef: () => ({
    selection: { focus: { path: [0, 0] } },
    api: { above: jest.fn(), findPath: jest.fn() },
    tf: {},
  }),
}));

jest.mock("@platejs/mention", () => ({
  getMentionOnSelectItem: () => jest.fn(),
}));

jest.mock("./plate-context", () => ({
  useEditorPageContext: () => ({ fetchMentionUsers: undefined }),
}));

function assertIsPlateProps(x: object): asserts x is PlateElementProps {}

function props(): PlateElementProps {
  const p = { element: { type: "slash", children: [] }, children: null, attributes: {}, path: [] };
  assertIsPlateProps(p);
  return p;
}

beforeEach(() => {
  query = "";
});

it("resets slash-command keyboard selection when the query changes", () => {
  const view = render(<SlashInputElement {...props()} />);
  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(screen.getByRole("button", { name: /Heading 1/ })).toHaveClass("bg-accent");

  query = "heading";
  view.rerender(<SlashInputElement {...props()} />);

  expect(screen.getByRole("button", { name: /Heading 1/ })).toHaveClass("bg-accent");
});

it("resets emoji keyboard selection when the query changes", () => {
  const view = render(<EmojiInputElement {...props()} />);
  const initialButtons = screen.getAllByRole("button");
  fireEvent.keyDown(window, { key: "ArrowDown" });
  expect(initialButtons[1]).toHaveClass("bg-accent");

  query = "smile";
  view.rerender(<EmojiInputElement {...props()} />);

  expect(screen.getAllByRole("button")[0]).toHaveClass("bg-accent");
});
