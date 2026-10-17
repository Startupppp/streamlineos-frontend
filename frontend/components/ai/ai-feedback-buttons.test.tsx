import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { AiFeedbackButtons } from "./ai-feedback-buttons";

let permitted = true;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => permitted,
  useAccess: () => ({ data: { permissions: [] }, refetch: jest.fn() }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(() => Promise.resolve({ success: true })) },
}));

function renderButtons() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AiFeedbackButtons feature="hr.policy-qa" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  permitted = true;
  jest.mocked(apiClient.post).mockClear();
});

it("posts an UP rating with the feature and locks after the vote", async () => {
  const user = userEvent.setup();
  renderButtons();

  await user.click(screen.getByRole("button", { name: "Helpful" }));

  await waitFor(() => expect(screen.getByText("Thanks")).toBeInTheDocument());
  expect(apiClient.post).toHaveBeenCalledWith(
    "/ai/feedback",
    { feature: "hr.policy-qa", rating: "UP" },
    undefined,
    expect.any(Function),
  );
  expect(screen.getByRole("button", { name: "Not helpful" })).toBeDisabled();
});

it("renders nothing without ai:feedback:create", () => {
  permitted = false;
  renderButtons();

  expect(screen.queryByRole("button", { name: "Helpful" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Not helpful" })).not.toBeInTheDocument();
});
