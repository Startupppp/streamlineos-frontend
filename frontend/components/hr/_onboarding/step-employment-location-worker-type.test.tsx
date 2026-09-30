import { render, screen, within } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Form } from "@/components/ui/form";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { DEFAULT_INVITE_ROLE } from "@/lib/constants/user-invite-roles";
import { DEFAULT_HR_WORKER_TYPE } from "@/lib/constants/hr-worker-types";
import { StepEmployment } from "./step-employment";

/**
 * BUG-HRMS-006 / BUG-HRMS-007. An organisation with three configured offices put
 * every hire at no location, and a contractor or an intern could only be recorded
 * in the free-text designation, because the wizard offered neither field while
 * `hr_employments` carried both columns all along.
 *
 * The negative case matters as much as the positive one (FE-122): an org that
 * configured no location must still be able to hire, so the control is present
 * and inert rather than blocking.
 */

jest.mock("./step-employment-reporting", () => ({ StepEmploymentReporting: () => null }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/components/hr/department-combobox", () => ({
  DepartmentCombobox: () => <div data-testid="department-combobox" />,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}>
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

const LOCATIONS = [
  { id: "loc-1", name: "Bengaluru HQ" },
  { id: "loc-2", name: "Hyderabad" },
];

function Harness({ locations }: { locations: Array<{ id: string; name: string }> }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      designation: "",
      departmentId: "",
      role: DEFAULT_INVITE_ROLE,
      workerType: DEFAULT_HR_WORKER_TYPE,
      employeeId: "",
    },
  });
  return (
    <Form {...form}>
      <StepEmployment form={form} departments={[]} locations={locations} />
    </Form>
  );
}

/** Step order: role, worker type, location. */
function selects(): HTMLElement[] {
  return screen.getAllByRole("combobox");
}

function optionValues(select: HTMLElement): string[] {
  return within(select)
    .getAllByRole("option")
    .map((option) => option.getAttribute("value") ?? "");
}

describe("the onboarding Job Details step offers a work location and a worker type", () => {
  it("lists the organisation's locations", () => {
    render(<Harness locations={LOCATIONS} />);

    const location = selects()[2];
    expect(optionValues(location)).toEqual(["__none__", "loc-1", "loc-2"]);
    expect(screen.getByText("Bengaluru HQ")).toBeInTheDocument();
  });

  it("starts at no location, so an org that configured none can still hire", () => {
    render(<Harness locations={[]} />);

    const location = selects()[2];
    expect(location).toBeDisabled();
    expect(screen.getByText("Add offices under Settings → Organization → Locations.")).toBeInTheDocument();
  });

  it("offers every worker type the column accepts and starts on the column default", () => {
    render(<Harness locations={LOCATIONS} />);

    const workerType = selects()[1];
    expect(optionValues(workerType)).toEqual([
      "FULL_TIME",
      "PART_TIME",
      "CONTRACTOR",
      "CONSULTANT",
      "INTERN",
      "TEMPORARY",
      "AGENCY",
      "FREELANCER",
    ]);
    expect(workerType).toHaveValue(DEFAULT_HR_WORKER_TYPE);
  });
});

describe("the onboarding schema accepts what the endpoint accepts", () => {
  it("takes a location id and every worker type", () => {
    expect(onboardEmployeeInputSchema.shape.locationId.safeParse("loc-1").success).toBe(true);
    expect(onboardEmployeeInputSchema.shape.workerType.safeParse("CONTRACTOR").success).toBe(true);
  });

  it("refuses a worker type the Postgres enum does not have", () => {
    expect(onboardEmployeeInputSchema.shape.workerType.safeParse("PERMANENT").success).toBe(false);
  });

  it("leaves both optional, because the columns carry defaults", () => {
    expect(onboardEmployeeInputSchema.shape.locationId.safeParse(undefined).success).toBe(true);
    expect(onboardEmployeeInputSchema.shape.workerType.safeParse(undefined).success).toBe(true);
  });
});
