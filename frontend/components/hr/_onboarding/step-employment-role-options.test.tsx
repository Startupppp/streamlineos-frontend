import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Form } from "@/components/ui/form";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { DEFAULT_INVITE_ROLE } from "@/lib/constants/user-invite-roles";
import { StepEmployment } from "./step-employment";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/components/hr/department-combobox", () => ({
  DepartmentCombobox: () => <div data-testid="department-combobox" />,
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => <div data-testid="reporting-manager-combobox" />,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      aria-label="Organization role"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

function Harness() {
  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      designation: "",
      departmentId: "",
      role: DEFAULT_INVITE_ROLE,
      employeeId: "",
    },
  });
  return (
    <Form {...form}>
      <StepEmployment form={form} departments={[]} />
    </Form>
  );
}

function roleOptionValues(): string[] {
  return screen
    .getAllByRole("option")
    .map((option) => option.getAttribute("value") ?? "");
}

describe("the onboarding role picker offers only roles the onboard endpoint accepts", () => {
  it("offers Member and Org Admin, the two invitable organization roles", () => {
    render(<Harness />);

    expect(roleOptionValues()).toEqual(["MEMBER", "ORG_ADMIN"]);
  });

  it("never offers a module role slug such as HR_MODULE_ADMIN, which the endpoint refuses", () => {
    render(<Harness />);

    expect(roleOptionValues().filter((value) => value.includes("_MODULE_"))).toEqual([]);
  });

  it("never offers a department slug such as ENGINEERING, which the endpoint refuses", () => {
    render(<Harness />);

    expect(roleOptionValues()).not.toContain("ENGINEERING");
  });

  it("starts on a role the endpoint accepts, so an untouched form still submits", () => {
    render(<Harness />);

    expect(roleOptionValues()).toContain(DEFAULT_INVITE_ROLE);
    expect(screen.getByLabelText("Organization role")).toHaveValue(DEFAULT_INVITE_ROLE);
  });
});

describe("the onboarding form schema refuses every role the backend would reject", () => {
  const role = onboardEmployeeInputSchema.shape.role;

  it.each([["HR_MODULE_ADMIN"], ["HR_MODULE_MEMBER"], ["HR_MODULE_OWNER"]])(
    "refuses the module role %s reported in STRE-51",
    (value) => {
      expect(role.safeParse(value).success).toBe(false);
    },
  );

  it.each([["ENGINEERING"], ["HR"], ["SALES"], ["ADMINISTRATOR"]])(
    "refuses the department slug %s the picker used to offer",
    (value) => {
      expect(role.safeParse(value).success).toBe(false);
    },
  );

  it.each([["MEMBER"], ["ORG_ADMIN"]])("accepts the structural role %s", (value) => {
    expect(role.safeParse(value).success).toBe(true);
  });

  it("refuses OWNER, which the backend grants only through ownership transfer", () => {
    expect(role.safeParse("OWNER").success).toBe(false);
  });
});
