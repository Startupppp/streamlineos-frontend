import { render, screen } from "@testing-library/react";
import { ExpensesWidget } from "./expenses-widget";

const mockUseExpensePageData = jest.fn();
const mockUseCan = jest.fn();
const mockUseModuleEnabled = jest.fn();

jest.mock("@/hooks/api/hr", () => ({
  useExpensePageData: (...args: unknown[]) => mockUseExpensePageData(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
  useModuleEnabled: (key: string) => mockUseModuleEnabled(key),
}));

jest.mock("next/dynamic", () => (fn: () => Promise<{ default: React.ComponentType }>) => {
  const DynamicComponent = () => null;
  DynamicComponent.displayName = "DynamicComponent";
  return DynamicComponent;
});

import React from "react";

const DEFAULT_DATA = {
  expenses: [],
  stats: { pendingCount: 0, pendingAmount: 0 },
  isAdmin: false,
  total: 0,
  page: 1,
  pageSize: 5,
  hasMore: false,
};

describe("ExpensesWidget — selfService must mirror the HRMS expenses page", () => {
  beforeEach(() => {
    mockUseModuleEnabled.mockImplementation((key: string) => key === "hr");
    mockUseCan.mockReturnValue(true);
    mockUseExpensePageData.mockReturnValue({
      data: DEFAULT_DATA,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("passes selfService:true when the user cannot approve expenses so accounting module is not required for the query to fire", () => {
    mockUseCan.mockImplementation((key: string) => key !== "hr:expenses:approve");
    render(<ExpensesWidget />);
    const [, options] = mockUseExpensePageData.mock.calls[0] as [unknown, { selfService?: boolean }];
    expect(options.selfService).toBe(true);
  });

  it("passes selfService:false when the user can approve expenses so the approver sees org-level data", () => {
    mockUseCan.mockImplementation(() => true);
    render(<ExpensesWidget />);
    const [, options] = mockUseExpensePageData.mock.calls[0] as [unknown, { selfService?: boolean }];
    expect(options.selfService).toBe(false);
  });
});
