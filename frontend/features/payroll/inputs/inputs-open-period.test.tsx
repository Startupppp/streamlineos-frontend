import { fireEvent, render, screen } from "@testing-library/react";

const create = jest.fn();

jest.mock("@/hooks/api/payroll/payroll-inputs", () => ({
  usePayrollInputPeriods: () => ({
    data: { data: [] },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreatePayrollInputPeriod: () => ({ mutate: create, isPending: false }),
  useBuildPayrollInputPeriod: () => ({ mutate: jest.fn(), isPending: false }),
  useLockPayrollInputPeriod: () => ({ mutate: jest.fn(), isPending: false }),
  useUnlockPayrollInputPeriod: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/features/payroll/inputs/inputs-section-tabs", () => ({
  InputsSectionTabs: () => null,
}));

jest.mock("@/features/payroll/inputs/create-adjustment-dialog", () => ({
  CreateAdjustmentDialog: () => null,
}));

import { InputsPageContent } from "./inputs-page-content";

describe("Open Period creates the selected input period", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-17T12:00:00Z"));
    create.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("posts the current month when Open Period is clicked", () => {
    render(<InputsPageContent />);

    fireEvent.click(screen.getAllByRole("button", { name: /open period/i })[0]);

    expect(create).toHaveBeenCalledWith({ periodKey: "2026-10" });
  });
});
