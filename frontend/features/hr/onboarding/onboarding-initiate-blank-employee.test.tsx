import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OnboardingInitiateSheet } from "./onboarding-initiate-sheet";

const mutate = jest.fn();

jest.mock("@/hooks/api/hr/onboarding", () => ({
  useInitiateOnboarding: () => ({ mutate, isPending: false }),
  useOnboardingStatus: () => ({ data: [] }),
}));

jest.mock("@/features/hr/shared/employee-picker", () => ({
  EmployeePicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (next: string) => void;
  }) => (
    <input
      aria-label="Employee"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

function startButton(): HTMLElement {
  return screen.getByRole("button", { name: /start onboarding/i });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("BUG-003 Initiate Onboarding cannot start without an employee", () => {
  it("starts onboarding once an employee is chosen, so the refusals below are not passing on a dead control", async () => {
    render(<OnboardingInitiateSheet open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("Employee"), {
      target: { value: "user-7" },
    });
    fireEvent.click(startButton());

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0][0]).toBe("user-7");
  });

  it("starts no onboarding when Employee is blank", async () => {
    render(<OnboardingInitiateSheet open onOpenChange={jest.fn()} />);
    fireEvent.click(startButton());

    await waitFor(() =>
      expect(screen.getByText(/please select an employee/i)).toBeInTheDocument(),
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("names the required field inline rather than only refusing silently", async () => {
    render(<OnboardingInitiateSheet open onOpenChange={jest.fn()} />);
    fireEvent.click(startButton());

    await waitFor(() =>
      expect(screen.getByText(/please select an employee/i)).toBeInTheDocument(),
    );
  });

  it("starts one onboarding at most when Start is clicked twice on a blank form", async () => {
    render(<OnboardingInitiateSheet open onOpenChange={jest.fn()} />);
    fireEvent.click(startButton());
    fireEvent.click(startButton());

    await waitFor(() =>
      expect(screen.getByText(/please select an employee/i)).toBeInTheDocument(),
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it("refuses a selection that is only whitespace, which no picker should produce but the schema must not accept", async () => {
    render(<OnboardingInitiateSheet open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("Employee"), { target: { value: "   " } });
    fireEvent.click(startButton());

    await waitFor(() =>
      expect(screen.getByText(/please select an employee/i)).toBeInTheDocument(),
    );
    expect(mutate).not.toHaveBeenCalled();
  });
});
