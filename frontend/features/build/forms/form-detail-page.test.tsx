import React from "react";
import { render, screen } from "@testing-library/react";
import { FormDetailPage } from "./form-detail-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build", () => ({
  useForm: jest.fn(),
  useDeleteForm: jest.fn(),
  useSubmitForm: jest.fn(),
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

jest.mock("./field-type-meta", () => ({
  FORM_TYPE_LABELS: { generic: "Generic" },
}));

import { useForm, useDeleteForm, useSubmitForm } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseForm = useForm as jest.Mock;
const mockUseDeleteForm = useDeleteForm as jest.Mock;
const mockUseSubmitForm = useSubmitForm as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

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

beforeEach(() => {
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
