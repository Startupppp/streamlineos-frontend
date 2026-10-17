import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

jest.mock("@/hooks/api/build/public-form", () => ({
  usePublicForm: jest.fn(),
  useSubmitPublicForm: jest.fn(),
}));

import { usePublicForm, useSubmitPublicForm } from "@/hooks/api/build/public-form";
import { ApiError } from "@/lib/api-envelope";
import { PublicFormView } from "@/features/build/forms/public-form-view";

const mockUsePublicForm = usePublicForm as jest.MockedFunction<typeof usePublicForm>;
const mockUseSubmitPublicForm = useSubmitPublicForm as jest.MockedFunction<
  typeof useSubmitPublicForm
>;

const idleMutation = {
  mutate: jest.fn(),
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
  data: undefined,
};

const formData = {
  id: 1,
  name: "Project intake request",
  description: "Tell us what you need",
  type: "generic",
  publicToken: "tok-abc123",
  fields: [{ key: "title", label: "Title", type: "text", required: true }],
};

function setup(
  queryOverrides: Record<string, unknown>,
  mutationOverrides: Record<string, unknown> = {},
) {
  const refetch = jest.fn();
  mockUsePublicForm.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
    refetch,
    ...queryOverrides,
  } as unknown as ReturnType<typeof usePublicForm>);
  mockUseSubmitPublicForm.mockReturnValue({
    ...idleMutation,
    ...mutationOverrides,
  } as unknown as ReturnType<typeof useSubmitPublicForm>);
  render(<PublicFormView formToken="tok-abc123" />);
  return { refetch };
}

describe("a form whose link the server refuses offers no retry, because retrying a revoked token can never succeed", () => {
  it("names the link as invalid or closed and withholds a retry control when the read 404s", () => {
    setup({
      isError: true,
      error: new ApiError("Form not found or no longer active", 404),
    });
    expect(
      screen.getByText("This form is no longer available"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /try again/i }),
    ).not.toBeInTheDocument();
  });

  it("offers a retry control that refetches when the read fails for a reason that could pass on a second attempt", async () => {
    const { refetch } = setup({
      isError: true,
      error: new ApiError("Internal server error", 500),
    });
    const retry = screen.getByRole("button", { name: /try again/i });
    expect(retry).toBeInTheDocument();
    await userEvent.click(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("tells a rate-limited visitor to wait rather than calling the link dead, and still offers the retry", () => {
    setup({
      isError: true,
      error: new ApiError("Too many requests", 429, "RATE_LIMITED", {
        retryAfterSecs: 30,
      }),
    });
    expect(screen.getByText(/wait 30 seconds/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("This form is no longer available"),
    ).not.toBeInTheDocument();
  });

  it("renders the form itself when the read succeeds, so the refusal branches above are not the only reachable outcome", () => {
    setup({ isSuccess: true, data: formData });
    expect(
      screen.getByRole("button", { name: /^submit$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("This form is no longer available"),
    ).not.toBeInTheDocument();
  });
});

describe("a submitter is given a reference they can quote back to the team", () => {
  it("shows the submission reference from the server response on success", () => {
    setup(
      { isSuccess: true, data: formData },
      { isSuccess: true, data: { id: 4817, message: "Submission received" } },
    );
    expect(screen.getByText("Submission received")).toBeInTheDocument();
    expect(screen.getByText(/4817/)).toBeInTheDocument();
  });

  it("still confirms the submission when the server sends no reference, rather than rendering an empty reference line", () => {
    setup({ isSuccess: true, data: formData }, { isSuccess: true, data: undefined });
    expect(screen.getByText("Submission received")).toBeInTheDocument();
    expect(screen.queryByText(/reference/i)).not.toBeInTheDocument();
  });
});

describe("a submit refused for the token itself stops offering a submit button", () => {
  it("withdraws the submit button and says the answers were not recorded when the submit 404s", () => {
    setup(
      { isSuccess: true, data: formData },
      { isError: true, error: new ApiError("Form not found", 404) },
    );
    expect(
      screen.getByText("This form is no longer accepting responses"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^submit$/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the submit button for a failure a second attempt could survive", () => {
    setup(
      { isSuccess: true, data: formData },
      { isError: true, error: new ApiError("Internal server error", 500) },
    );
    expect(
      screen.getByRole("button", { name: /^submit$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /something went wrong on our end/i,
    );
  });

  it("surfaces the server's own reason for a rejected submission instead of a generic failure line", () => {
    setup(
      { isSuccess: true, data: formData },
      { isError: true, error: new ApiError("Form is not active", 400) },
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Form is not active");
  });
});

describe("a double-tapped submit reaches the server once", () => {
  it("does not fire a second mutation while the first is still in flight", async () => {
    const mutate = jest.fn();
    setup(
      { isSuccess: true, data: formData },
      { mutate, isPending: true },
    );
    const button = screen.getByRole("button", { name: /submitting/i });
    await userEvent.click(button);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("fires exactly one mutation for a filled form that is not already submitting, so the guard above is not blocking every submit", async () => {
    const mutate = jest.fn();
    setup({ isSuccess: true, data: formData }, { mutate });
    await userEvent.type(screen.getByRole("textbox", { name: /Title/ }), "A bug");
    await userEvent.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
