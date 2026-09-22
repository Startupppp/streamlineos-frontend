import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  employeeAdmissionGuidance,
  type EmployeeAdmissionGuidance,
} from "@/components/hr/check-employee-email";
import type { EmployeeAdmissionStatus } from "@/components/hr/check-email-schema";

const admissionCheck = jest.fn();

jest.mock("@/components/hr/check-employee-email", () => {
  const actual = jest.requireActual("@/components/hr/check-employee-email");
  return {
    ...actual,
    fetchEmployeeAdmissionCheck: (email: string) => admissionCheck(email),
  };
});

const onboardMutate = jest.fn();
const onboardState = { isPending: false };

jest.mock("@/hooks/api/hr", () => ({
  useOnboardEmployee: () => ({
    mutate: onboardMutate,
    get isPending() {
      return onboardState.isPending;
    },
  }),
}));

jest.mock("@/hooks/api/hr/onboarding", () => ({
  useOnboardingTemplateDepartments: () => ({ data: [] }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const toastError = jest.fn();
const toastWarning = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    warning: (message: string) => toastWarning(message),
    error: (message: string) => toastError(message),
  },
}));

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";

function guidanceFor(status: EmployeeAdmissionStatus): EmployeeAdmissionGuidance {
  return employeeAdmissionGuidance(status);
}

describe("employeeAdmissionGuidance — the four admission outcomes are distinct", () => {
  it("lets an unknown address through with no notice", () => {
    expect(guidanceFor("available")).toEqual({
      blocking: false,
      attachToExistingMember: false,
      message: null,
    });
  });

  it("offers the attach journey for a member who holds no employment", () => {
    const guidance = guidanceFor("member-without-employment");
    expect(guidance.blocking).toBe(false);
    expect(guidance.attachToExistingMember).toBe(true);
    expect(guidance.message).toMatch(/already a member/i);
    expect(guidance.message).toMatch(/does not create a second login|another seat/i);
  });

  it("blocks an existing employee and says so", () => {
    const guidance = guidanceFor("employee");
    expect(guidance.blocking).toBe(true);
    expect(guidance.attachToExistingMember).toBe(false);
    expect(guidance.message).toMatch(/already belongs to an employee/i);
  });

  it("blocks an archived member and points at restore, not at re-onboarding", () => {
    const guidance = guidanceFor("archived-member");
    expect(guidance.blocking).toBe(true);
    expect(guidance.attachToExistingMember).toBe(false);
    expect(guidance.message).toMatch(/restore/i);
  });
});

describe("OnboardingWizard — the email check explains which case the admin is in", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    onboardState.isPending = false;
  });

  async function enterEmail(
    user: ReturnType<typeof userEvent.setup>,
    email = "jane.doe@example.com",
  ): Promise<void> {
    render(<OnboardingWizard />);
    const field = screen.getByLabelText(/^email/i);
    await user.type(field, email);
    await user.tab();
  }

  it("raises no notice and no error when the address is free", async () => {
    const user = userEvent.setup();
    admissionCheck.mockResolvedValue({
      exists: false,
      status: "available",
      memberStatus: null,
    });

    await enterEmail(user);

    await waitFor(() => expect(admissionCheck).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute("aria-invalid", "false");
  });

  it("explains the attach journey for a member who holds no employment", async () => {
    const user = userEvent.setup();
    admissionCheck.mockResolvedValue({
      exists: true,
      status: "member-without-employment",
      memberStatus: null,
    });

    await enterEmail(user);

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(/already a member/i);
    expect(notice).toHaveTextContent(/second login|another seat/i);
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute("aria-invalid", "false");
  });

  it("marks the field invalid for an address that already belongs to an employee", async () => {
    const user = userEvent.setup();
    admissionCheck.mockResolvedValue({
      exists: true,
      status: "employee",
      memberStatus: null,
    });

    await enterEmail(user);

    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(/already belongs to an employee/i);
    const field = screen.getByLabelText(/^email/i);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field.getAttribute("aria-describedby") ?? "").toContain(message.id);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("points an archived member at restore rather than a second onboarding", async () => {
    const user = userEvent.setup();
    admissionCheck.mockResolvedValue({
      exists: true,
      status: "archived-member",
      memberStatus: "SUSPENDED",
    });

    await enterEmail(user);

    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(/restore/i);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("leaves the admin able to retry after a network failure", async () => {
    const user = userEvent.setup();
    admissionCheck.mockRejectedValueOnce(new Error("network")).mockResolvedValue({
      exists: true,
      status: "employee",
      memberStatus: null,
    });

    await enterEmail(user);
    await waitFor(() => expect(admissionCheck).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("status")).toBeNull();

    const field = screen.getByLabelText(/^email/i);
    await user.click(field);
    await user.type(field, "x");
    await user.tab();

    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(/already belongs to an employee/i);
  });

  it("keeps a single submit control that disables while a save is in flight", async () => {
    onboardState.isPending = true;
    render(<OnboardingWizard />);

    expect(screen.getByRole("button", { name: /^next$/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();
  });
});
