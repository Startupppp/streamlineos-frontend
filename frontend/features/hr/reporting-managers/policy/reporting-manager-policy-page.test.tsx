import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReportingManagerPolicy } from "@/hooks/api/hr/reporting-lines-schema";
import { ApiError } from "@/lib/api-envelope";
import { ReportingManagerPolicyPage } from "./reporting-manager-policy-page";
import { policyPatch, policyToFormValues, reportingManagerPolicyFormSchema } from "./reporting-manager-policy-schema";

const POLICY: ReportingManagerPolicy = {
  maxSecondaryManagersPerEmployee: 0,
  defaultPrimaryManager: { userId: "u-dana", name: "Dana Default", email: null, designation: "HR Lead", state: "active" },
  defaultPrimaryManagerEligible: true,
  fallbackOrder: "CONFIGURED_MANAGER_THEN_UPLOADER",
  requireReasonAfterChanges: 3,
  allowTopLevelWithoutManager: true,
  version: 4,
  updatedAt: "2026-09-20T10:00:00Z",
  isConfigured: true,
  actorQualifiesAsFallback: true,
};

const mutate = jest.fn();
const refetch = jest.fn();
const can = jest.fn();

jest.mock("@/hooks/api/hr/reporting-manager-policy", () => ({
  useReportingManagerPolicy: () => ({ data: POLICY, isLoading: false, isError: false, error: null, refetch }),
  useUpdateReportingManagerPolicy: () => ({ mutate, isPending: false }),
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => can(key) }));
jest.mock("@/components/hr/reporting-lines/policy-missing-banner", () => ({ PolicyMissingBanner: () => null }));
jest.mock("@/components/hr/reporting-lines/manager-candidate-picker", () => ({
  ManagerCandidatePicker: ({ selected, id }: { selected: { name: string } | null; id?: string }) => (
    <button type="button" role="combobox" id={id}>{selected?.name ?? "Choose"}</button>
  ),
  describeManager: () => "HR Lead · Active",
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  mutate.mockReset();
  refetch.mockReset();
  can.mockReset();
});

describe("policy form schema and patch", () => {
  it("bounds the change threshold to 1..10", () => {
    const base = policyToFormValues(POLICY);
    expect(reportingManagerPolicyFormSchema.safeParse({ ...base, requireReasonAfterChanges: 0 }).success).toBe(false);
    expect(reportingManagerPolicyFormSchema.safeParse({ ...base, requireReasonAfterChanges: 11 }).success).toBe(false);
    expect(reportingManagerPolicyFormSchema.safeParse({ ...base, requireReasonAfterChanges: 10 }).success).toBe(true);
  });

  it("sends only changed fields, pinned to the loaded version", () => {
    const values = { ...policyToFormValues(POLICY), maxSecondaryManagersPerEmployee: 2, defaultPrimaryManagerUserId: null };
    expect(policyPatch(POLICY, values)).toEqual({
      expectedVersion: 4,
      maxSecondaryManagersPerEmployee: 2,
      defaultPrimaryManagerUserId: null,
    });
  });
});

describe("ReportingManagerPolicyPage", () => {
  it("is read-only without the override permission", () => {
    can.mockReturnValue(false);
    render(<ReportingManagerPolicyPage />);
    expect(screen.getByText(/Changing it needs an HR or org admin/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save policy" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("saves a change for an admin with override", async () => {
    can.mockImplementation((key: string) => key === "hr:reporting-lines:override");
    const user = userEvent.setup();
    render(<ReportingManagerPolicyPage />);

    expect(screen.getByRole("combobox", { name: "Default reporting manager" })).toHaveTextContent("Dana Default");
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Save policy" }));

    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0]?.[0]).toEqual({ expectedVersion: 4, allowTopLevelWithoutManager: false });
  });

  it("reloads the policy on a version conflict", async () => {
    can.mockImplementation((key: string) => key === "hr:reporting-lines:override");
    mutate.mockImplementation((_input: unknown, handlers: { onError: (error: unknown) => void }) =>
      handlers.onError(new ApiError("stale", 409, "CONFLICT")),
    );
    const user = userEvent.setup();
    render(<ReportingManagerPolicyPage />);
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("button", { name: "Save policy" }));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });
});
