import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEFAULT_DATA } from "../lib/constants";
import { OrgSetupShell } from "./org-setup-shell";

function renderShell(syncStatus: "error" | "saving" | "synced", onRetrySave?: () => void) {
  return render(
    <OrgSetupShell
      sequence={["workspace", "products", "invite"]}
      currentIndex={1}
      title="Modules"
      direction={1}
      saveState="idle"
      syncStatus={syncStatus}
      data={{ ...DEFAULT_DATA }}
      onRetrySave={onRetrySave}
    >
      <p>body</p>
    </OrgSetupShell>,
  );
}

describe("OrgSetupShell — ONB-B-004 save status", () => {
  it("shows Couldn't save with a Retry control that retries the save", async () => {
    const onRetrySave = jest.fn();
    renderShell("error", onRetrySave);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetrySave).toHaveBeenCalledTimes(1);
  });

  it("shows no retry once the save has succeeded", () => {
    renderShell("synced", jest.fn());

    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Couldn't save/)).not.toBeInTheDocument();
  });

  it("shows Saving… while a save is in flight", () => {
    renderShell("saving", jest.fn());

    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
