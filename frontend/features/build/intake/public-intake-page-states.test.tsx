import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/hooks/api/build/public-form", () => ({
  usePublicForm: jest.fn(),
  useSubmitPublicForm: jest.fn(),
  useProjectIntakeForm: jest.fn(),
}));

jest.mock("@/hooks/api/build/public-intake", () => ({
  useSubmitIntake: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "7" }),
}));

import {
  useProjectIntakeForm,
  useSubmitPublicForm,
} from "@/hooks/api/build/public-form";
import { useSubmitIntake } from "@/hooks/api/build/public-intake";
import PublicIntakePage from "@/app/(public)/intake/[projectId]/page";

const mockUseProjectIntakeForm = useProjectIntakeForm as jest.MockedFunction<typeof useProjectIntakeForm>;
const mockUseSubmitPublicForm = useSubmitPublicForm as jest.MockedFunction<typeof useSubmitPublicForm>;
const mockUseSubmitIntake = useSubmitIntake as jest.MockedFunction<typeof useSubmitIntake>;

const idleMutation = {
  mutate: jest.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};

const configuredForm = {
  id: 1,
  name: "Project intake form",
  description: "Describe your need",
  type: "intake",
  publicToken: "tok-form-abc123",
  fields: [
    { key: "summary", label: "Summary", type: "text" as const, required: true },
    { key: "details", label: "Details", type: "textarea" as const, required: false },
  ],
};

function setup(
  intakeFormOverrides: object,
  submitPublicFormOverrides = {},
  submitIntakeOverrides = {},
) {
  mockUseProjectIntakeForm.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...intakeFormOverrides,
  } as ReturnType<typeof useProjectIntakeForm>);
  mockUseSubmitPublicForm.mockReturnValue({ ...idleMutation, ...submitPublicFormOverrides } as unknown as ReturnType<typeof useSubmitPublicForm>);
  mockUseSubmitIntake.mockReturnValue({ ...idleMutation, ...submitIntakeOverrides } as unknown as ReturnType<typeof useSubmitIntake>);
  return render(<PublicIntakePage />);
}

describe("PublicIntakePage — dynamic form surface (project has a configured intake form)", () => {
  it("shows a loading skeleton while looking up the intake form", () => {
    setup({ isLoading: true });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders the configured form name in the header once loaded", () => {
    setup({ isSuccess: true, data: configuredForm });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Project intake form");
  });

  it("renders the dynamic form fields when an intake form is configured", () => {
    setup({ isSuccess: true, data: configuredForm });
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("shows 'Submission received' after a successful dynamic form submission", () => {
    setup({ isSuccess: true, data: configuredForm }, { isSuccess: true });
    expect(screen.getByText("Submission received")).toBeInTheDocument();
  });
});

describe("PublicIntakePage — legacy intake fallback (no configured form for this project)", () => {
  it("renders the legacy intake form when the project has no configured form (404)", () => {
    setup({ isError: true, error: new Error("No active public form for this project") });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Submit a request");
  });

  it("shows the request title field from the legacy form", () => {
    setup({ isError: true, error: new Error("No active public form for this project") });
    expect(screen.getByPlaceholderText(/briefly describe your request/i)).toBeInTheDocument();
  });

  it("shows 'Request submitted' after a successful legacy intake submission", () => {
    setup(
      { isError: true, error: new Error("Not found") },
      {},
      { isSuccess: true },
    );
    expect(screen.getByText("Request submitted")).toBeInTheDocument();
  });

  it("still shows the submit button on error (URL never dead-ends)", () => {
    setup({ isError: true, error: new Error("No form") });
    expect(screen.getByRole("button", { name: /submit request/i })).toBeInTheDocument();
  });
});

describe("PublicIntakePage — submission error state", () => {
  it("shows an alert when the legacy submission fails", () => {
    setup(
      { isError: true, error: new Error("Not found") },
      {},
      { isError: true, error: new Error("Failed to submit. Please try again.") },
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
