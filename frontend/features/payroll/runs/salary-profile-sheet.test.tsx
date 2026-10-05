import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SalaryProfileSheet } from "./salary-profile-sheet";
import type { PayrollPerson } from "@/hooks/api/payroll/people-schema";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="Effective from" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

jest.mock("@/features/payroll/lib/payroll-workforce-label", () => ({
  usePayrollWorkforceLabel: () => ({ singular: "Employee", plural: "Employees", singularLower: "employee", pluralLower: "employees" }),
}));

jest.mock("@/hooks/api/payroll/policies", () => ({
  usePayrollPolicyCurrent: () => ({ data: { policy: { currency: "INR" }, taxRegimeApplicable: false, activeVersion: null } }),
}));

jest.mock("@/features/payroll/salary-structures/salary-breakup-preview", () => ({
  SalaryBreakupPreview: ({ annualCtc }: { annualCtc: string }) => <p>Breakup for {annualCtc}</p>,
}));

const mockCanState = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  ...jest.requireActual("@/hooks/api/access"),
  useCanState: (key: string) => mockCanState(key),
}));

const mockUsePayrollPeople = jest.fn();
jest.mock("@/hooks/api/payroll/people", () => ({
  usePayrollPeople: (...args: unknown[]) => mockUsePayrollPeople(...args),
}));

const createUser = jest.fn();
const createWorker = jest.fn();
const mockUseCreateProfile = jest.fn();
const mockUseCreateWorkerProfile = jest.fn();
jest.mock("@/hooks/api/payroll/employees", () => ({
  useCreateProfile: (id: string) => mockUseCreateProfile(id),
  useCreateWorkerProfile: (id: string) => mockUseCreateWorkerProfile(id),
  usePatchProfile: () => ({ mutate: jest.fn(), isPending: false }),
  usePatchWorkerProfile: () => ({ mutate: jest.fn(), isPending: false }),
}));

function person(overrides: Partial<PayrollPerson>): PayrollPerson {
  return {
    organizationPersonId: "op-1",
    displayName: "Asha Rao",
    email: "asha@example.com",
    employeeNumber: "E-001",
    payee: { kind: "user", userId: "u-asha" },
    hasSalaryProfile: false,
    eligibility: "eligible",
    ...overrides,
  };
}

const people: PayrollPerson[] = [
  person({}),
  person({ organizationPersonId: "op-2", displayName: "Ravi Contractor", email: null, employeeNumber: null, payee: { kind: "worker", workerId: "w-ravi" } }),
  person({ organizationPersonId: "op-3", displayName: "Meera Paid", payee: { kind: "user", userId: "u-meera" }, hasSalaryProfile: true, eligibility: "has-salary" }),
  person({ organizationPersonId: "op-4", displayName: "Kiran Unlinked", payee: null, eligibility: "needs-payee-link" }),
  person({ organizationPersonId: "op-5", displayName: "Dev Gone", payee: { kind: "user", userId: "u-dev" }, eligibility: "exited" }),
];

