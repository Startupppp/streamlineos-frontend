import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LiveSessionJoinPage from "./page";

const join = jest.fn();
const submit = jest.fn();
let session: Record<string, unknown>;

jest.mock("next/navigation", () => ({
  useParams: () => ({ sessionCode: "ROOM42" }),
}));

jest.mock("@/hooks/api/surveys/live-session", () => ({
  usePublicLiveSession: () => ({
    data: session,
    isError: false,
    isSuccess: true,
  }),
  useJoinLiveSession: () => ({ mutateAsync: join, isPending: false }),
  useSubmitLiveAnswer: () => ({ mutateAsync: submit, isPending: false }),
}));

jest.mock("@/features/surveys/respondent/question-input", () => ({
  QuestionInput: ({ onChange }: { onChange: (value: { answerValue: string }) => void }) => (
    <button type="button" onClick={() => onChange({ answerValue: "yes" })}>
      Choose answer
    </button>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  join.mockResolvedValue({ participantToken: "participant-token" });
  submit.mockResolvedValue(undefined);
  session = {
    currentQuestion: { id: 1, title: "First question" },
  };
});

it("clears the previous answer draft when the live question identity changes", async () => {
  const view = render(<LiveSessionJoinPage />);
  fireEvent.click(screen.getByRole("button", { name: "Join" }));
  await screen.findByText("First question");

  fireEvent.click(screen.getByRole("button", { name: "Choose answer" }));
  expect(screen.getByRole("button", { name: "Submit answer" })).toBeEnabled();

  session = {
    currentQuestion: { id: 2, title: "Second question" },
  };
  view.rerender(<LiveSessionJoinPage />);

  expect(screen.getByText("Second question")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled(),
  );
});
