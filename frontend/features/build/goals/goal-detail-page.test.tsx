import React from "react";
import { render, screen } from "@testing-library/react";
import { GoalDetailPage } from "./goal-detail-page";

jest.mock("@/hooks/api/goals", () => ({
  useGoal: jest.fn(),
  useDeleteGoal: jest.fn(),
  useRemoveGoalLink: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
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

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/features/build/goals/goal-detail-skeleton", () => ({
  GoalDetailSkeleton: () => <div data-testid="goal-detail-skeleton" />,
}));

jest.mock("@/features/build/goals/goal-form-sheet", () => ({
  GoalFormSheet: () => null,
}));

jest.mock("@/features/build/goals/check-in-dialog", () => ({
  CheckInDialog: () => null,
}));

jest.mock("@/features/build/goals/add-link-dialog", () => ({
  AddLinkDialog: () => null,
}));

jest.mock("@/features/build/goals/key-result-row", () => ({
  KeyResultRow: () => null,
}));

jest.mock("@/features/build/goals/link-row", () => ({
  LinkRow: () => null,
}));

jest.mock("@/features/build/goals/constants", () => ({
  STATUS_CONFIG: {
    not_started: { variant: "outline", label: "Not started" },
    on_track: { variant: "outline", label: "On track" },
    at_risk: { variant: "outline", label: "At risk" },
    off_track: { variant: "outline", label: "Off track" },
    completed: { variant: "outline", label: "Completed" },
  },
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/ui/progress", () => ({
  Progress: () => <div data-testid="progress" />,
}));

jest.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    open,
    children,
  }: {
    open?: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  AlertDialogAction: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    isPending: _p,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isPending?: boolean;
    loadingText?: string;
  }) => <button {...props}>{children}</button>,
}));

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
  PlusIcon: ({
    ref: _ref,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: {},
  }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/illustrations", () => ({
  EmptyTasksIllustration: () => <svg />,
  EmptyActivityIllustration: () => <svg />,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

import { useGoal, useDeleteGoal, useRemoveGoalLink } from "@/hooks/api/goals";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseGoal = useGoal as jest.Mock;
const mockUseDeleteGoal = useDeleteGoal as jest.Mock;
const mockUseRemoveGoalLink = useRemoveGoalLink as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_LOADING = { data: undefined, isLoading: true };
const ACCESS_GRANTED = {
  data: {
    isOrgOwner: false,
    scopes: { "build:goals:view": "all", "build:goals:manage": "all" },
    modules: { BUILD: true },
  },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: { BUILD: true } },
  isLoading: false,
};

function disabledQueryResult() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  };
}

function makeMutationResult() {
  return { mutate: jest.fn(), isPending: false };
}

const FULL_GOAL_DETAIL = {
  id: 42,
  title: "Ship goals module",
  description: null,
  status: "not_started",
  progress: 40,
  startDate: null,
  dueDate: null,
  project: null,
  owner: null,
  keyResults: [],
  links: [],
  updates: [],
};

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseGoal.mockReturnValue(disabledQueryResult());
  mockUseDeleteGoal.mockReturnValue(makeMutationResult());
  mockUseRemoveGoalLink.mockReturnValue(makeMutationResult());
});

it("shows loading skeleton not error state while access snapshot is still in flight because the disabled query has no data", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseGoal.mockReturnValue(disabledQueryResult());

  render(<GoalDetailPage goalId={42} />);

  expect(screen.getByTestId("goal-detail-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows denied state not error state when build:goals:view permission is absent", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseGoal.mockReturnValue(disabledQueryResult());

  render(<GoalDetailPage goalId={42} />);

  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("hides edit, delete and add-link controls when build:goals:manage is denied, because a control must not offer authority the caller may not hold", () => {
  mockUseCan.mockReturnValue(false);
  mockUseGoal.mockReturnValue({
    data: FULL_GOAL_DETAIL,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

  render(<GoalDetailPage goalId={42} />);

  expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  expect(screen.queryByText("Link")).not.toBeInTheDocument();
});

it("shows edit, delete and add-link controls when build:goals:manage is granted", () => {
  mockUseGoal.mockReturnValue({
    data: FULL_GOAL_DETAIL,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

  render(<GoalDetailPage goalId={42} />);

  expect(screen.getByText("Edit")).toBeInTheDocument();
  expect(screen.getByText("Delete")).toBeInTheDocument();
  expect(screen.getByText("Link")).toBeInTheDocument();
});
