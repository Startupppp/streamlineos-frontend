import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import { WaitlistForm } from "./waitlist-form";

const mutate = jest.fn();

jest.mock("@/lib/api/hooks/waitlist", () => ({
  useJoinWaitlist: () => ({
    mutate: (...args: unknown[]) => mutate(...args),
    isPending: false,
    reset: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

async function fillRequired() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
  await user.type(screen.getByLabelText(/work email/i), "ada@analytical.engine");
  await user.type(screen.getByLabelText(/company name/i), "Analytical Engines");
  await user.click(screen.getByRole("radio", { name: "11-50" }));
  await user.click(screen.getByRole("checkbox", { name: /agree to be contacted/i }));
  return user;
}

describe("WaitlistForm", () => {
  beforeEach(() => {
    mutate.mockReset();
  });

  it("shows validation errors and does not submit an empty form", async () => {
    const user = userEvent.setup();
    render(<WaitlistForm />);
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    expect(await screen.findByText("Full name is required")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("keeps the honeypot out of the tab order", () => {
    render(<WaitlistForm />);
    const website = document.getElementById("website");
    expect(website).toHaveAttribute("tabindex", "-1");
    expect(website).toHaveAttribute("aria-hidden", "true");
    expect(website?.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("shows the success panel after a join", async () => {
    mutate.mockImplementation((_body: unknown, options: { onSuccess?: () => void }) => {
      options.onSuccess?.();
    });
    render(<WaitlistForm />);
    const user = await fillRequired();
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    expect(
      await screen.findByRole("heading", { name: /you're on the list/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("ada@analytical.engine")).toBeInTheDocument();
  });

  it("shows the rate-limit message on 429", async () => {
    mutate.mockImplementation((_body: unknown, options: { onError?: (error: unknown) => void }) => {
      options.onError?.(new ApiError("limited", 429));
    });
    render(<WaitlistForm />);
    const user = await fillRequired();
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    expect(await screen.findByText("Too many attempts. Try again in a little while.")).toBeInTheDocument();
  });
});