function result(overrides: Record<string, unknown> = {}) {
  return {
    data: { data: people, pagination: { limit: 50, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

function renderSheet() {
  return render(<SalaryProfileSheet open onClose={jest.fn()} />);
}

function rowButton(name: string) {
  return screen.getByRole("button", { name: new RegExp(name) });
}

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Effective from"), { target: { value: "2026-10-01" } });
  fireEvent.change(screen.getByPlaceholderText("e.g. 1200000.00"), { target: { value: "1200000" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePayrollPeople.mockReturnValue(result());
  mockCanState.mockReturnValue("granted");
  mockUseCreateProfile.mockReturnValue({ mutate: createUser, isPending: false });
  mockUseCreateWorkerProfile.mockReturnValue({ mutate: createWorker, isPending: false });
});

describe("SalaryProfileSheet person picker", () => {
  it("lists everyone, enabling only eligible rows and naming why the rest cannot be picked", () => {
    renderSheet();

    expect(rowButton("Asha Rao")).toBeEnabled();
    expect(rowButton("Ravi Contractor")).toBeEnabled();
    expect(rowButton("Meera Paid")).toBeDisabled();
    expect(rowButton("Meera Paid")).toHaveTextContent("Has salary");
    expect(rowButton("Kiran Unlinked")).toBeDisabled();
    expect(rowButton("Kiran Unlinked")).toHaveTextContent("Not payable yet");
    expect(rowButton("Dev Gone")).toBeDisabled();
    expect(rowButton("Dev Gone")).toHaveTextContent("Exited");
    expect(screen.getByText(/In Directory, open their Worker tab and mark them as payee, or invite them/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in Directory" })).toHaveAttribute("href", "/directory/op-4");
    expect(screen.getByRole("link", { name: "Open existing profile" })).toHaveAttribute("href", "/payroll/employees/u-meera");
    expect(rowButton("Asha Rao")).toHaveTextContent("asha@example.com · E-001");
  });

  it("keeps Create disabled until an eligible person is picked", () => {
    renderSheet();

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    fireEvent.click(rowButton("Asha Rao"));
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("routes a user payee to the employee profile create", async () => {
    renderSheet();
    fireEvent.click(rowButton("Asha Rao"));
    await fillAndSubmit();

    await waitFor(() => expect(createUser).toHaveBeenCalled());
    expect(mockUseCreateProfile).toHaveBeenLastCalledWith("u-asha");
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("routes a worker payee to the worker profile create", async () => {
    renderSheet();
    fireEvent.click(rowButton("Ravi Contractor"));
    await fillAndSubmit();

    await waitFor(() => expect(createWorker).toHaveBeenCalled());
    expect(mockUseCreateWorkerProfile).toHaveBeenLastCalledWith("w-ravi");
    expect(createUser).not.toHaveBeenCalled();
  });

  it("sends the search to the server only after the debounce", async () => {
    jest.useFakeTimers();
    try {
      renderSheet();
      fireEvent.change(screen.getByLabelText("Search employees"), { target: { value: "asha" } });
      expect(mockUsePayrollPeople).not.toHaveBeenCalledWith({ search: "asha" }, expect.anything());
      React.act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(mockUsePayrollPeople).toHaveBeenLastCalledWith({ search: "asha" }, { enabled: true });
    } finally {
      jest.useRealTimers();
    }
  });

  it("says the directory is empty and links to it", () => {
    mockUsePayrollPeople.mockReturnValue(result({ data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null } } }));
    renderSheet();

    expect(screen.getByText(/No one in your directory yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Directory" })).toHaveAttribute("href", "/directory");
  });

  it("says salary view access is missing rather than that the directory is empty", () => {
    mockCanState.mockImplementation((key: string) => (key === "payroll:salaries:view" ? "denied" : "granted"));
    mockUsePayrollPeople.mockReturnValue(result({ data: undefined }));
    renderSheet();

    expect(screen.queryByText(/No one in your directory yet/)).not.toBeInTheDocument();
    expect(screen.getByText(/needs access to view salaries/)).toBeInTheDocument();
  });

  it("shows an inline error with Retry", () => {
    const refetch = jest.fn();
    mockUsePayrollPeople.mockReturnValue(result({ data: undefined, isError: true, error: new Error("boom"), refetch }));
    renderSheet();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("hints to refine the search when the server has more", () => {
    mockUsePayrollPeople.mockReturnValue(result({ data: { data: people, pagination: { limit: 50, hasMore: true, nextCursor: "c" } } }));
    renderSheet();

    const list = screen.getByRole("list", { name: "Employees" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("Showing first 5 — refine search")).toBeInTheDocument();
  });

  it("offers the monthly breakup only once a person and a CTC are entered, collapsed until asked", () => {
    renderSheet();
    fireEvent.change(screen.getByPlaceholderText("e.g. 1200000.00"), { target: { value: "1200000" } });
    expect(screen.queryByRole("button", { name: "See monthly breakup" })).not.toBeInTheDocument();

    fireEvent.click(rowButton("Asha Rao"));
    expect(screen.queryByText("Breakup for 1200000")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "See monthly breakup" }));
    expect(screen.getByText("Breakup for 1200000")).toBeInTheDocument();
  });
});
