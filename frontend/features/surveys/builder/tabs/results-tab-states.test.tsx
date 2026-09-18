import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { ResultsTab } from "./results-tab";

const ORG_ID = "org-1";
const USER_ID = "user-1";
const SURVEY_ID = 7;

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  authedFetch: jest.fn(),
  buildUrl: (path: string) => path,
  isApiError: (error: unknown) =>
    error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const ANALYST_ACCESS: AccessResponse = {
  scopes: { "surveys:analytics:view": "all", "surveys:responses:view": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
};

const NO_ANALYTICS_ACCESS: AccessResponse = {
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: {},
};

const SURVEY: SurveyForm = {
  id: SURVEY_ID,
  orgId: ORG_ID,
  title: "Onboarding pulse",
  description: null,
  mode: "survey",
  status: "published",
  ownerUserId: USER_ID,
  defaultLanguage: "en",
  activeVersionId: 3,
  settings: {},
  branding: {},
  createdBy: USER_ID,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  archivedAt: null,
};

const OVERVIEW_PATH = `/surveys/${SURVEY_ID}/analytics/overview`;
const QUESTIONS_PATH = `/surveys/${SURVEY_ID}/analytics/questions`;
const RESPONSES_PATH = `/surveys/${SURVEY_ID}/responses`;

function emptyOverview() {
  return {
    totalResponses: 0,
    submittedResponses: 0,
    completionRate: 0,
    averageCompletionTimeSeconds: null,
    averageScore: null,
    totalParticipants: 0,
  };
}

function populatedOverview() {
  return {
    totalResponses: 1,
    submittedResponses: 1,
    completionRate: 1,
    averageCompletionTimeSeconds: 42,
    averageScore: null,
    totalParticipants: 1,
  };
}

/** A client whose reads surface their error to the component instead of the route boundary. */
function testClient(access?: AccessResponse): QueryClient {
  const client = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false, throwOnError: false },
  });
  if (access) client.setQueryData(queryKeys.access.me(), access);
  return client;
}

function renderResults(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <ResultsTab survey={SURVEY} />
    </QueryClientProvider>,
  );
}

function never<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  mockedGet.mockReset();
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("the Results tab distinguishes loading from empty from denied", () => {
  it("shows the analytics skeleton, not a fabricated failure, while the access snapshot is still resolving", async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === "/me/access") return never();
      return Promise.resolve(populatedOverview());
    });

    renderResults(testClient());

    expect(await screen.findByTestId("survey-results-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the analytics skeleton while the overview request is in flight", async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === OVERVIEW_PATH) return never();
      if (path === QUESTIONS_PATH) return Promise.resolve([]);
      if (path === RESPONSES_PATH) return Promise.resolve({ items: [], total: 0 });
      return never();
    });

    renderResults(testClient(ANALYST_ACCESS));

    expect(await screen.findByTestId("survey-results-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/no responses yet/i)).not.toBeInTheDocument();
  });

  it("shows the no-responses empty state only once the overview has resolved with zero responses", async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === OVERVIEW_PATH) return Promise.resolve(emptyOverview());
      if (path === QUESTIONS_PATH) return Promise.resolve([]);
      if (path === RESPONSES_PATH) return Promise.resolve({ items: [], total: 0 });
      return never();
    });

    renderResults(testClient(ANALYST_ACCESS));

    expect(await screen.findByText(/no responses yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("survey-results-skeleton")).not.toBeInTheDocument();
  });

  it("renders the response totals once the delayed overview arrives", async () => {
    let resolveOverview: ((value: unknown) => void) | undefined;
    mockedGet.mockImplementation((path: string) => {
      if (path === OVERVIEW_PATH)
        return new Promise((resolve) => {
          resolveOverview = resolve;
        });
      if (path === QUESTIONS_PATH) return Promise.resolve([]);
      if (path === RESPONSES_PATH) return Promise.resolve({ items: [], total: 0 });
      return never();
    });

    renderResults(testClient(ANALYST_ACCESS));

    expect(await screen.findByTestId("survey-results-skeleton")).toBeInTheDocument();
    await waitFor(() => expect(resolveOverview).toBeDefined());
    resolveOverview?.(populatedOverview());

    expect(
      await screen.findByRole("heading", { name: "Question analytics" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("42s")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByTestId("survey-results-skeleton")).not.toBeInTheDocument(),
    );
  });

  it("offers a retry when the overview request fails", async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === OVERVIEW_PATH)
        return Promise.reject(new ApiError("Internal server error", 500));
      if (path === QUESTIONS_PATH) return Promise.resolve([]);
      if (path === RESPONSES_PATH) return Promise.resolve({ items: [], total: 0 });
      return never();
    });

    renderResults(testClient(ANALYST_ACCESS));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("tells a viewer without the analytics key that access is restricted rather than that results failed", async () => {
    mockedGet.mockImplementation(() => never());

    renderResults(testClient(NO_ANALYTICS_ACCESS));

    expect(await screen.findByText("surveys:analytics:view")).toBeInTheDocument();
    expect(
      mockedGet.mock.calls.filter((call) => call[0] === OVERVIEW_PATH),
    ).toHaveLength(0);
  });
});
