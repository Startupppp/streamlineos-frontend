"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseAccess = jest.fn();
const mockUseCan = jest.fn();
const mockUseEmployeeEmployment = jest.fn();
const mockUseEmployeeSensitive = jest.fn();

const accessLoading = { data: undefined, isLoading: true };

const accessGranted = {
  data: { isOrgOwner: false, scopes: { "hr:sensitive:view": "all" }, modules: {} },
  isLoading: false,
};

const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

const fakeEmployment = {
  id: 42,
  employeeId: "EMP001",
  startDate: "2023-01-01",
  status: "active",
};

function loadedEmployment() {
  return {
    data: fakeEmployment,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function loadedSensitive() {
  return {
    data: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function loadingQuery() {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/hr/employees", () => ({
  useEmployeeEmployment: () => mockUseEmployeeEmployment(),
  useEmployeeSensitive: () => mockUseEmployeeSensitive(),
  useUpdateSensitive: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
  FormField: ({ render: renderFn }: { render: (p: { field: object }) => ReactNode }) =>
    renderFn({ field: { value: "", onChange: jest.fn(), onBlur: jest.fn() } }),
  FormItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormMessage: () => null,
}));

jest.mock("react-hook-form", () => ({
  useForm: () => ({
    handleSubmit: (fn: (v: object) => void) => (e?: { preventDefault?: () => void }) => {
      e?.preventDefault?.();
      fn({});
    },
    reset: jest.fn(),
    control: {},
    formState: { errors: {} },
  }),
  Controller: ({ render: renderFn }: { render: (p: { field: object }) => ReactNode }) =>
    renderFn({ field: { value: "", onChange: jest.fn(), onBlur: jest.fn() } }),
}));

jest.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => () => ({ values: {}, errors: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  EyeIcon: () => null,
  EyeOffIcon: () => null,
}));

import { EmployeeSensitiveTab } from "./sensitive-tab";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockUseCan.mockReturnValue(false);
  mockUseEmployeeEmployment.mockReturnValue(loadedEmployment());
  mockUseEmployeeSensitive.mockReturnValue(loadedSensitive());
});

describe("EmployeeSensitiveTab — access is three-valued, not a boolean", () => {
  it("does not claim denial while the access snapshot is still in flight", () => {
    mockUseAccess.mockReturnValue(accessLoading);
    mockUseEmployeeEmployment.mockReturnValue(loadingQuery());
    mockUseEmployeeSensitive.mockReturnValue(loadingQuery());

    render(<EmployeeSensitiveTab userId="u1" />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });

  it("shows Access Restricted once hr:sensitive:view has actually said no", () => {
    mockUseAccess.mockReturnValue(accessDenied);

    render(<EmployeeSensitiveTab userId="u1" />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders the sensitive fields when access is granted", () => {
    render(<EmployeeSensitiveTab userId="u1" />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.getByText(/sensitive information/i)).toBeInTheDocument();
  });

  it("hides the Edit button when hr:sensitive:manage is not granted", () => {
    render(<EmployeeSensitiveTab userId="u1" />);

    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("shows the Edit button when hr:sensitive:manage is granted", () => {
    mockUseCan.mockImplementation((key: string) => key === "hr:sensitive:manage");

    render(<EmployeeSensitiveTab userId="u1" />);

    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });
});

/**
 * V-134 / V-136. The encryption + audited-access sentence and the statutory
 * guidance are already in the component, but nothing asserted them, so all of
 * it could be deleted with every suite still green. These pin the promises the
 * screen makes to whoever opens someone else's salary and Aadhaar.
 */
describe("EmployeeSensitiveTab — what the screen promises the viewer", () => {
  const populatedSensitive = {
    data: {
      salaryAmountCents: 9000000,
      salaryCurrency: "INR",
      salaryFrequency: "monthly",
      bankDetails: {
        accountNumber: "123456789012",
        bankName: "Example Bank",
        ifsc: "EXMP0001234",
        pfUanNumber: "100200300400",
        esiIpNumber: "3100000000",
      },
      taxId: null,
      panNumber: "ABCDE1234F",
      passportNumber: null,
      nationalId: null,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };

  it("keeps the encryption and audit notice when every sensitive field is empty", () => {
    render(<EmployeeSensitiveTab userId="u1" />);

    expect(screen.getByText(/encrypted at rest/i)).toBeInTheDocument();
    expect(
      screen.getByText(/recorded against your account, with your IP address and the time/i),
    ).toBeInTheDocument();
  });

  it("keeps the same notice once values exist", () => {
    mockUseEmployeeSensitive.mockReturnValue(populatedSensitive);

    render(<EmployeeSensitiveTab userId="u1" />);

    expect(screen.getByText(/encrypted at rest/i)).toBeInTheDocument();
    expect(
      screen.getByText(/recorded against your account, with your IP address and the time/i),
    ).toBeInTheDocument();
  });

  it("explains when PF and ESI apply next to their fields", () => {
    render(<EmployeeSensitiveTab userId="u1" />);

    expect(
      screen.getByText(/Universal Account Number from EPFO/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/It follows them between employers/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Insured Person number from ESIC/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Required only where ESI applies/i)).toBeInTheDocument();
  });

  it("links the statutory fields to the compliance pack", () => {
    render(<EmployeeSensitiveTab userId="u1" />);

    expect(
      screen.getByText(/PF, ESI and TDS obligations depend on where this employee works/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /review statutory requirements/i }),
    ).toHaveAttribute("href", "/hr/compliance");
  });
});
