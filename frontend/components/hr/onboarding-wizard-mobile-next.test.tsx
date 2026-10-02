import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const admissionCheck = jest.fn();

jest.mock("@/components/hr/check-employee-email", () => {
  const actual = jest.requireActual("@/components/hr/check-employee-email");
  return {
    ...actual,
    fetchEmployeeAdmissionCheck: (email: string) => admissionCheck(email),
  };
});

const onboardMutate = jest.fn();
jest.mock("@/hooks/api/hr", () => ({
  useOnboardEmployee: () => ({ mutate: onboardMutate, isPending: false }),
}));
jest.mock("@/hooks/api/hr/onboarding", () => ({
  useOnboardingTemplateDepartments: () => ({ data: [] }),
}));
jest.mock("@/hooks/api/org-hierarchy", () => ({
  useOrgLocations: () => ({ data: { data: [] } }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: (message: string) => toastError(message),
  },
}));

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";

const MOBILE_WIDTH = 390;

function atMobileWidth() {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: MOBILE_WIDTH,
  });
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => {
  atMobileWidth();
  admissionCheck.mockReset();
  onboardMutate.mockReset();
  toastError.mockReset();
});

describe("Flow 1 at 390 — Next must be reachable and blocked by validation, never silently dead (tip C-002)", () => {
  it("keeps Next enabled and shows a field-level error for every missing required Personal field", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    const next = screen.getByRole("button", { name: /Next/ });
    expect(next).toBeEnabled();

    await user.click(next);

    await waitFor(() => {
      expect(screen.getByText("First name is required")).toBeInTheDocument();
    });
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Designation/)).not.toBeInTheDocument();
    expect(admissionCheck).not.toHaveBeenCalled();
  });

  it("does not advance to Job Details while a required field is still missing", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.type(screen.getByLabelText(/First Name/), "Ada");
    await user.click(screen.getByRole("button", { name: /Next/ }));

    await waitFor(() => {
      expect(screen.getByText("Last name is required")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/Designation/)).not.toBeInTheDocument();
  });

  it("checks the work email for a duplicate only once the fields pass, and blocks on a duplicate", async () => {
    admissionCheck.mockResolvedValue({ status: "ALREADY_EMPLOYEE" });
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.type(screen.getByLabelText(/First Name/), "Ada");
    await user.type(screen.getByLabelText(/Last Name/), "Lovelace");
    await user.type(screen.getByLabelText(/^Email/), "ada@example.test");
    await user.click(screen.getByRole("button", { name: /Next/ }));

    await waitFor(() => expect(admissionCheck).toHaveBeenCalledWith("ada@example.test"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Designation/)).not.toBeInTheDocument();
    expect(onboardMutate).not.toHaveBeenCalled();
  });
});
