import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Form } from "@/components/ui/form";
import { onboardEmployeeInputSchema, REPORTS_TO_REQUIRED_MESSAGE } from "@/lib/validation/hr";
import { DEFAULT_INVITE_ROLE } from "@/lib/constants/user-invite-roles";
import { StepEmployment } from "./step-employment";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/components/hr/department-combobox", () => ({
  DepartmentCombobox: () => <div data-testid="department-combobox" />,
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ onChange, disabled }: { onChange: (value: string) => void; disabled?: boolean }) => (
    <button type="button" data-testid="reporting-manager-combobox" disabled={disabled} onClick={() => onChange("user-manager")}>
      pick manager
    </button>
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
    },
  });
  async function handleValidate() {
    const ok = await form.trigger(["reportingManagerUserId", "topLevelRole", "topLevelRoleReason"]);
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

describe("the Job Details step gates onboarding on a reporting manager", () => {
  it("refuses to proceed without a manager unless the role is top-level", async () => {
    render(<Harness />);

    await expectValidity("invalid");
    expect(screen.getByText(REPORTS_TO_REQUIRED_MESSAGE)).toBeInTheDocument();
  });

  it("accepts a chosen manager", async () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId("reporting-manager-combobox"));

    await expectValidity("valid");
  });

  it("requires a reason for the top-level exception and disables the manager picker", async () => {
    render(<Harness />);

    fireEvent.click(screen.getByLabelText("Top-level role — no reporting manager"));

    expect(screen.getByTestId("reporting-manager-combobox")).toBeDisabled();
    await expectValidity("invalid");
    expect(screen.getByText("Explain why this role has no reporting manager.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("e.g. Founder and chief executive"), { target: { value: "Founder" } });

    await expectValidity("valid");
  });
});
