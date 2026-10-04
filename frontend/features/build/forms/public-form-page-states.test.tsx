import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("PublicFormPage canonical builder fields", () => {
  const scrollIntoView = HTMLElement.prototype.scrollIntoView;
  beforeAll(() => { HTMLElement.prototype.scrollIntoView = jest.fn(); });
  afterAll(() => { HTMLElement.prototype.scrollIntoView = scrollIntoView; });

  it.each(["dropdown", "select"])("renders %s options in order and submits the selected string", async type => {
    const mutate = jest.fn();
    setup({ isSuccess: true, data: { ...formData, fields: [
      { key: "severity", label: "Severity", type, required: true, options: ["Normal", "Urgent"] },
    ] } }, { mutate });
    fireEvent.keyDown(screen.getByRole("combobox", { name: /Severity/ }), { key: "ArrowDown" });
    expect(await screen.findAllByRole("option")).toHaveLength(2);
    expect(screen.getAllByRole("option").map(option => option.textContent)).toEqual(["Normal", "Urgent"]);
    fireEvent.click(screen.getByRole("option", { name: "Urgent" }));
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ severity: "Urgent" }));
  });

  it.each(["long_text", "textarea"])("renders %s as multiline input and preserves line breaks", async type => {
    const mutate = jest.fn();
    setup({ isSuccess: true, data: { ...formData, fields: [
      { key: "notes", label: "Notes", type, required: true },
    ] } }, { mutate });
    const input = screen.getByRole("textbox", { name: /Notes/ });
    expect(input).toBeInstanceOf(HTMLTextAreaElement);
    await userEvent.type(input, "First line{Enter}Second line");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ notes: "First line\nSecond line" }));
  });

  it("keeps required errors and typed multiline content through a server error and retry", async () => {
    const mutate = jest.fn();
    const data = { ...formData, fields: [
      { key: "severity", label: "Severity", type: "dropdown", required: true, options: ["Urgent"] },
      { key: "notes", label: "Notes", type: "long_text", required: true },
    ] };
    const view = setup({ isSuccess: true, data }, { mutate });
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(screen.getByText("Severity is required")).toBeInTheDocument());
    expect(screen.getByText("Notes is required")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("combobox", { name: /Severity/ }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Urgent" }));
    await userEvent.type(screen.getByRole("textbox", { name: /Notes/ }), "Kept{Enter}draft");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ severity: "Urgent", notes: "Kept\ndraft" }));
    mockUseSubmitPublicForm.mockReturnValue({
      ...mockUseSubmitPublicForm("tok-abc123"), status: "error", isError: true,
      isIdle: false, isPending: false, isSuccess: false, data: undefined,
      variables: { severity: "Urgent", notes: "Kept\ndraft" }, error: new Error("Try again"),
    });
    view.rerender(<PublicFormPage />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Severity/ })).toHaveTextContent("Urgent");
    expect(screen.getByRole("textbox", { name: /Notes/ })).toHaveValue("Kept\ndraft");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
  });
});
