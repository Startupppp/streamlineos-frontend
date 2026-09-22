import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import { SurveysPage } from "./surveys-page";

const ORG_ID = "org-1";
const USER_ID = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1", role: "MEMBER" } },
    status: "authenticated",
  }),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    name,
    value,
    onValueChange,
    children,
  }: {
    name?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    children: ReactNode;
  }) => (
    <select aria-label={name} value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
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

function survey(id: number, status: SurveyForm["status"], title: string): SurveyForm {
  return {
    id,
    orgId: ORG_ID,
    title,
    description: null,
    mode: "survey",
    status,
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
}

const DRAFT = survey(1, "draft", "Onboarding pulse (draft)");
const PUBLISHED = survey(2, "published", "Quarterly engagement (published)");

function listPage(items: SurveyForm[]) {
  return { items, total: items.length, page: 1, pageSize: 100, totalPages: 1 };
}

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

function renderPage(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <SurveysPage />
    </QueryClientProvider>,
  );
}

function never<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

type ListParams = { status?: string } | undefined;

let consoleError: jest.SpyInstance;

beforeEach(() => {
  mockedGet.mockReset();
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("the surveys list renders only what the current filter returned", () => {
  it("keeps the page title while the list is in flight, and shows a skeleton rather than nothing", async () => {
    mockedGet.mockImplementation((path: string) => {
      if (path === "/surveys") return never();
      return never();
    });

    renderPage(testClient(VIEWER_ACCESS));

    expect(await screen.findByRole("heading", { name: "Surveys" })).toBeInTheDocument();
    expect(screen.queryByText(/no surveys/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("drops the previous filter's rows the moment the Draft filter is chosen, so a Published survey never shows under Draft", async () => {
    mockedGet.mockImplementation((path: string, params?: unknown) => {
      if (path !== "/surveys") return never();
      const status = (params as ListParams)?.status;
      if (status === "draft") return never();
      return Promise.resolve(listPage([DRAFT, PUBLISHED]));
    });

    renderPage(testClient(VIEWER_ACCESS));
    expect(await screen.findByText(PUBLISHED.title)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "status" }), "draft");

    await waitFor(() => expect(screen.queryByText(PUBLISHED.title)).not.toBeInTheDocument());
    expect(screen.queryByText(DRAFT.title)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith(
        "/surveys",
        expect.objectContaining({ status: "draft" }),
        expect.anything(),
        expect.anything(),
      ),
    );
  });

  it("offers Clear filters, not a second Create survey, when a filter matched nothing", async () => {
    mockedGet.mockImplementation((path: string, params?: unknown) => {
      if (path !== "/surveys") return never();
      const status = (params as ListParams)?.status;
      return Promise.resolve(listPage(status === "draft" ? [] : [PUBLISHED]));
    });

    renderPage(testClient(VIEWER_ACCESS));
    expect(await screen.findByText(PUBLISHED.title)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "status" }), "draft");

    expect(await screen.findByText("No surveys match your filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
    expect(screen.queryByText("No surveys yet")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /create survey/i })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(await screen.findByText(PUBLISHED.title)).toBeInTheDocument();
  });

  it("shows the create empty state only when the organisation has no surveys at all", async () => {
    mockedGet.mockImplementation((path: string) =>
      path === "/surveys" ? Promise.resolve(listPage([])) : never(),
    );

    renderPage(testClient(VIEWER_ACCESS));

    expect(await screen.findByText("No surveys yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create survey/i })).toHaveAttribute("href", "/surveys/new");
  });

  it("surfaces a failed list read as an error with retry, never as an empty list", async () => {
    mockedGet.mockImplementation((path: string) =>
      path === "/surveys" ? Promise.reject(new ApiError("Survey list is unavailable", 500)) : never(),
    );

    renderPage(testClient(VIEWER_ACCESS));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Survey list is unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText(/no surveys/i)).not.toBeInTheDocument();
  });
});
