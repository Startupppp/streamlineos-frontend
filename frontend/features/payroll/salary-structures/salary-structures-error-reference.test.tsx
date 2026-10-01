import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";

const templates = jest.fn();
const refetch = jest.fn();
const idleMutation = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false };

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/hooks/api/hr/salary-structures", () => ({
  useSalaryStructureTemplates: () => templates(),
  useCreateSalaryTemplate: () => idleMutation,
  useUpdateSalaryTemplate: () => idleMutation,
  useDeleteSalaryTemplate: () => idleMutation,
}));

jest.mock("@/features/payroll/salary-structures/salary-structure-template-sheet", () => ({
  SalaryStructureTemplateSheet: () => null,
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
