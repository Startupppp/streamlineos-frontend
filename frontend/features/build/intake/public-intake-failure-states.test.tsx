import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.mock("@/hooks/api/build/public-form", () => ({
  useIntakeFormByToken: jest.fn(),
  useSubmitPublicForm: jest.fn(),
}));

jest.mock("@/hooks/api/build/public-intake", () => ({
  useSubmitIntakeByToken: jest.fn(),
}));

import {
  useIntakeFormByToken,
  useSubmitPublicForm,
} from "@/hooks/api/build/public-form";
import { useSubmitIntakeByToken } from "@/hooks/api/build/public-intake";
import { ApiError } from "@/lib/api-envelope";
import { PublicIntakeTokenView } from "@/features/build/intake/public-intake-token-view";

const mockUseIntakeFormByToken = useIntakeFormByToken as jest.MockedFunction<
  typeof useIntakeFormByToken
>;
const mockUseSubmitPublicForm = useSubmitPublicForm as jest.MockedFunction<
  typeof useSubmitPublicForm
>;
const mockUseSubmitIntakeByToken = useSubmitIntakeByToken as jest.MockedFunction<
  typeof useSubmitIntakeByToken
>;

const idleMutation = {
  mutate: jest.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  data: undefined,
};

const configuredForm = {
  id: 1,
  name: "Project intake form",
  description: "Describe your need",
  type: "intake",
  publicToken: "tok-form-abc123",
  fields: [{ key: "summary", label: "Summary", type: "text", required: true }],
};

function setupFormLoadView(
  queryOverrides: Record<string, unknown>,
  submitPublicFormOverrides: Record<string, unknown> = {},
) {
  const refetch = jest.fn();
  mockUseIntakeFormByToken.mockReturnValue({
    data: undefined,
    isPending: false,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch,
    ...queryOverrides,
  } as unknown as ReturnType<typeof useIntakeFormByToken>);
  mockUseSubmitPublicForm.mockReturnValue({
    ...idleMutation,
    ...submitPublicFormOverrides,
  } as unknown as ReturnType<typeof useSubmitPublicForm>);
  mockUseSubmitIntakeByToken.mockReturnValue(
    idleMutation as unknown as ReturnType<typeof useSubmitIntakeByToken>,
  );
  render(<PublicIntakeTokenView intakeToken="tok-form-xyz" />);
  return { refetch };
}

function setupTokenFormView(mutationOverrides: Record<string, unknown> = {}) {
  mockUseIntakeFormByToken.mockReturnValue({
    data: undefined,
    isPending: false,
    isLoading: false,
    isError: true,
    isSuccess: false,
    error: new ApiError("No active public form for this project", 404),
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useIntakeFormByToken>);
  mockUseSubmitPublicForm.mockReturnValue(
    idleMutation as unknown as ReturnType<typeof useSubmitPublicForm>,
  );
  mockUseSubmitIntakeByToken.mockReturnValue({
    ...idleMutation,
    ...mutationOverrides,
  } as unknown as ReturnType<typeof useSubmitIntakeByToken>);
  render(<PublicIntakeTokenView intakeToken="tok-intake-xyz" />);
}

describe("a failed intake-form read is never presented as a different form the visitor did not choose", () => {
  it("shows a read failure with a retry instead of the transitional form when the lookup 500s", async () => {
    const { refetch } = setupFormLoadView({
      isError: true,
      error: new ApiError("Internal server error", 500),
    });
    expect(screen.getByText("We couldn't load this form")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/briefly describe your request/i),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("shows a read failure rather than the transitional form when the lookup is rate-limited", () => {
    setupFormLoadView({
      isError: true,
      error: new ApiError("Too many requests", 429, "RATE_LIMITED", {
        retryAfterSecs: 20,
      }),
    });
    expect(screen.getByText("Too many attempts")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/briefly describe your request/i),
    ).not.toBeInTheDocument();
  });

  it("renders the transitional form for the one status that means the project has no published form", () => {
    setupFormLoadView({
      isError: true,
      error: new ApiError("No active public form for this project", 404),
    });
    expect(
      screen.getByPlaceholderText(/briefly describe your request/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("We couldn't load this form"),
    ).not.toBeInTheDocument();
  });

  it("renders the published form when the read succeeds, so the refusal branches are not the only reachable outcome", () => {
    setupFormLoadView({ isSuccess: true, data: configuredForm });
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(
      screen.queryByText("We couldn't load this form"),
    ).not.toBeInTheDocument();
  });
});

describe("the published-form branch renders something or says why, never a blank card", () => {
  it("falls back to the transitional form rather than an empty card when a published form carries no usable token", () => {
    setupFormLoadView({
      isSuccess: true,
      data: { ...configuredForm, publicToken: null },
    });
    expect(
      screen.getByPlaceholderText(/briefly describe your request/i),
    ).toBeInTheDocument();
  });
});

describe("a token-link intake submit says which outcome happened instead of only succeeding", () => {
  it("calls the link dead with no retry when the server refuses the token, since the refusal is the same for invalid and closed", () => {
    setupTokenFormView({
      isError: true,
      error: new ApiError("Invalid request", 400, "BAD_REQUEST"),
    });
    expect(
      screen.getByText("This link is not accepting requests"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /submit request/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the form and the submit button for a failure a second attempt could survive", () => {
    setupTokenFormView({
      isError: true,
      error: new ApiError("Service unavailable", 503),
    });
    expect(
      screen.getByRole("button", { name: /submit request/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /something went wrong on our end/i,
    );
  });

  it("separates a validation refusal from a dead link, because the server codes only that one", () => {
    setupTokenFormView({
      isError: true,
      error: new ApiError("Validation failed", 400, "VALIDATION_FAILED", {
        details: [{ path: "title", message: "Request title is required" }],
      }),
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "title: Request title is required",
    );
    expect(
      screen.queryByText("This link is not accepting requests"),
    ).not.toBeInTheDocument();
  });

  it("renders the request form with its submit button when nothing has failed yet", () => {
    setupTokenFormView();
    expect(
      screen.getByRole("button", { name: /submit request/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("This link is not accepting requests"),
    ).not.toBeInTheDocument();
  });

  it("confirms the request once the submit succeeds", () => {
    setupTokenFormView({ isSuccess: true });
    expect(screen.getByText("Request submitted")).toBeInTheDocument();
  });
});
