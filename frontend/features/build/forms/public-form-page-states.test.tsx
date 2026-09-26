import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/hooks/api/build/public-form", () => ({
  usePublicForm: jest.fn(),
  useSubmitPublicForm: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ formToken: "tok-abc123" }),
}));

import { usePublicForm, useSubmitPublicForm } from "@/hooks/api/build/public-form";
import PublicFormPage from "@/app/(public)/forms/[formToken]/page";

const mockUsePublicForm = usePublicForm as jest.MockedFunction<typeof usePublicForm>;
const mockUseSubmitPublicForm = useSubmitPublicForm as jest.MockedFunction<typeof useSubmitPublicForm>;

const idleMutation = {
  mutate: jest.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};

const formData = {
  id: 1,
  name: "Project intake request",
  description: "Tell us what you need",
  fields: [
    { key: "title", label: "Title", type: "text" as const, required: true },
    { key: "description", label: "Description", type: "textarea" as const, required: false },
  ],
  isActive: true,
  isPublic: true,
  publicToken: "tok-abc123",
  type: "generic" as const,
  actions: [],
  orgId: "org-1",
  projectId: 10,
  formNumber: 1,
  createdBy: "user-1",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-25T00:00:00Z",
  deletedAt: null,
};

function setup(queryOverrides: Partial<ReturnType<typeof usePublicForm>>, mutationOverrides = {}) {
  mockUsePublicForm.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    ...queryOverrides,
  } as ReturnType<typeof usePublicForm>);
  mockUseSubmitPublicForm.mockReturnValue({ ...idleMutation, ...mutationOverrides } as unknown as ReturnType<typeof useSubmitPublicForm>);
  return render(<PublicFormPage />);
}

describe("PublicFormPage — loading state", () => {
  it("renders skeleton placeholders while the form is loading", () => {
    setup({ isLoading: true });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("does not show the form or the error message while loading", () => {
    setup({ isLoading: true });
    expect(screen.queryByText("Form unavailable")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});

describe("PublicFormPage — invalid / expired / revoked / not-found state (formQuery.isError)", () => {
  it("shows 'Form unavailable' when the token resolves to an error", () => {
    setup({ isError: true, error: new Error("Not Found") });
    expect(screen.getByText("Form unavailable")).toBeInTheDocument();
  });

  it("shows explanatory text directing the user to get an updated link", () => {
    setup({ isError: true, error: new Error("Gone") });
    expect(screen.getByText(/link is invalid/i)).toBeInTheDocument();
  });

  it("does not show the submission form when the token is invalid", () => {
    setup({ isError: true, error: new Error("Not Found") });
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});

describe("PublicFormPage — ready state (form loads with fields)", () => {
  it("renders the form name as the page heading", () => {
    setup({ isSuccess: true, data: formData });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Project intake request");
  });

  it("renders a submit button for a form that has fields", () => {
    setup({ isSuccess: true, data: formData });
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("shows form field labels", () => {
    setup({ isSuccess: true, data: formData });
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
  });
});

describe("PublicFormPage — empty state (form has no fields configured)", () => {
  it("shows a 'no fields configured' message and no submit button", () => {
    setup({ isSuccess: true, data: { ...formData, fields: [] } });
    expect(screen.getByText(/no fields configured/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});

describe("PublicFormPage — submission success state", () => {
  it("shows 'Submission received' after a successful submit", () => {
    setup({ isSuccess: true, data: formData }, { isSuccess: true });
    expect(screen.getByText("Submission received")).toBeInTheDocument();
  });

  it("does not show the form after successful submission", () => {
    setup({ isSuccess: true, data: formData }, { isSuccess: true });
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});

describe("PublicFormPage — server-error / rate-limited state (mutation.isError)", () => {
  it("shows a submission error message when the server returns an error", () => {
    setup(
      { isSuccess: true, data: formData },
      { isError: true, error: new Error("Failed to submit. Please try again.") },
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
