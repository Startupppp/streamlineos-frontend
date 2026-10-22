import { fireEvent, render, screen } from "@testing-library/react";
import { StepTeam } from "./step-team";
import type { WizardDraft } from "../use-project-create";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("../use-wizard-members", () => ({
  useWizardSessionUser: () => ({ id: "creator-id", name: "Creator", email: "creator@example.com" }),
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: ({
    directory,
    values,
    onToggle,
  }: {
    directory?: string;
    values?: string[];
    onToggle?: (userId: string) => void;
  }) => (
    <div>
      <span data-testid="directory">{directory}</span>
      <span data-testid="selected">{values?.join(",")}</span>
      <button type="button" onClick={() => onToggle?.("member-2")}>Toggle member</button>
      <button type="button" onClick={() => onToggle?.("creator-id")}>Toggle creator</button>
    </div>
  ),
}));

function makeDraft(memberIds: string[]): WizardDraft {
  return {
    name: "Test Project",
    key: "TP",
    description: "",
    managerId: "creator-id",
    clientId: "",
    startDate: "",
    endDate: "",
    projectType: "",
    templateId: null,
    modules: { epics: true, timeTracking: true, wiki: true },
    features: {},
    workflow: "simple",
    memberIds,
  };
}

it("uses the shared selector scoped to Build people", () => {
  render(<StepTeam draft={makeDraft(["creator-id"])} updateDraft={jest.fn()} />);

  expect(screen.getByTestId("directory")).toHaveTextContent("build");
  expect(screen.getByText(/Only people with Build access are available/i)).toBeInTheDocument();
});

it("adds a selected Build member while keeping the creator fixed", () => {
  const updateDraft = jest.fn();
  render(<StepTeam draft={makeDraft(["creator-id"])} updateDraft={updateDraft} />);

  fireEvent.click(screen.getByRole("button", { name: "Toggle member" }));
  expect(updateDraft).toHaveBeenCalledWith({ memberIds: ["creator-id", "member-2"] });

  fireEvent.click(screen.getByRole("button", { name: "Toggle creator" }));
  expect(updateDraft).toHaveBeenCalledTimes(1);
});
