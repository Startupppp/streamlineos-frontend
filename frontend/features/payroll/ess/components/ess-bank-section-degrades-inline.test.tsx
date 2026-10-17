import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

const bank = jest.fn();
const refetch = jest.fn();

jest.mock("@/hooks/api/payroll/ess", () => ({
  useEssBank: () => bank(),
  useUpdateBank: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import { EssBankSection } from "./ess-bank-section";

function failing(status: number) {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", status),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  bank.mockReturnValue({
    data: { hasBank: false, masked: null },
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B3-007 a failing bank read does not claim the employee has no account on file", () => {
  it("renders the masked account on a healthy session, so the failure cases below are not passing on a panel that never mounts", () => {
    bank.mockReturnValue({
      data: {
        hasBank: true,
        masked: { accountNumber: "••••1234", accountHolder: "A Person", bankName: "Bank", bankCountry: "IN", ifsc: null, branch: null },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    render(<EssBankSection hideToolbar />);

    expect(screen.getByText(/account number/i)).toBeInTheDocument();
  });

  it("opts the bank read out of the route boundary, so a 500 degrades this panel instead of blanking /me/pay", () => {
    const source = readFileSync(join(process.cwd(), "hooks/api/payroll/ess.ts"), "utf8");
    const declaration = source.slice(source.indexOf("export function useEssBank"));
    const body = declaration.slice(0, declaration.indexOf("\n}\n"));

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(body).toContain("...INLINE_READ_ERROR,");
  });

  it("shows an inline error with retry when the bank read 500s", () => {
    bank.mockReturnValue(failing(500));
    render(<EssBankSection hideToolbar />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("does not claim there are no bank details on file when the read failed", () => {
    bank.mockReturnValue(failing(500));
    render(<EssBankSection hideToolbar />);

    expect(screen.queryByText(/no bank details on file/i)).toBeNull();
  });

  it("offers no Add Bank Details next step while the panel is erroring, because retry is the action then", () => {
    bank.mockReturnValue(failing(500));
    render(<EssBankSection />);

    expect(screen.queryByRole("button", { name: /add bank details/i })).toBeNull();
  });

  it("retries the failed read on this panel rather than reloading the route", () => {
    bank.mockReturnValue(failing(500));
    render(<EssBankSection hideToolbar />);
    screen.getByRole("button", { name: /try again/i }).click();

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("still shows the honest empty state with its CTA when the employee genuinely has no account recorded", () => {
    render(<EssBankSection />);

    expect(screen.getByText(/no bank details on file/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add bank details/i })).toBeInTheDocument();
  });
});
