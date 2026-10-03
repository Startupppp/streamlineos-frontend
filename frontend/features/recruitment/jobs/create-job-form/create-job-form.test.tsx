import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Department } from "@/types/hr";
import { CreateJobForm } from "./index";
import { missingForPublish } from "./schema";

const createMutate = jest.fn();
let departmentsData: Department[] | undefined = [];

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/hr/recruitment", () => ({
  useCreateJobPosting: () => ({ mutate: createMutate, isPending: false }),
  useUpdateJobPosting: () => ({ mutate: jest.fn(), isPending: false }),
  useHiringFlows: () => ({ data: [] }),
  useJobTemplates: () => ({ data: [], access: { denied: true } }),
  useApplyJobTemplate: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrDepartments: () => ({ data: departmentsData }),
}));

jest.mock("@/hooks/api", () => ({
  useBranchOptions: () => ({ data: { data: [] } }),
}));

beforeEach(() => {
  createMutate.mockReset();
  departmentsData = [];
});

function typeTitle(value: string) {
  fireEvent.change(screen.getByPlaceholderText("e.g. Software Engineer, HR Manager"), { target: { value } });
}

describe("CreateJobForm", () => {
  it("saves a draft with only a title", async () => {
    render(<CreateJobForm />);
    typeTitle("Backend Engineer");
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    const payload = createMutate.mock.calls[0][0];
    expect(payload).toMatchObject({ title: "Backend Engineer", status: "DRAFT" });
    expect(payload.departmentId).toBeUndefined();
    expect(payload.location).toBeUndefined();
    expect(payload.description).toBeUndefined();
  });

  it("refuses a draft without a title", async () => {
    render(<CreateJobForm />);
    fireEvent.click(screen.getByRole("button", { name: /save draft/i }));
    await screen.findByText(/Job Title must be at least 2 characters/);
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("publish lists the missing fields by name and sends nothing", async () => {
    render(<CreateJobForm />);
    typeTitle("Backend Engineer");
    fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("To publish, fill in:");
    for (const label of ["Employment type", "Work mode", "Country", "Overview"]) {
      expect(alert).toHaveTextContent(label);
    }
    expect(alert).not.toHaveTextContent("Job title");
    expect(alert).not.toHaveTextContent(/\d+\/\d+/);
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("clicking a missing field opens its collapsed section", async () => {
    render(<CreateJobForm />);
    typeTitle("Backend Engineer");
    fireEvent.click(screen.getByRole("button", { name: /^publish$/i }));
    await screen.findByRole("alert");
    expect(screen.queryByPlaceholderText(/Karnataka, Bangalore/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "State / city" }));
    expect(screen.getByPlaceholderText(/Karnataka, Bangalore/)).toBeInTheDocument();
  });

  it("shows no hardcoded department options when the org has none", () => {
    render(<CreateJobForm />);
    expect(screen.getByText("No departments yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage departments" })).toHaveAttribute(
      "href",
      "/settings/organization/departments",
    );
    for (const fake of ["IT", "HR", "Finance", "Sales", "Marketing", "Operations"]) {
      expect(screen.queryByRole("option", { name: fake })).not.toBeInTheDocument();
    }
  });
});

describe("missingForPublish", () => {
  it("requires a department only when the org has departments", () => {
    const values = { title: "Backend Engineer" };
    const withDepts = missingForPublish(values, { requireDepartment: true }).map((m) => m.key);
    const withoutDepts = missingForPublish(values, { requireDepartment: false }).map((m) => m.key);
    expect(withDepts).toContain("departmentId");
    expect(withoutDepts).not.toContain("departmentId");
    expect(withoutDepts).not.toContain("title");
  });
});
