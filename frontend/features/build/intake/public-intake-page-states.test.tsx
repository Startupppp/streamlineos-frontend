import { render, screen, fireEvent, act } from "@testing-library/react";
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
import { idleQueryResult, successQueryResult, errorQueryResult } from "@/test-utils/query-result";
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

type IntakeFormResult = ReturnType<typeof useProjectIntakeForm>;
type IntakeFormData = NonNullable<IntakeFormResult["data"]>;

interface IntakeFormState {
  isPending?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  data?: IntakeFormData;
  error?: Error;
}

function intakeFormResult(state: IntakeFormState): IntakeFormResult {
  if (state.isError) return errorQueryResult(state.error ?? new Error("intake form unavailable"));
  if (state.isSuccess && state.data) return successQueryResult(state.data);
  return idleQueryResult();
}

function setup(
  intakeFormOverrides: IntakeFormState,
  submitPublicFormOverrides = {},
  submitIntakeOverrides = {},
) {
  mockUseProjectIntakeForm.mockReturnValue(intakeFormResult(intakeFormOverrides));
  mockUseSubmitPublicForm.mockReturnValue({ ...idleMutation, ...submitPublicFormOverrides } as unknown as ReturnType<typeof useSubmitPublicForm>);
  mockUseSubmitIntake.mockReturnValue({ ...idleMutation, ...submitIntakeOverrides } as unknown as ReturnType<typeof useSubmitIntake>);
  return render(<PublicIntakePage />);
}

describe("PublicIntakePage — dynamic form surface (project has a configured intake form)", () => {
  it("shows a loading skeleton while looking up the intake form", () => {
    setup({ isPending: true });
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

describe("PublicIntakePage — dynamic form field validation (claim 70)", () => {
  const emailForm = {
    id: 2,
    name: "Email form",
    description: null,
    type: "intake",
    publicToken: "tok-email-abc",
    fields: [
      { key: "contact", label: "Contact email", type: "email", required: true },
    ],
  };

  const numberForm = {
    id: 3,
    name: "Number form",
    description: null,
    type: "intake",
    publicToken: "tok-number-abc",
    fields: [
      { key: "score", label: "Score", type: "number", required: true },
    ],
  };

  it("blocks mutation when a required text field is submitted blank", async () => {
    const mutateSpy = jest.fn();
    setup({ isSuccess: true, data: configuredForm }, { mutate: mutateSpy });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("blocks mutation when a required text field contains only whitespace", async () => {
    const mutateSpy = jest.fn();
    setup({ isSuccess: true, data: configuredForm }, { mutate: mutateSpy });
    fireEvent.change(document.getElementById("field-summary")!, { target: { value: "   " } });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("blocks mutation when an email field has invalid format", async () => {
    const mutateSpy = jest.fn();
    setup({ isSuccess: true, data: emailForm }, { mutate: mutateSpy });
    fireEvent.change(document.getElementById("field-contact")!, { target: { value: "not-an-email" } });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("blocks mutation when a number field receives non-numeric input", async () => {
    const mutateSpy = jest.fn();
    setup({ isSuccess: true, data: numberForm }, { mutate: mutateSpy });
    fireEvent.change(document.getElementById("field-score")!, { target: { value: "abc" } });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("submits normalized required values and optional blanks through the actual fields", async () => {
    const mutateSpy = jest.fn();
    const data = { ...configuredForm, fields: [
      ...configuredForm.fields,
      { key: "contact", label: "Contact email", type: "email", required: true },
      { key: "score", label: "Score", type: "number", required: true },
      { key: "optionalContact", label: "Optional email", type: "email", required: false },
      { key: "optionalScore", label: "Optional score", type: "number", required: false },
    ] };
    setup({ isSuccess: true, data }, { mutate: mutateSpy });
    fireEvent.change(screen.getByRole("textbox", { name: /Summary/ }), { target: { value: "  My request  " } });
    fireEvent.change(screen.getByRole("textbox", { name: /Contact email/ }), { target: { value: "  jane@example.test  " } });
    fireEvent.change(screen.getByRole("textbox", { name: /^Score/ }), { target: { value: "  -12.50  " } });
    fireEvent.change(screen.getByRole("textbox", { name: /Optional email/ }), { target: { value: "   " } });
    fireEvent.change(screen.getByRole("textbox", { name: /Optional score/ }), { target: { value: "   " } });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).toHaveBeenCalledTimes(1);
    expect(mutateSpy).toHaveBeenCalledWith({
      summary: "My request", details: "", contact: "jane@example.test", score: "-12.50",
      optionalContact: "", optionalScore: "",
    });
  });

  const urlForm = {
    id: 4,
    name: "URL form",
    description: null,
    type: "intake",
    publicToken: "tok-url-abc",
    fields: [
      { key: "website", label: "Website", type: "url", required: true },
    ],
  };

  it("shows inline required-field error when form fields are loaded (Fix 1 resolver timing)", async () => {
    const mutateSpy = jest.fn();
    setup({ isSuccess: true, data: configuredForm }, { mutate: mutateSpy });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Summary is required")).toBeInTheDocument();
  });

  it("blocks mutation when a required url field receives a non-http value (Fix 2 url schema)", async () => {
    const mutateSpy = jest.fn();
    setup({ isSuccess: true, data: urlForm }, { mutate: mutateSpy });
    fireEvent.change(document.getElementById("field-website")!, { target: { value: "not-a-url" } });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("preserves entered answers after a failed submit and succeeds on retry", async () => {
    const mutateSpy = jest.fn();
    const view = setup({ isSuccess: true, data: configuredForm }, { mutate: mutateSpy });
    const summary = "  Keep this request  ";
    const details = "First line\nSecond line";
    const variables = { summary: "Keep this request", details };
    fireEvent.change(screen.getByRole("textbox", { name: /Summary/ }), { target: { value: summary } });
    fireEvent.change(screen.getByRole("textbox", { name: /Details/ }), { target: { value: details } });
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).toHaveBeenCalledTimes(1);
    expect(mutateSpy).toHaveBeenNthCalledWith(1, variables);
    mockUseSubmitPublicForm.mockReturnValue({
      ...mockUseSubmitPublicForm("tok-form-abc123"), status: "error", isError: true,
      isIdle: false, isPending: false, isSuccess: false, data: undefined,
      variables, error: new Error("Server error. Please retry."),
    });
    view.rerender(<PublicIntakePage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Server error. Please retry.");
    expect(screen.getByRole("textbox", { name: /Summary/ })).toHaveValue(summary);
    expect(screen.getByRole("textbox", { name: /Details/ })).toHaveValue(details);
    expect(screen.getByRole("button", { name: /^Submit$/ })).toBeEnabled();
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });
    expect(mutateSpy).toHaveBeenCalledTimes(2);
    expect(mutateSpy).toHaveBeenNthCalledWith(2, variables);
    mockUseSubmitPublicForm.mockReturnValue({
      ...mockUseSubmitPublicForm("tok-form-abc123"), status: "success", isError: false,
      isIdle: false, isPending: false, isSuccess: true, error: null,
      variables, data: { id: 17, message: "Submission received" },
    });
    view.rerender(<PublicIntakePage />);
    expect(screen.getByText("Submission received")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Submit$/ })).not.toBeInTheDocument();
  });
});
