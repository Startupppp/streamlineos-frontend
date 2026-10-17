import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { apiClient } from "@/lib/api-client";
import type { ProjectForm } from "@/types/projects/forms";
import { toast } from "sonner";
import { FormDetailPage } from "./form-detail-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build/forms", () => ({
  useUpdateForm: jest.requireActual<typeof import("@/hooks/api/build/forms")>("@/hooks/api/build/forms").useUpdateForm,
  useForm: jest.fn(),
  useDeleteForm: jest.fn(),
  useSubmitForm: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  ...jest.requireActual<typeof import("@/lib/api-client")>("@/lib/api-client"),
  apiClient: { patch: jest.fn() },
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: () => null,
  DialogContent: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}));

jest.mock("./components/form-builder-tab", () => ({
  FormBuilderTab: () => <div data-testid="form-builder-tab" />,
  FormBuilderTabSkeleton: () => <div data-testid="form-builder-skeleton" />,
}));

jest.mock("./components/form-submissions-tab", () => ({
  FormSubmissionsTab: () => <div data-testid="form-submissions-tab" />,
}));

jest.mock("./dynamic-form-renderer", () => ({
  DynamicFormRenderer: () => null,
}));

import { useForm, useDeleteForm, useSubmitForm } from "@/hooks/api/build/forms";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseForm = useForm as jest.Mock;
const mockUseDeleteForm = useDeleteForm as jest.Mock;
const mockUseSubmitForm = useSubmitForm as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockPatch = jest.mocked(apiClient.patch);
const { FormBuilderTab: ActualFormBuilderTab } = jest.requireActual<typeof import("./components/form-builder-tab")>("./components/form-builder-tab");

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:forms:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };
function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

const FORM_DATA = {
  id: 1,
  name: "Test Form",
  type: "generic" as const,
  fields: [],
  actions: [],
  isActive: true,
  isPublic: false,
  publicToken: null,
  formNumber: 1,
  description: null,
  createdAt: "2026-01-01T00:00:00Z",
};

const BUILDER_FORM: ProjectForm = {
  ...FORM_DATA,
  orgId: "org-1",
  projectId: 1,
  description: "Existing description",
  createdBy: null,
  updatedAt: "2026-01-01T00:00:00Z",
  deletedAt: null,
};

function renderBuilder(form: ProjectForm = BUILDER_FORM) {
  mockUseForm.mockReturnValue(baseQueryResult({ data: form }));
  const client = createAppQueryClient("authenticated:org-1:user-1");
  return render(
    <QueryClientProvider client={client}>
      <ActualFormBuilderTab projectId={1} formId={1} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPatch.mockReset();
  mockPatch.mockResolvedValue(BUILDER_FORM);
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseForm.mockReturnValue(baseQueryResult({ data: FORM_DATA }));
  mockUseDeleteForm.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseSubmitForm.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("shows loading skeleton while access snapshot is in flight, not an error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseForm.mockReturnValue(baseQueryResult());
  render(<FormDetailPage projectId={1} formId={1} />);
  expect(screen.getByTestId("form-builder-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows plan denial view with upgrade link when query returns 402 MODULE_NOT_ENABLED, not a generic error", () => {
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseForm.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "build",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      }),
    }),
  );
  render(<FormDetailPage projectId={1} formId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("shows denial view when user lacks build:forms:view, not an error or empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseForm.mockReturnValue(baseQueryResult());
  render(<FormDetailPage projectId={1} formId={1} />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it.each(["", " \n "])("saves an explicitly empty description after clearing the real builder textarea to %j", async (value) => {
  const user = userEvent.setup();
  renderBuilder();
  const description = screen.getByPlaceholderText("Optional — describe the purpose of this form");
  expect(description).toBeInstanceOf(HTMLTextAreaElement);
  expect(description).toHaveValue("Existing description");
  await user.clear(description);
  if (value) await user.type(description, value);
  await user.click(screen.getByRole("button", { name: "Save Form" }));
  await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
  expect(mockPatch).toHaveBeenCalledWith(
    "/build/1/forms/1",
    { name: "Test Form", description: "", type: "generic", fields: [], actions: [], isActive: true, isPublic: false },
    undefined,
    expect.any(Function),
  );
});

it.each([
  { initial: "Existing description", edit: "  Updated description  ", expected: "Updated description" },
  { initial: null, edit: null, expected: undefined },
  { initial: "", edit: null, expected: undefined },
])("preserves description semantics for $initial with edit $edit", async ({ initial, edit, expected }) => {
  const user = userEvent.setup();
  renderBuilder({ ...BUILDER_FORM, description: initial });
  const description = screen.getByPlaceholderText("Optional — describe the purpose of this form");
  if (edit !== null) {
    await user.clear(description);
    await user.type(description, edit);
  }
  await user.click(screen.getByRole("button", { name: "Save Form" }));
  await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1));
  expect(mockPatch.mock.calls[0]?.[1]).toEqual({ name: "Test Form", description: expected, type: "generic", fields: [], actions: [], isActive: true, isPublic: false });
});

it("disables duplicate Save while pending and retries the exact cleared draft after failure", async () => {
  const user = userEvent.setup();
  let rejectFirst: (error: Error) => void = () => { throw new Error("Mutation has not started"); };
  mockPatch.mockReturnValueOnce(new Promise<ProjectForm>((resolve, reject) => { rejectFirst = reject; }));
  renderBuilder();
  const description = screen.getByPlaceholderText("Optional — describe the purpose of this form");
  await user.clear(description);
  await user.click(screen.getByRole("button", { name: "Save Form" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled());
  await user.click(screen.getByRole("button", { name: "Saving…" }));
  expect(mockPatch).toHaveBeenCalledTimes(1);
  expect(toast.success).not.toHaveBeenCalled();
  await act(async () => rejectFirst(new ApiError("Try again", 503, "SERVICE_UNAVAILABLE")));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Try again"));
  expect(description).toHaveValue("");
  await user.click(screen.getByRole("button", { name: "Save Form" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  expect(toast.success).toHaveBeenCalledWith("Form saved");
  expect(mockPatch).toHaveBeenCalledTimes(2);
  expect(mockPatch.mock.calls[1]).toEqual(mockPatch.mock.calls[0]);
});

it("keeps the actual builder read only without manage permission and issues no update", () => {
  mockUseCan.mockImplementation((permission: string) => permission === "build:forms:view");
  renderBuilder();
  expect(screen.getByPlaceholderText("Optional — describe the purpose of this form")).toHaveAttribute("readonly");
  expect(screen.getByPlaceholderText("e.g. Bug Report Form")).toHaveAttribute("readonly");
  expect(screen.getByRole("combobox")).toBeDisabled();
  screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
  expect(screen.queryByRole("button", { name: "Save Form" })).not.toBeInTheDocument();
  expect(mockPatch).not.toHaveBeenCalled();
});

it("refuses a whitespace-only name before any update", () => {
  renderBuilder();
  fireEvent.change(screen.getByPlaceholderText("e.g. Bug Report Form"), { target: { value: " \n " } });
  expect(screen.getByRole("button", { name: "Save Form" })).toBeDisabled();
  expect(mockPatch).not.toHaveBeenCalled();
});
