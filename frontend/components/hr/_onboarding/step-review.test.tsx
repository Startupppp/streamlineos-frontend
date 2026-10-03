import { render, screen } from "@testing-library/react";
import { useForm, type DefaultValues } from "react-hook-form";
import type { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { DEFAULT_INVITE_ROLE } from "@/lib/constants/user-invite-roles";
import { StepReview } from "./step-review";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

function Harness({ departmentId }: { departmentId: string }) {
  const form = useForm<FormValues>({
    defaultValues: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.test",
      designation: "Engineer",
      departmentId,
      role: DEFAULT_INVITE_ROLE,
      joiningDate: new Date("2026-10-01"),
    } as DefaultValues<FormValues>,
  });
  return (
    <StepReview
      form={form}
      departments={[{ id: "dept-real", name: "Platform" }]}
      locations={[]}
    />
  );
}

describe("the onboarding review step", () => {
  it("shows the selected real department by name", () => {
    render(<Harness departmentId="dept-real" />);
    expect(screen.getByText("Platform")).toBeInTheDocument();
  });

  it("never resolves a fabricated common-N department", () => {
    render(<Harness departmentId="common-1" />);
    expect(screen.queryByText("HR")).not.toBeInTheDocument();
    expect(screen.queryByText("Platform")).not.toBeInTheDocument();
  });

  it("explains what submitting does, including when payroll can pay them", () => {
    render(<Harness departmentId="dept-real" />);
    const explainer = screen.getByRole("list", { name: "What happens when you submit" });
    expect(explainer).toHaveTextContent("they appear in Directory and get an invite.");
    expect(explainer).toHaveTextContent("from their joining date.");
    expect(explainer).toHaveTextContent("they can be paid once a salary is assigned in Payroll → Employees.");
  });
});
