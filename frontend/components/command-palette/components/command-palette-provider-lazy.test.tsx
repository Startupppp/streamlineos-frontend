import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCommandPalette } from "../hooks/use-command-palette";
import { CommandPaletteProvider } from "./command-palette-provider";

const dialogMounted = jest.fn();

jest.mock("next/dynamic", () => () => function DeferredDialog() {
  dialogMounted();
  return <div>Keyboard shortcuts dialog</div>;
});

jest.mock("../hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: jest.fn(),
}));

function OpenHelpButton() {
  const { setHelpOpen } = useCommandPalette();

  function handleOpenHelp() {
    setHelpOpen(true);
  }

  return <button type="button" onClick={handleOpenHelp}>Open help</button>;
}

beforeEach(() => {
  dialogMounted.mockClear();
});

it("does not mount the shortcuts dialog before the user requests it", async () => {
  render(
    <CommandPaletteProvider>
      <OpenHelpButton />
    </CommandPaletteProvider>,
  );

  expect(dialogMounted).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Open help" }));
  expect(dialogMounted).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Keyboard shortcuts dialog")).toBeInTheDocument();
});
