import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskOsClarifyCard } from "./ask-os-clarify-card";

const directive = {
  kind: "clarify" as const,
  clarificationId: "clr-1",
  purpose: "scope" as const,
  question: "Which bugs should I count?",
  options: [
    { id: "project:42", label: "This project", description: "Mobile app" },
    { id: "allAccessible", label: "All projects I can access" },
    { id: "mine", label: "My assigned work" },
  ],
  expiresAt: "2999-01-01T00:00:00.000Z",
};

describe("AskOsClarifyCard", () => {
  it("offers the options as a labelled radio group", () => {
    render(<AskOsClarifyCard directive={directive} onAnswer={jest.fn()} />);

    const group = screen.getByRole("radiogroup", { name: "Which bugs should I count?" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText("Mobile app")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("sends the chosen option with its clarification id, picked by keyboard", async () => {
    const onAnswer = jest.fn();
    render(<AskOsClarifyCard directive={directive} onAnswer={onAnswer} />);

    await userEvent.tab();
    await userEvent.keyboard(" ");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onAnswer).toHaveBeenCalledWith({
      clarificationId: "clr-1",
      optionId: "project:42",
      label: "This project",
    });
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.getByText("You chose: This project")).toBeInTheDocument();
  });

  it("sends a different option when another is selected", async () => {
    const onAnswer = jest.fn();
    render(<AskOsClarifyCard directive={directive} onAnswer={onAnswer} />);

    await userEvent.click(screen.getByRole("radio", { name: /My assigned work/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ optionId: "mine" }));
  });

  it("disables an expired question and says so", () => {
    render(
      <AskOsClarifyCard
        directive={{ ...directive, expiresAt: "2000-01-01T00:00:00.000Z" }}
        onAnswer={jest.fn()}
      />,
    );

    expect(screen.getByText("This question has expired. Ask again to continue.")).toBeInTheDocument();
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });

  it("is view only when it is not the latest turn", () => {
    render(<AskOsClarifyCard directive={directive} />);

    expect(screen.getByText("No longer active — view only.")).toBeInTheDocument();
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
  });
});
