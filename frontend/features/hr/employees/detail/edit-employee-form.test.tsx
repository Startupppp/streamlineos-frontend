import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditEmployeeForm } from "./edit-employee-form";
import type { EmployeeData } from "./employee-data";

const mutateAsync = jest.fn().mockResolvedValue({});

jest.mock("@/hooks/api/hr", () => ({
  useUpdateProfile: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/components/hr/department-combobox", () => ({
  DepartmentCombobox: ({ onChange }: { onChange: (v: string | undefined) => void }) => (
    <button type="button" onClick={() => onChange("dept-1")}>
      Dept
    </button>
  ),
}));

function makeEmployee(overrides: Partial<EmployeeData> = {}): EmployeeData {
  return {
    id: "user-1",
    name: null,
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.test",
    role: "MEMBER",
    designation: "Engineer",
    employeeId: "EMP-1",
    orgDepartmentId: null,
    image: null,
    isActive: true,
    joiningDate: null,
    reportingTo: null,
    bio: null,
    linkedinUrl: null,
    twitterUrl: null,
    githubUrl: null,
    websiteUrl: null,
    skills: [],
    phone: null,
    employmentStatus: "ACTIVE",
    employment: null,
    inviteDelivery: {
      status: "none",
      queuedAt: null,
      sentAt: null,
      attempts: 0,
      lastError: null,
      deliveryConfirmed: false,
    },
    gender: null,
    ...overrides,
  };
}

describe("EditEmployeeForm — dirty-field name gate", () => {
  beforeEach(() => {
    mutateAsync.mockClear();
  });

  it("does not send firstName or lastName when only designation is changed", async () => {
    const user = userEvent.setup();
    render(<EditEmployeeForm employee={makeEmployee()} />);

    const designationInput = screen.getByDisplayValue("Engineer");
    await user.clear(designationInput);
    await user.type(designationInput, "Senior Engineer");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).not.toHaveProperty("firstName");
    expect(payload).not.toHaveProperty("lastName");
    expect(payload).toMatchObject({ userId: "user-1", designation: "Senior Engineer" });
  });

  it("does not send firstName or lastName when the employee has a legacy digit name and only designation changes", async () => {
    const user = userEvent.setup();
    render(<EditEmployeeForm employee={makeEmployee({ firstName: "ada1", lastName: "smith2" })} />);

    const designationInput = screen.getByDisplayValue("Engineer");
    await user.clear(designationInput);
    await user.type(designationInput, "Lead Engineer");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).not.toHaveProperty("firstName");
    expect(payload).not.toHaveProperty("lastName");
  });

  it("sends firstName when it is changed to a valid name", async () => {
    const user = userEvent.setup();
    render(<EditEmployeeForm employee={makeEmployee()} />);

    const firstNameInput = screen.getByDisplayValue("Alice");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Alicia");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload).toMatchObject({ userId: "user-1", firstName: "Alicia" });
  });
});
