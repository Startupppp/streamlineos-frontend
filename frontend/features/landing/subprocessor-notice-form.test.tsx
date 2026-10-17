import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubprocessorNoticeForm } from "./subprocessor-notice-form";

const mutate = jest.fn();
jest.mock("@/hooks/api/privacy/subprocessors", () => ({
  useSubprocessorNotices: () => ({ mutate, isPending: false, variables: undefined }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => mutate.mockReset());

it("subscribes and unsubscribes the canonical address", async () => {
  render(<SubprocessorNoticeForm />);
  const input = screen.getByLabelText("Get notified of subprocessor changes");
  await userEvent.type(input, "  Counsel@Example.com ");
  await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  expect(mutate.mock.calls[0][0]).toEqual({ email: "counsel@example.com", subscribe: true });

  await userEvent.click(screen.getByRole("button", { name: "Unsubscribe" }));
  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(2));
  expect(mutate.mock.calls[1][0]).toEqual({ email: "counsel@example.com", subscribe: false });
});

it("sends nothing for an invalid address", async () => {
  render(<SubprocessorNoticeForm />);
  await userEvent.type(screen.getByLabelText("Get notified of subprocessor changes"), "not-an-email");
  await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
  expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
  expect(mutate).not.toHaveBeenCalled();
});
