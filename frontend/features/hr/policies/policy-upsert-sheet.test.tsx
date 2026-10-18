import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import type { HrPolicy } from "@/types/hr/policies";
import { PolicyUpsertSheet } from "./policy-upsert-sheet";

type MutateOptions = { onSuccess?: () => void; onError?: (error: unknown) => void };
let updateOutcome: { kind: "success" } | { kind: "error"; error: unknown };
const mockUpdateInputs: unknown[] = [];

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/hr/policies", () => ({
  useCreateHrPolicy: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateHrPolicy: () => ({
    isPending: false,
    mutate: (input: unknown, options: MutateOptions) => {
      mockUpdateInputs.push(input);
      if (updateOutcome.kind === "success") options.onSuccess?.();
      else options.onError?.(updateOutcome.error);
    },
  }),
}));

jest.mock("./policy-scopes-editor", () => ({ PolicyScopesEditor: () => null }));
jest.mock("./policy-version-history", () => ({ PolicyVersionHistory: () => null }));
jest.mock("./policy-rules-fields", () => ({ PolicyRulesFields: () => null }));

const draftPolicy: HrPolicy = {
  id: 3,
  orgId: "org-1",
  policyType: "leave",
  name: "QA Leave 1013",
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
  scopes: [{ id: 1, orgId: "org-1", policyId: 3, scopeType: "organization", scopeValue: "" }],
};

function renderSheet() {
  return render(<PolicyUpsertSheet open onOpenChange={jest.fn()} policy={draftPolicy} />);
}

describe("policy edit sheet save feedback (HR-U-020)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the sheet open and says why a save was refused when the reason is on a field it does not show", async () => {
    updateOutcome = {
      kind: "error",
      error: new ApiError("Validation failed.", 400, "VALIDATION_FAILED", [
        { path: "accrualRate", message: "Accrual rate must be at most 30." },
      ]),
    };
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save: Accrual rate must be at most 30.");
    expect(screen.getByDisplayValue("QA Leave 1013")).toBeInTheDocument();
  });

  it("BE-19: sends the timestamp the draft was read at, and shows the stale-save refusal inside the sheet", async () => {
    mockUpdateInputs.length = 0;
    updateOutcome = {
      kind: "error",
      error: new ApiError(
        "This policy was changed since you opened it. Reload to see the latest, then save again.",
        409,
        "VERSION_CONFLICT",
      ),
    };
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This policy was changed since you opened it.");
    expect(mockUpdateInputs[0]).toMatchObject({ policyId: 3, expectedUpdatedAt: "2026-10-01T00:00:00.000Z" });
  });

  it("confirms a saved draft by its version", async () => {
    updateOutcome = { kind: "success" };
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Policy saved as draft v1"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
