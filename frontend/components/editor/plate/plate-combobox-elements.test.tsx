import { act, fireEvent, render, screen } from "@testing-library/react";
import type { PlateElementProps } from "platejs/react";
import { EmojiInputElement, SlashInputElement } from "./plate-combobox-elements";

const removeNodes = jest.fn();
const insertNodes = jest.fn();
const setNodes = jest.fn();
const focus = jest.fn();
let selected = true;

jest.mock("platejs/react", () => ({
  PlateElement: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useSelected: () => selected,
  useEditorRef: () => ({
    api: {
      findPath: () => [0, 1],
      above: () => [{ type: "p", children: [] }, [0]],
    },
    tf: {
      removeNodes,
      insertNodes,
      setNodes,
      focus,
      insertText: jest.fn(),
      withoutNormalizing: (fn: () => void) => fn(),
    },
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
  const p = { element: { type: "slash_input", children: [{ text: "" }] }, children: null, attributes: {}, path: [] };
  assertIsPlateProps(p);
  return p;
}

beforeEach(() => {
  jest.clearAllMocks();
  selected = true;
});

describe("slash command input", () => {
  it("takes typed text as the query and filters the commands, instead of swallowing it in a void node", () => {
    render(<SlashInputElement {...props()} />);
    const input = screen.getByRole("textbox", { name: "Slash command" });
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "head" } });

    expect(screen.getByRole("button", { name: /Heading 1/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bullet List/ })).toBeNull();
  });

  it("resets keyboard selection when the query changes", () => {
    render(<SlashInputElement {...props()} />);
    const input = screen.getByRole("textbox", { name: "Slash command" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: /Heading 1/ })).toHaveClass("bg-accent");

    fireEvent.change(input, { target: { value: "heading" } });

    expect(screen.getByRole("button", { name: /Heading 1/ })).toHaveClass("bg-accent");
  });

  it("turns the input back into plain text on Escape, so no slash_input node is left to be saved", () => {
    render(<SlashInputElement {...props()} />);
    const input = screen.getByRole("textbox", { name: "Slash command" });
    fireEvent.change(input, { target: { value: "abc" } });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(removeNodes).toHaveBeenCalledWith({ at: [0, 1] });
    expect(insertNodes).toHaveBeenCalledWith({ text: "/abc" }, { at: [0, 1], select: true });
    expect(focus).toHaveBeenCalled();
  });

  it("turns the input back into plain text when focus leaves it", () => {
    render(<SlashInputElement {...props()} />);

    act(() => screen.getByRole("textbox", { name: "Slash command" }).blur());

    expect(insertNodes).toHaveBeenCalledWith({ text: "/" }, { at: [0, 1], select: true });
  });

  it("removes the input without leaving text on Backspace when the query is empty", () => {
    render(<SlashInputElement {...props()} />);

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Slash command" }), { key: "Backspace" });

    expect(removeNodes).toHaveBeenCalledWith({ at: [0, 1] });
    expect(insertNodes).not.toHaveBeenCalled();
  });

  it("applies the highlighted command on Enter and does not also cancel it into text", () => {
    render(<SlashInputElement {...props()} />);
    const input = screen.getByRole("textbox", { name: "Slash command" });
    fireEvent.keyDown(input, { key: "ArrowDown" });

    fireEvent.keyDown(input, { key: "Enter" });
    act(() => input.blur());

    expect(setNodes).toHaveBeenCalledWith({ type: "h1" }, { at: [0] });
    expect(insertNodes).not.toHaveBeenCalled();
  });

  it("does not open the menu for a node it was not just typed into", () => {
    selected = false;
    render(<SlashInputElement {...props()} />);

    expect(screen.queryByRole("button", { name: /Heading 1/ })).toBeNull();
  });
});

it("resets emoji keyboard selection when the query changes", () => {
  render(<EmojiInputElement {...props()} />);
  const input = screen.getByRole("textbox", { name: "Emoji search" });
  const initialButtons = screen.getAllByRole("button");
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(initialButtons[1]).toHaveClass("bg-accent");

  fireEvent.change(input, { target: { value: "smile" } });

  expect(screen.getAllByRole("button")[0]).toHaveClass("bg-accent");
});
