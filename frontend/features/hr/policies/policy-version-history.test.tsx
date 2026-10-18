import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import type { HrPolicy } from "@/types/hr/policies";
import { PolicyVersionHistory } from "./policy-version-history";

const activateMutate = jest.fn();

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/hr/policies", () => ({
  useActivatePolicy: () => ({ mutate: activateMutate, isPending: false }),
  useArchivePolicy: () => ({ mutate: jest.fn(), isPending: false }),
  useCreatePolicyVersion: () => ({ mutate: jest.fn(), isPending: false }),
  usePolicyConflicts: () => ({ data: { conflicts: [], canActivate: true }, isLoading: false }),
}));

jest.mock("./policy-conflict-banner", () => ({ PolicyConflictBanner: () => null }));

const draft: HrPolicy = {
  id: 7,
  orgId: "org-1",
  policyType: "leave",
  name: "Leave",
  description: null,
  status: "draft",
  version: 1,
  parentPolicyId: null,
  effectiveFrom: "2026-10-01",
  effectiveTo: null,
  rules: {},
  priority: 0,
  createdBy: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  scopes: [],
};

function renderDraft(props: { onActivated?: () => void; unsavedChanges?: boolean } = {}) {
  return render(
    <PolicyVersionHistory policy={draft} canManage {...props} />,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("PolicyVersionHistory activation (QA 2026-10-14: editor stayed open on a stale draft)", () => {
  it("one Activate click toasts and hands control back to the host so the editor closes", () => {
    const onActivated = jest.fn();
    activateMutate.mockImplementation((_input, opts: { onSuccess: () => void }) => opts.onSuccess());
    renderDraft({ onActivated });

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));

    expect(activateMutate).toHaveBeenCalledWith({ policyId: 7, force: false }, expect.anything());
    expect(toast.success).toHaveBeenCalledWith("Policy activated");
    expect(onActivated).toHaveBeenCalledTimes(1);
  });

  it("does not close the host when activation is refused", () => {
    const onActivated = jest.fn();
    activateMutate.mockImplementation((_input, opts: { onError: (e: Error) => void }) =>
      opts.onError(new Error("Conflict")),
    );
    renderDraft({ onActivated });

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));

    expect(onActivated).not.toHaveBeenCalled();
  });

  it("blocks activation while the form has unsaved edits, and says why", () => {
    renderDraft({ unsavedChanges: true });

    expect(screen.getByRole("button", { name: "Activate" })).toBeDisabled();
    expect(screen.getByText(/save your changes before activating/i)).toBeInTheDocument();
  });
});

describe("PolicyVersionHistory on a new version (HR-U-022)", () => {
  it("says activating the draft replaces this policy's active version instead of treating it as a conflict", () => {
    render(<PolicyVersionHistory policy={{ ...draft, version: 2, parentPolicyId: 6 }} canManage />);

    expect(screen.getByText(/Activating v2 replaces the active version of this policy/)).toBeInTheDocument();
  });

  it("says nothing about replacing for a first draft", () => {
    renderDraft();

    expect(screen.queryByText(/replaces the active version/)).not.toBeInTheDocument();
  });
});
