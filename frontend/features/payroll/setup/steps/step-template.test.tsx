import { fireEvent, render, screen } from "@testing-library/react";
import { StepTemplate } from "./step-template";

const mockUsePayrollTemplates = jest.fn();

jest.mock("@/hooks/api/payroll", () => ({
  usePayrollTemplates: (...args: unknown[]) => mockUsePayrollTemplates(...args),
}));

jest.mock("@/features/payroll/shared", () => ({
  TemplateCard: ({
    template,
    selected,
    onSelect,
    actions,
  }: {
    template: { id: number; name: string };
    selected: boolean;
    onSelect: () => void;
    actions: React.ReactNode;
  }) => (
    <div>
      <button type="button" aria-pressed={selected} onClick={onSelect}>
        {template.name}
      </button>
      {actions}
    </div>
  ),
}));

jest.mock("@/features/payroll/setup/components/template-preview-sheet", () => ({
  TemplatePreviewSheet: () => null,
}));
jest.mock("@/features/payroll/setup/components/template-duplicate-dialog", () => ({
  TemplateDuplicateDialog: () => null,
}));
jest.mock("@/features/payroll/setup/nav-buttons", () => ({
  NavButtons: ({ onNext }: { onNext?: () => void }) => (
    <button type="button" onClick={onNext}>Continue</button>
  ),
}));

const india = { id: 1, key: "india", name: "India", defaultToggles: {} };
const global = { id: 2, key: "global", name: "Global", defaultToggles: {} };

function query(items: typeof india[]) {
  return { data: { items }, isLoading: false, isError: false, refetch: jest.fn() };
}

describe("StepTemplate derived selection", () => {
  it("selects a preselected key when its async query result arrives", () => {
    mockUsePayrollTemplates.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });
    const props = {
      draft: {},
      updateDraft: jest.fn(),
      goNext: jest.fn(),
      goBack: jest.fn(),
      preselectedKey: "global",
    };
    const { rerender } = render(<StepTemplate {...props} />);

    mockUsePayrollTemplates.mockReturnValue(query([india, global]));
    rerender(<StepTemplate {...props} />);

    expect(screen.getByRole("button", { name: "Global" })).toHaveAttribute("aria-pressed", "true");
  });

  it("lets an explicit user choice supersede a preselection", () => {
    mockUsePayrollTemplates.mockReturnValue(query([india, global]));
    render(
      <StepTemplate
        draft={{}}
        updateDraft={jest.fn()}
        goNext={jest.fn()}
        goBack={jest.fn()}
        preselectedKey="global"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "India" }));
    expect(screen.getByRole("button", { name: "India" })).toHaveAttribute("aria-pressed", "true");
  });
});
