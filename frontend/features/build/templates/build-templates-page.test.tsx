import React from "react";
import { render, screen } from "@testing-library/react";
import { BuildTemplatesPage } from "./build-templates-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build", () => ({
  useProjectTemplates: jest.fn(),
  useDeleteProjectTemplate: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: (props: React.HTMLAttributes<HTMLSpanElement>) => <span {...props} />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    actions,
  }: {
    children: React.ReactNode;
    title?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "pm-fill-panel",
  PM_PANEL: "pm-panel",
}));

jest.mock("@/components/illustrations", () => ({
  EmptyProjectsIllustration: () => null,
}));

jest.mock("./template-card", () => ({
  TemplateCard: () => <div data-testid="template-card" />,
}));

jest.mock("./create-template-sheet", () => ({
  CreateTemplateSheet: () => null,
}));

jest.mock("./apply-template-dialog", () => ({
  ApplyTemplateDialog: () => null,
}));

import { useProjectTemplates, useDeleteProjectTemplate } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProjectTemplates = useProjectTemplates as jest.Mock;
const mockUseDeleteProjectTemplate = useDeleteProjectTemplate as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all", "build:manage": "all" }, modules: {} },
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

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectTemplates.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseDeleteProjectTemplate.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("shows a skeleton while the access snapshot is in flight, not an empty or denied state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseProjectTemplates.mockReturnValue(baseQueryResult());
  render(<BuildTemplatesPage />);
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByText(/access restricted/i)).not.toBeInTheDocument();
});

it("shows plan denial view with upgrade link when query returns 402 MODULE_NOT_ENABLED, not a generic error", () => {
  mockUseProjectTemplates.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "build",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      }),
    }),
  );
  render(<BuildTemplatesPage />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("shows denial view when user lacks build:view, instead of an empty state", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseProjectTemplates.mockReturnValue(baseQueryResult());
  render(<BuildTemplatesPage />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("hides the create template button when the user lacks build:manage permission", () => {
  mockUseCan.mockImplementation((key: string) => key !== "build:manage");
  render(<BuildTemplatesPage />);
  expect(screen.queryByText(/new template/i)).not.toBeInTheDocument();
});
