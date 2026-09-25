import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Form } from "@/components/ui/form";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { DEFAULT_INVITE_ROLE } from "@/lib/constants/user-invite-roles";
import { StepEmployment } from "./step-employment";

let secondaryCap = 0;

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/hooks/api/hr/reporting-manager-policy", () => ({
  useReportingManagerPolicy: () => ({ data: { maxSecondaryManagersPerEmployee: secondaryCap } }),
}));
jest.mock("@/components/hr/reporting-lines/policy-missing-banner", () => ({ PolicyMissingBanner: () => null }));
jest.mock("@/components/hr/department-combobox", () => ({
  DepartmentCombobox: () => <div data-testid="department-combobox" />,
}));

const MANAGERS: Record<string, { userId: string; name: string; email: null; designation: string; state: "active" }> = {
  "user-manager": { userId: "user-manager", name: "Maya Manager", email: null, designation: "Lead", state: "active" },
  "user-other": { userId: "user-other", name: "Omar Other", email: null, designation: "Architect", state: "active" },
};

jest.mock("@/components/hr/reporting-lines/manager-candidate-picker", () => ({
  describeManager: (ref: { designation: string | null }) => ref.designation ?? "",
  ManagerCandidatePicker: ({
    id,
    onChange,
    disabled,
  }: {
    id?: string;
    onChange: (userId: string | null, ref: unknown) => void;
    disabled?: boolean;
  }) => (
    <span>
      <button type="button" id={id} role="combobox" disabled={disabled} onClick={() => onChange("user-manager", MANAGERS["user-manager"])}>
        pick maya
      </button>
      <button type="button" disabled={disabled} onClick={() => onChange("user-other", MANAGERS["user-other"])}>
        pick omar
      </button>
    </span>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;
type Validity = "unknown" | "valid" | "invalid";

function Harness() {
  const [validity, setValidity] = useState<Validity>("unknown");
  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema),
    defaultValues: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+919876543210",
      whatsappSameAsPhone: true,
      gender: "FEMALE",
      dateOfBirth: new Date("1990-01-01"),
      joiningDate: new Date("2026-10-01"),
      designation: "Engineer",
      departmentId: "dept-1",
      role: DEFAULT_INVITE_ROLE,
      employeeId: "",
      topLevelRole: false,
      secondaryManagers: [],
    },
  });
  async function handleValidate() {
    const ok = await form.trigger(["reportingManagerUserId", "topLevelRole", "topLevelRoleReason", "secondaryManagers"]);
    setValidity(ok ? "valid" : "invalid");
  }
  return (
    <Form {...form}>
      <StepEmployment form={form} departments={[]} />
      <button type="button" onClick={handleValidate}>
        validate
      </button>
      <output data-testid="validity">{validity}</output>
    </Form>
  );
}

async function expectValidity(expected: Validity) {
  fireEvent.click(screen.getByText("validate"));
  await waitFor(() => expect(screen.getByTestId("validity")).toHaveTextContent(expected));
}

beforeEach(() => {
  secondaryCap = 0;
});

describe("Job Details — primary reporting manager (HRM-15 D2)", () => {
  it("lets onboarding proceed without a manager and says the policy will assign one", async () => {
    render(<Harness />);
    expect(screen.getByText("Assigned automatically by policy if left blank.")).toBeInTheDocument();
    await expectValidity("valid");
  });

  it("labels the picker with its field label and shows the chosen manager's designation and status", () => {
    render(<Harness />);
    const picker = screen.getByRole("combobox", { name: "Primary reporting manager" });
    fireEvent.click(picker);
    expect(screen.getByText(/Maya Manager · Lead\. Approves this employee's leave/)).toBeInTheDocument();
  });
});

describe("Job Details — top-level toggle (HRM-15 D3)", () => {
  it("disables and clears the manager, and requires a reason", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox", { name: "Primary reporting manager" }));

    fireEvent.click(screen.getByLabelText("Top-level role — no reporting manager"));

    expect(screen.getByRole("combobox", { name: "Primary reporting manager" })).toBeDisabled();
    // The disabled picker no longer promises a policy assignment.
    expect(screen.getByText("Not used for a top-level role: this person reports to nobody.")).toBeInTheDocument();
    expect(screen.queryByText("Assigned automatically by policy if left blank.")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Founder and chief executive")).toHaveAttribute("aria-required", "true");
    await expectValidity("invalid");
    expect(screen.getByText("Explain why this role has no reporting manager.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("e.g. Founder and chief executive"), { target: { value: "Founder" } });
    await expectValidity("valid");
  });

  it("re-enables the manager when the toggle is cleared", () => {
    render(<Harness />);
    const toggle = screen.getByLabelText("Top-level role — no reporting manager");
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.getByRole("combobox", { name: "Primary reporting manager" })).toBeEnabled();
    expect(screen.queryByPlaceholderText("e.g. Founder and chief executive")).not.toBeInTheDocument();
  });
});

describe("Job Details — additional managers up to the org cap", () => {
  it("offers none when the cap is 0", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: "Add additional manager" })).not.toBeInTheDocument();
  });

  it("adds rows up to the cap, then stops offering more", () => {
    secondaryCap = 2;
    render(<Harness />);
    const add = () => fireEvent.click(screen.getByRole("button", { name: "Add additional manager" }));
    add();
    add();
    expect(screen.getByText("Additional manager 2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add additional manager" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove additional manager 2" }));
    expect(screen.getByRole("button", { name: "Add additional manager" })).toBeInTheDocument();
  });

  it("refuses an additional manager who is already the primary", async () => {
    secondaryCap = 1;
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox", { name: "Primary reporting manager" }));
    fireEvent.click(screen.getByRole("button", { name: "Add additional manager" }));
    fireEvent.click(screen.getAllByRole("combobox")[1] as HTMLElement);

    await expectValidity("invalid");
    expect(screen.getByText("Already the primary reporting manager.")).toBeInTheDocument();
  });
});
