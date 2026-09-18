import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api-envelope";
import PublicSurveyPage from "./page";

const COLLECTOR_TOKEN = "tok-123";
const SESSION_ID = 51;

const SURVEY_PATH = `/public/surveys/${COLLECTOR_TOKEN}`;
const START_PATH = `/public/surveys/${COLLECTOR_TOKEN}/start`;
const SUBMIT_PATH = `/public/surveys/${COLLECTOR_TOKEN}/session/${SESSION_ID}/submit`;

jest.mock("next/navigation", () => ({
  useParams: () => ({ collectorToken: "tok-123" }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  isApiError: (error: unknown) =>
    error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const PUBLIC_SURVEY = {
  survey: {
    id: 4,
    title: "Onboarding pulse",
    description: "One quick question.",
    mode: "survey",
    defaultLanguage: "en",
    branding: {},
    settings: {},
  },
  schema: {
    sections: [
      {
        id: 1,
        title: "Section one",
        description: null,
        sortOrder: 0,
        questions: [
          {
            id: 11,
            questionKey: "q1",
            variableName: null,
            type: "short_text",
            title: "How did onboarding go?",
            description: null,
            required: false,
            settings: {},
            sortOrder: 0,
            choices: [],
          },
        ],
      },
    ],
    logicRules: [],
  },
};

function testClient(): QueryClient {
  const client = createAppQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false, throwOnError: false },
  });
  return client;
}

function renderPage() {
  return render(
    <QueryClientProvider client={testClient()}>
      <TooltipProvider>
        <PublicSurveyPage />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

function submitCallCount(): number {
  return mockedPost.mock.calls.filter((call) => call[0] === SUBMIT_PATH).length;
}

async function reachTheLastQuestion(): Promise<void> {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /start survey/i }));
  await screen.findByText("How did onboarding go?");
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  (toast.error as jest.Mock).mockReset();
  mockedGet.mockImplementation((path: string) => {
    if (path === SURVEY_PATH) return Promise.resolve(PUBLIC_SURVEY);
    return new Promise(() => {});
  });
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("the public survey Submit reports its own progress", () => {
  it("keeps Submit disabled and showing progress for the whole submit request, not just the local step", async () => {
    let resolveSubmit: ((value: unknown) => void) | undefined;
    mockedPost.mockImplementation((path: string) => {
      if (path === START_PATH)
        return Promise.resolve({ id: SESSION_ID, status: "in_progress" });
      if (path === SUBMIT_PATH)
        return new Promise((resolve) => {
          resolveSubmit = resolve;
        });
      return new Promise(() => {});
    });

    renderPage();
    await reachTheLastQuestion();

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    const pending = await screen.findByRole("button", { name: /submitting/i });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");
    await waitFor(() => expect(resolveSubmit).toBeDefined());
  });

  it("records one response however many times Submit is clicked", async () => {
    let resolveSubmit: ((value: unknown) => void) | undefined;
    mockedPost.mockImplementation((path: string) => {
      if (path === START_PATH)
        return Promise.resolve({ id: SESSION_ID, status: "in_progress" });
      if (path === SUBMIT_PATH)
        return new Promise((resolve) => {
          resolveSubmit = resolve;
        });
      return new Promise(() => {});
    });

    renderPage();
    await reachTheLastQuestion();

    const submit = screen.getByRole("button", { name: /submit/i });
    fireEvent.click(submit);
    await screen.findByRole("button", { name: /submitting/i });
    fireEvent.click(screen.getByRole("button", { name: /submitting/i }));
    fireEvent.click(screen.getByRole("button", { name: /submitting/i }));

    await waitFor(() => expect(resolveSubmit).toBeDefined());
    expect(submitCallCount()).toBe(1);
  });

  it("shows the thank-you state once the delayed submit resolves", async () => {
    let resolveSubmit: ((value: unknown) => void) | undefined;
    mockedPost.mockImplementation((path: string) => {
      if (path === START_PATH)
        return Promise.resolve({ id: SESSION_ID, status: "in_progress" });
      if (path === SUBMIT_PATH)
        return new Promise((resolve) => {
          resolveSubmit = resolve;
        });
      return new Promise(() => {});
    });

    renderPage();
    await reachTheLastQuestion();

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await screen.findByRole("button", { name: /submitting/i });
    await waitFor(() => expect(resolveSubmit).toBeDefined());
    resolveSubmit?.({ id: SESSION_ID, status: "submitted", score: null, passed: null });

    expect(await screen.findByText("Thank you!")).toBeInTheDocument();
    expect(await screen.findByText(/your response has been recorded/i)).toBeInTheDocument();
  });

  it("re-enables Submit and explains the failure so the respondent can retry", async () => {
    mockedPost.mockImplementation((path: string) => {
      if (path === START_PATH)
        return Promise.resolve({ id: SESSION_ID, status: "in_progress" });
      if (path === SUBMIT_PATH)
        return Promise.reject(new ApiError("Survey temporarily unavailable", 503));
      return new Promise(() => {});
    });

    renderPage();
    await reachTheLastQuestion();

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const submit = await screen.findByRole("button", { name: /submit/i });
    await waitFor(() => expect(submit).not.toBeDisabled());
    expect(screen.queryByText("Thank you!")).not.toBeInTheDocument();
  });
});
