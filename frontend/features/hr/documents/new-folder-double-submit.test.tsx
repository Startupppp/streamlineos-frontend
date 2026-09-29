import { fireEvent, render, screen } from "@testing-library/react";
import { NewFolderDialog } from "./new-folder-dialog";

const onConfirm = jest.fn();
const onFolderNameChange = jest.fn();

function renderDialog(folderName: string, existingTabs: string[] = []) {
  render(
    <NewFolderDialog
      open
      onOpenChange={jest.fn()}
      folderName={folderName}
      onFolderNameChange={onFolderNameChange}
      existingTabs={existingTabs}
      onConfirm={onConfirm}
    />,
  );
}

function createButton(): HTMLElement {
  return screen.getByRole("button", { name: /create folder/i });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Create Folder refuses a name the library already holds (E2E-ENG-004)", () => {
  it("creates the folder on a first click, so the refusals below are not passing on a dead control", () => {
    renderDialog("Onboarding");
    fireEvent.click(createButton());

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("Onboarding");
  });

  it("refuses a name that already exists, whatever its case", () => {
    renderDialog("onboarding", ["Onboarding"]);
    fireEvent.click(createButton());

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("stays disabled on an empty name, so a blank folder cannot be submitted", () => {
    renderDialog("");

    expect(createButton()).toBeDisabled();
  });

  it("refuses a whitespace-only name that the disabled check alone would have let Enter through", () => {
    renderDialog("   ");
    fireEvent.keyDown(screen.getByLabelText(/folder name/i), { key: "Enter" });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("routes the Enter key through the same guard as the button, so neither entry point is unchecked", () => {
    renderDialog("Compliance 2026");
    fireEvent.keyDown(screen.getByLabelText(/folder name/i), { key: "Enter" });

    expect(onConfirm).toHaveBeenCalledWith("Compliance 2026");
  });
});
