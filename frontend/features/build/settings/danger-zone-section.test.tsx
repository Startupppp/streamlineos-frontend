import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerZoneSection } from "./danger-zone-section";

jest.mock("@/hooks/api/build/projects", () => ({
  useDeleteProject: () => ({ mutate: jest.fn(), isPending: false }),
}));

describe("DangerZoneSection", () => {
  it("restores focus to Delete Project when its confirmation is canceled", async () => {
    const user = userEvent.setup();
    render(
      <DangerZoneSection
        projectId={6}
        projectName="Build QA Sandbox"
        onDeleted={jest.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Delete Project" });
    await user.click(trigger);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
