import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
}));

jest.mock("@/features/build/project-create/project-create-wizard", () => ({
  ProjectCreateWizard: () => <div data-testid="wizard" />,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

import { NewProjectDialog } from "./new-project-dialog";

describe("NewProjectDialog — permission-hidden", () => {
  it("renders nothing when the user cannot create and the dialog is closed", () => {
    const { container } = render(<NewProjectDialog />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: /New Project/i })).not.toBeInTheDocument();
  });

  it("does not render a URL-opened wizard without create permission", () => {
    const { container } = render(
      <NewProjectDialog open onOpenChange={jest.fn()} trigger={null} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("wizard")).not.toBeInTheDocument();
  });
});
