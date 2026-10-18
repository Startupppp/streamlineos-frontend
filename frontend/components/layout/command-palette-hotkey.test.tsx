import { fireEvent, render } from "@testing-library/react";
import { CommandPalette } from "./command-palette";

const setPaletteOpen = jest.fn();

jest.mock("next/dynamic", () => () => () => null);

jest.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({ paletteOpen: false, setPaletteOpen }),
}));

beforeEach(() => setPaletteOpen.mockClear());

describe("CommandPalette Ctrl+K", () => {
  it("opens the palette from the page body", () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });

    expect(setPaletteOpen).toHaveBeenCalledWith(true);
  });

  it("leaves Ctrl+K to a rich-text editor so it can insert a link", () => {
    const view = render(
      <>
        <CommandPalette />
        <div contentEditable="true" suppressContentEditableWarning>
          <p>Body</p>
        </div>
      </>,
    );

    fireEvent.keyDown(view.getByText("Body"), { key: "k", ctrlKey: true });

    expect(setPaletteOpen).not.toHaveBeenCalled();
  });

  it("does not open when a focused control already handled the shortcut", () => {
    render(<CommandPalette />);
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true });
    event.preventDefault();

    document.body.dispatchEvent(event);

    expect(setPaletteOpen).not.toHaveBeenCalled();
  });
});
