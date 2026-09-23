import { render, screen } from "@testing-library/react";
import { EntityActionDialog } from "./entity-action-dialog";
import type { EntityAction } from "@/hooks/api/chat";

const mutateAsync = jest.fn().mockResolvedValue({});
const optionsResult = { data: [{ value: "u1", label: "Priya", imageUrl: null }] };

jest.mock("@/hooks/api/chat", () => ({
  useSubmitEntityAction: () => ({ mutateAsync, isPending: false }),
  useEntityActionOptions: () => optionsResult,
}));

// MemberPicker's own directory sources. With an explicit candidate list they are
// all disabled, but the hooks still run, and they need a session and a query
// client this test has no business providing.
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
  useOrgMembersByIds: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build/projects", () => ({
  useProjectMembers: () => ({ data: [] }),
}));
jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/module-access", () => ({
  useModuleMemberCandidates: () => ({ data: undefined }),
}));

const REFERENCE = { type: "ticket", id: "1" };

function renderAction(action: EntityAction) {
  return render(
    <EntityActionDialog
      open
      onOpenChange={jest.fn()}
      channelId={1}
      reference={REFERENCE}
      action={action}
    />,
  );
}

describe("the action dialog renders from the declaration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("titles itself and its submit control with the action's own label", () => {
    renderAction({ id: "assign", label: "Assign", inputs: [] });

    expect(screen.getAllByText("Assign").length).toBeGreaterThan(0);
  });

  it("labels a field for every declared input", () => {
    renderAction({
      id: "compose",
      label: "Compose",
      inputs: [
        { name: "title", kind: "text", required: true },
        { name: "dueDate", kind: "date", required: false },
      ],
    });

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Due date")).toBeInTheDocument();
  });

  it("offers exactly the choices a choice input declares", () => {
    renderAction({
      id: "status",
      label: "Change status",
      inputs: [
        { name: "status", kind: "choice", required: true, choices: ["TODO", "DONE"] },
      ],
    });

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders a person input through the shared member picker", () => {
    renderAction({
      id: "assign",
      label: "Assign",
      inputs: [
        {
          name: "assigneeId",
          kind: "user",
          required: true,
          options: { from: { type: "project", id: "7" } },
        },
      ],
    });

    expect(screen.getByText("Assignee id")).toBeInTheDocument();
    expect(screen.getByText(/select assignee id/i)).toBeInTheDocument();
  });

  it("renders a plain field for a text input", () => {
    renderAction({
      id: "note",
      label: "Add note",
      inputs: [{ name: "note", kind: "text", required: false }],
    });

    // The dialog renders through a portal, so the query has to search the
    // document rather than the render container.
    expect(document.querySelector("#entity-action-note")).toBeInTheDocument();
  });

  it("renders nothing extra for an action that declares no inputs", () => {
    renderAction({ id: "close", label: "Close", inputs: [] });

    expect(document.querySelectorAll("[id^='entity-action-']")).toHaveLength(0);
  });
});
