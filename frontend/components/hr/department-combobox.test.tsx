import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { DepartmentCombobox } from "@/components/hr/department-combobox";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  isApiError: (error: unknown) =>
    error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const ACCESS: AccessResponse = {
  scopes: { "hr:employees:manage": "all", "hr:employees:view": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { hr: true },
};

function client(): QueryClient {
  const queryClient = createAppQueryClient(authenticatedScope("org-1", "user-1"));
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
  queryClient.setQueryData(queryKeys.access.me(), ACCESS);
  return queryClient;
}

function Harness({
  departments,
  onChange,
}: {
  departments?: ReadonlyArray<{ id: string; name: string }>;
  onChange: (value: string | undefined) => void;
}) {
  const [value, setValue] = useState<string | undefined>(undefined);
  function handleValueChange(next: string | undefined) {
    setValue(next);
    onChange(next);
  }
  return (
    <DepartmentCombobox
      value={value ?? null}
      departments={departments}
      onValueChange={handleValueChange}
    />
  );
}

beforeEach(() => {
  mockedPost.mockReset();
  mockedGet.mockReset();
  mockedGet.mockResolvedValue([]);
});

describe("creating a department from the picker selects it, because leaving the form field undefined surfaces as a raw Zod message on submit", () => {
  it("selects the created department when the parent supplied the list, so the picker's own read is disabled and no refetch can resolve the new id", async () => {
    mockedPost.mockResolvedValue({ id: "dept-new", name: "QA Audit Dept" });
    const onChange = jest.fn();

    render(
      <QueryClientProvider client={client()}>
        <Harness departments={[]} onChange={onChange} />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(
      screen.getByPlaceholderText("Search or add department..."),
      "QA Audit Dept",
    );
    await userEvent.click(screen.getByText('Add "QA Audit Dept"'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("dept-new"));
    expect(onChange).not.toHaveBeenCalledWith(undefined);
  });

  it("shows the created department on the trigger rather than the placeholder", async () => {
    mockedPost.mockResolvedValue({ id: "dept-new", name: "QA Audit Dept" });

    render(
      <QueryClientProvider client={client()}>
        <Harness departments={[]} onChange={jest.fn()} />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.type(
      screen.getByPlaceholderText("Search or add department..."),
      "QA Audit Dept",
    );
    await userEvent.click(screen.getByText('Add "QA Audit Dept"'));

    await waitFor(() =>
      expect(screen.getByRole("combobox")).toHaveTextContent("QA Audit Dept"),
    );
  });

  it("tells an empty organisation to create one instead of reporting a failed search", async () => {
    render(
      <QueryClientProvider client={client()}>
        <Harness departments={[]} onChange={jest.fn()} />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole("combobox"));

    expect(
      await screen.findByText(
        "No departments yet — type a name above to create one.",
      ),
    ).toBeInTheDocument();
  });
});
