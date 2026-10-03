import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Form } from "@/components/ui/form";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { DEFAULT_INVITE_ROLE } from "@/lib/constants/user-invite-roles";
import { STEP_FIELDS } from "@/components/hr/onboarding-wizard";
import { StepSkillsPay } from "./step-skills-pay";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useModuleEnabled: () => false,
}));

jest.mock("@/hooks/api/hr/salary-structures", () => ({
  useSalaryStructureTemplates: () => ({ data: undefined }),
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
      email: "ada@example.test",
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
      taxId: "",
      monthlySalary: undefined,
    },
  });
  async function handleValidate() {
    const ok = await form.trigger(STEP_FIELDS[3]);
    setValidity(ok ? "valid" : "invalid");
  }
  return (
    <Form {...form}>
      <StepSkillsPay form={form} />
      <button type="button" onClick={handleValidate}>
        validate
      </button>
      <output data-testid="validity">{validity}</output>
    </Form>
  );
}

function salaryInput(): HTMLInputElement {
  return screen.getByLabelText(/monthly salary/i) as HTMLInputElement;
}

describe("the Skills & Pay step's salary field", () => {
  it("starts with an empty salary field, never a Rs 25,000 default", () => {
    render(<Harness />);

    const input = salaryInput();
    expect(input.value).toBe("");
    // 25000 is a hint about the shape of the answer, not the answer.
    expect(input).toHaveAttribute("placeholder", "25000");
  });

  it("advances with the salary blank, because pay is not a hire blocker", async () => {
    render(<Harness />);

    expect(STEP_FIELDS[3]).toContain("monthlySalary");
    expect(screen.queryByText("*")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("validate"));
    await waitFor(() =>
      expect(screen.getByTestId("validity")).toHaveTextContent("valid"),
    );
    expect(screen.queryByText("Monthly salary is required")).not.toBeInTheDocument();
  });

  it("still checks the format of a salary that is filled in", async () => {
    render(<Harness />);

    fireEvent.change(salaryInput(), { target: { value: "99999999" } });
    fireEvent.click(screen.getByText("validate"));
    await waitFor(() =>
      expect(screen.getByTestId("validity")).toHaveTextContent("invalid"),
    );
    expect(screen.getByText("Salary exceeds maximum allowed value")).toBeInTheDocument();
  });

  it("names the currency in the label so the rupee glyph need not be read out", () => {
    render(<Harness />);

    expect(screen.getByText(/Monthly Salary \(CTC, INR\)/)).toBeInTheDocument();
    expect(screen.getByText("₹")).toHaveAttribute("aria-hidden", "true");
  });
});
