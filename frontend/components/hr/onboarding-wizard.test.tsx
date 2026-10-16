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
const onboardState: { isPending: boolean; error: Error | null } = { isPending: false, error: null };

jest.mock("@/hooks/api/hr", () => ({
  useOnboardEmployee: () => ({
    mutate: onboardMutate,
    get isPending() {
      return onboardState.isPending;
    },
    get isError() {
      return onboardState.error !== null;
    },
    get error() {
      return onboardState.error;
    },
  }),
}));

jest.mock("@/hooks/api/hr/onboarding", () => ({
  useOnboardingTemplateDepartments: () => ({ data: [] }),
}));

/** BUG-HRMS-006: the wizard reads the org's locations for the Job Details step. */
jest.mock("@/hooks/api/org-hierarchy", () => ({
  useOrgLocations: () => ({ data: { data: [] } }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1" }, orgId: "o1" },
    status: "authenticated",
  }),
}));

jest.mock("@/components/hr/_onboarding/wizard-draft", () => ({
  loadAdminWizardDraft: () => null,
  saveAdminWizardDraft: jest.fn(),
  clearAdminWizardDraft: jest.fn(),
  toAdminWizardDraft: (values: Record<string, unknown>, step: number) => ({ ...values, step }),
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

  it("blocks a member who holds no employment and directs to Users", () => {
    const guidance = guidanceFor("member-without-employment");
    expect(guidance.blocking).toBe(true);
    expect(guidance.attachToExistingMember).toBe(false);
    expect(guidance.message).toMatch(/belongs to a member/i);
    expect(guidance.message).toMatch(/users panel/i);
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
    onboardState.error = null;
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

  it("blocks a member without employment and directs to the Users panel", async () => {
    const user = userEvent.setup();
    admissionCheck.mockResolvedValue({
      exists: true,
      status: "member-without-employment",
      memberStatus: null,
    });

    await enterEmail(user);

    const message = await screen.findByRole("alert");
    expect(message).toHaveTextContent(/belongs to a member/i);
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("status")).toBeNull();
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

  it("BUG-011: a failed submit says why inline and keeps what was typed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<OnboardingWizard />);
    await user.type(screen.getByLabelText(/^first name/i), "Jane");

    onboardState.error = new Error("The service is temporarily unavailable. Please try again.");
    rerender(<OnboardingWizard />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      /temporarily unavailable.*entries are kept; submit again/i,
    );
    expect(screen.getByLabelText(/^first name/i)).toHaveValue("Jane");
  });
});
