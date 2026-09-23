import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { SurveyDetailContent } from "./survey-detail-content";

const ORG_ID = "org-1";
const USER_ID = "user-1";
const SURVEY_ID = 7;
const SURVEY_PATH = `/surveys/${SURVEY_ID}`;

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1", role: "MEMBER" } },
    status: "authenticated",
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/surveys/7",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/features/surveys/builder/survey-builder-tabs", () => ({
  SurveyBuilderTabs: ({ survey }: { survey: SurveyForm }) => <div data-testid="builder-tabs">{survey.title}</div>,
}));

jest.mock("@/features/surveys/builder/survey-activity-panel", () => ({
  SurveyActivityPanel: () => <aside data-testid="activity-panel" />,
}));

jest.mock("@/features/surveys/builder/survey-builder-header", () => ({
  SurveyBuilderHeader: () => <div data-testid="builder-header" />,
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
  isApiError: (error: unknown) => error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const VIEWER_ACCESS: AccessResponse = {
  scopes: { "surveys:view": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { surveys: true },
};

const NO_SURVEY_ACCESS: AccessResponse = {
  scopes: {},
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { surveys: true },
};

const SURVEY: SurveyForm = {
  id: SURVEY_ID,
  orgId: ORG_ID,
  title: "Onboarding pulse",
  description: null,
  mode: "survey",
  status: "draft",
  ownerUserId: USER_ID,
  defaultLanguage: "en",
  activeVersionId: null,
  settings: {},
  branding: {},
  createdBy: USER_ID,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  archivedAt: null,
};

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

function renderDetail(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <SurveyDetailContent surveyId={SURVEY_ID} />
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

describe("the survey detail page never leaves a reader on an unexplained skeleton", () => {
  it("keeps the page title and shows the builder skeleton while the survey is in flight", async () => {
    mockedGet.mockImplementation(() => never());

    renderDetail(testClient(VIEWER_ACCESS));

    expect(await screen.findByRole("heading", { name: "Survey" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByTestId("builder-tabs")).not.toBeInTheDocument();
  });

  it("replaces the skeleton with the backend's own message and a retry that refetches when the read fails", async () => {
    mockedGet
      .mockImplementationOnce((path: string) =>
        path === SURVEY_PATH ? Promise.reject(new ApiError("Survey detail is unavailable", 500)) : never(),
      )
      .mockImplementation((path: string) => (path === SURVEY_PATH ? Promise.resolve(SURVEY) : never()));

    renderDetail(testClient(VIEWER_ACCESS));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Survey detail is unavailable")).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByTestId("builder-tabs")).toHaveTextContent(SURVEY.title);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("renders the survey title, builder tabs and activity panel once the survey arrives", async () => {
    mockedGet.mockImplementation((path: string) => (path === SURVEY_PATH ? Promise.resolve(SURVEY) : never()));

    renderDetail(testClient(VIEWER_ACCESS));

    expect(await screen.findByRole("heading", { name: SURVEY.title })).toBeInTheDocument();
    expect(screen.getByTestId("builder-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("activity-panel")).toBeInTheDocument();
  });

  it("tells a reader without surveys:view that access is restricted rather than leaving the skeleton up", async () => {
    mockedGet.mockImplementation(() => never());

    renderDetail(testClient(NO_SURVEY_ACCESS));

    expect(await screen.findByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(mockedGet).not.toHaveBeenCalledWith(SURVEY_PATH, undefined, expect.anything(), expect.anything());
  });
});
