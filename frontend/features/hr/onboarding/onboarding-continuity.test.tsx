import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/components/hr/check-employee-email", () => {
  const actual = jest.requireActual("@/components/hr/check-employee-email");
  return { ...actual, fetchEmployeeAdmissionCheck: jest.fn() };
});

jest.mock("@/hooks/api/hr", () => ({
  useOnboardEmployee: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/hr/onboarding", () => ({
  useOnboardingTemplateDepartments: () => ({ data: [] }),
  useMyOnboarding: () => myOnboardingState,
  useCompleteOnboardingTask: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/org-hierarchy", () => ({
  useOrgLocations: () => ({ data: { data: [] } }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    error: (message: string) => toastError(message),
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() }),
  useModuleEnabled: () => true,
  useCanState: () => "granted",
}));

jest.mock("@/hooks/api/use-page-state", () => {
  const { resolvePageState } = jest.requireActual<
    typeof import("@/lib/page-state/resolve-page-state")
  >("@/lib/page-state/resolve-page-state");
  return {
    usePageState: (
      options: Omit<Parameters<typeof resolvePageState>[0], "access">,
    ) => resolvePageState({ ...options, access: "granted" }),
  };
});

let myOnboardingState: {
  data: unknown[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
} = {
  data: [],
  isLoading: false,
  isError: false,
  error: undefined,
  refetch: jest.fn(),
};

import { OnboardingWizard } from "@/components/hr/onboarding-wizard";
import { MyOnboardingTasksPage } from "@/features/hr/onboarding/my-onboarding-tasks-page";

beforeEach(() => {
  toastError.mockClear();
  myOnboardingState = {
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  };
});

describe("HRMS-UX-013 — initiate validation says what is missing (C-003 class)", () => {
  it("Next on an empty first step names the blocking field instead of doing nothing", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    const message = String(toastError.mock.calls[0]?.[0] ?? "");
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toMatch(/^(error|invalid|failed)\.?$/i);
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
  });

  it("keeps the wizard's primary mobile actions at the 44px touch target", () => {
    const source = readFileSync("components/hr/onboarding-wizard.tsx", "utf8");
    const footer = source.slice(source.indexOf("onClick={handlePrev}"));
    expect(footer).toContain("min-h-11");
    expect(footer.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("HRMS-UX-013 — an employee with no tasks gets an honest empty", () => {
  it("renders the empty state and no error", async () => {
    render(<MyOnboardingTasksPage />);
    expect(
      await screen.findByText("No onboarding tasks yet"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a failed read is a failure, not an empty task list", async () => {
    myOnboardingState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("read failed"),
      refetch: jest.fn(),
    };
    render(<MyOnboardingTasksPage />);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText("No onboarding tasks yet")).not.toBeInTheDocument();
  });
});

describe("HRMS-UX-013 — a person's onboarding returns to the queue", () => {
  it("the detail page declares backHref /hr/onboarding", () => {
    const source = readFileSync(
      "features/hr/onboarding/onboarding-detail-page.tsx",
      "utf8",
    );
    expect(source).toContain('backHref="/hr/onboarding"');
  });
});
