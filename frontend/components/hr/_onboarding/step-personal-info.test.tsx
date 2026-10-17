import { render, screen } from "@testing-library/react";
import { useForm, type DefaultValues } from "react-hook-form";
import type { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { Form } from "@/components/ui/form";
import { StepPersonalInfo } from "./step-personal-info";

jest.mock("@/components/hr/check-employee-email", () => ({
  employeeAdmissionGuidance: jest.fn(),
  fetchEmployeeAdmissionCheck: jest.fn(),
}));

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

function Harness() {
  const form = useForm<FormValues>({
    defaultValues: { firstName: "", lastName: "" } as DefaultValues<FormValues>,
  });
  return (
    <Form {...form}>
      <StepPersonalInfo form={form} />
    </Form>
  );
}

describe("onboarding personal step (HR-U-004)", () => {
  it("states the name rule on both name fields before any error", () => {
    render(<Harness />);
    expect(screen.getByLabelText(/first name/i)).toHaveAccessibleDescription(/no numbers/i);
    expect(screen.getByLabelText(/last name/i)).toHaveAccessibleDescription(/no numbers/i);
  });

  it("caps both name inputs at the 100-character validation limit", () => {
    render(<Harness />);
    expect(screen.getByLabelText(/first name/i)).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText(/last name/i)).toHaveAttribute("maxLength", "100");
  });
});
