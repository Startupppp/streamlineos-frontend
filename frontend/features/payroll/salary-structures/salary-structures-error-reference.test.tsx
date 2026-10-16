import { render, screen, within } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";

const templates = jest.fn();
const refetch = jest.fn();
const idleMutation: {
  mutate: jest.Mock;
  mutateAsync: jest.Mock;
  reset: jest.Mock;
  isPending: boolean;
  error: ApiError | null;
} = { mutate: jest.fn(), mutateAsync: jest.fn(), reset: jest.fn(), isPending: false, error: null };
const createMutation = jest.fn(() => idleMutation);
const sheetProps = jest.fn();

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/hooks/api/hr/salary-structures", () => ({
  useSalaryStructureTemplates: () => templates(),
  useCreateSalaryTemplate: () => createMutation(),
  useUpdateSalaryTemplate: () => idleMutation,
  useDeleteSalaryTemplate: () => idleMutation,
}));

const allowed = { permission: "hr:salary:view", allowed: true, denied: false, pending: false, unavailable: false };
const gate = jest.fn(() => allowed);
const refetchAccess = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => gate(),
  useAccess: () => ({ refetch: refetchAccess }),
}));

jest.mock("@/features/payroll/salary-structures/salary-structure-template-sheet", () => ({
  SalaryStructureTemplateSheet: (props: { nameError?: string }) => {
    sheetProps(props);
    return null;
  },
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  Trash2Icon: () => null,
}));

import { SalaryStructuresPageContent } from "./salary-structures-page";

beforeEach(() => {
  jest.clearAllMocks();
  createMutation.mockReturnValue(idleMutation);
  gate.mockReturnValue(allowed);
  templates.mockReturnValue({
    data: { data: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B2-028 a failed salary-template read is quotable to support", () => {
  it("still shows the honest empty state with its CTA when there genuinely are no templates", () => {
    render(<SalaryStructuresPageContent />);

    expect(screen.getByText(/no salary structure templates yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders the failed call's request id under the message instead of swallowing it", () => {
    templates.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, "INTERNAL", {
        correlationId: "req_1de904",
      }),
      refetch,
    });
    render(<SalaryStructuresPageContent />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("req_1de904")).toBeInTheDocument();
    expect(screen.queryByText(/no salary structure templates yet/i)).toBeNull();
  });
});

function template(overrides: Partial<{ id: number; name: string; isActive: boolean }>) {
  return {
    id: 1,
    name: "Standard",
    basicSalary: "50000",
    hraPercent: "40",
    specialAllowance: "0",
    medicalAllowance: "0",
    travelAllowance: "0",
    otherAllowances: "0",
    pfDeductionPercent: "12",
    professionalTax: "200",
    effectiveFrom: "2026-11-01",
    effectiveTo: null,
    isActive: true,
    ...overrides,
  };
}

describe("UX-R2-11 the template card names the action it performs", () => {
  it("labels the soft-delete control Deactivate on an active template, and offers no Delete", () => {
    templates.mockReturnValue({ data: { data: [template({})] }, isLoading: false, isError: false, error: null, refetch });
    render(<SalaryStructuresPageContent />);

    expect(screen.getByRole("button", { name: /deactivate/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).toBeNull();
  });

  it("offers no Deactivate on a template that is already inactive", () => {
    templates.mockReturnValue({
      data: { data: [template({ id: 2, name: "Old", isActive: false })] },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<SalaryStructuresPageContent />);

    const card = screen.getByText("Old").closest("div.rounded-xl");
    if (!(card instanceof HTMLElement)) throw new Error("template card not rendered");
    expect(within(card).queryByRole("button", { name: /deactivate/i })).toBeNull();
    expect(within(card).getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });
});

describe("PAY-B-010 a duplicate template name is reported on the name field", () => {
  it("passes the 409 message to the sheet as the name error", () => {
    createMutation.mockReturnValue({
      ...idleMutation,
      error: new ApiError("A salary template with this name already exists", 409, "CONFLICT"),
    });
    render(<SalaryStructuresPageContent />);

    expect(sheetProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ nameError: "A salary template with this name already exists" }),
    );
  });

  it("passes no name error for a non-conflict failure", () => {
    createMutation.mockReturnValue({ ...idleMutation, error: new ApiError("boom", 500, "INTERNAL") });
    render(<SalaryStructuresPageContent />);

    expect(sheetProps).toHaveBeenLastCalledWith(expect.objectContaining({ nameError: undefined }));
  });
});

describe("BUG-022 salary structures never claim emptiness before access is known", () => {
  const disabledRead = { data: undefined, isLoading: false, isError: false, error: null, refetch };

  it("shows the loading shell, not the empty state, while access resolves", () => {
    gate.mockReturnValue({ ...allowed, allowed: false, pending: true });
    templates.mockReturnValue(disabledRead);
    render(<SalaryStructuresPageContent />);
    expect(screen.queryByText(/no salary structure templates yet/i)).toBeNull();
  });

  it("a failed access read is an error with a retry that re-reads access", () => {
    gate.mockReturnValue({ ...allowed, allowed: false, unavailable: true });
    templates.mockReturnValue(disabledRead);
    render(<SalaryStructuresPageContent />);
    expect(screen.queryByText(/no salary structure templates yet/i)).toBeNull();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetchAccess).toHaveBeenCalled();
  });

  it("a denied reader sees a permission state, not an empty catalogue", () => {
    gate.mockReturnValue({ ...allowed, allowed: false, denied: true });
    templates.mockReturnValue(disabledRead);
    render(<SalaryStructuresPageContent />);
    expect(screen.queryByText(/no salary structure templates yet/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /add template/i })).toBeNull();
  });
});
