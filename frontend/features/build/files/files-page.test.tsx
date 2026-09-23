import { render, screen } from "@testing-library/react";
import { FilesPage } from "./files-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build/project-files", () => ({
  useProjectFiles: jest.fn(),
  useUploadProjectFile: jest.fn(),
  useDeleteProjectFile: jest.fn(),
  useProjectFileSignedUrl: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("framer-motion", () => ({
  motion: { div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div> },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
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
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <button onClick={onRetry}>Retry</button>
  ),
}));
jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));
jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));
jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: ({ ...props }: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));
jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    trigger,
    onConfirm,
  }: {
    trigger: React.ReactNode;
    title: string;
    description: string;
    onConfirm: () => void;
  }) => (
    <div>
      {trigger}
      <button onClick={onConfirm}>Confirm Delete</button>
    </div>
  ),
}));
jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_PANEL_SOLID: "content-panel-solid",
}));

import {
  useProjectFiles,
  useUploadProjectFile,
  useDeleteProjectFile,
  useProjectFileSignedUrl,
} from "@/hooks/api/build/project-files";
import { useCan, useAccess } from "@/hooks/api/access";

const mockUseProjectFiles = useProjectFiles as jest.Mock;
const mockUseUploadProjectFile = useUploadProjectFile as jest.Mock;
const mockUseDeleteProjectFile = useDeleteProjectFile as jest.Mock;
const mockUseProjectFileSignedUrl = useProjectFileSignedUrl as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:files:view": "all", "build:files:manage": "all" }, modules: {} },
  isLoading: false,
};

const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseQueryResult(overrides = {}) {
  return {
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProjectFiles.mockReturnValue(baseQueryResult());
  mockUseUploadProjectFile.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteProjectFile.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseProjectFileSignedUrl.mockReturnValue({ data: undefined, isFetching: false });
});

it("renders denied state when build:files:view is not in the access snapshot", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  render(<FilesPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toHaveTextContent("build:files:view");
});

it("renders empty state when there are no files", () => {
  mockUseProjectFiles.mockReturnValue(baseQueryResult({ data: [] }));
  render(<FilesPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toBeInTheDocument();
});

it("renders error state and retry on query failure", () => {
  mockUseProjectFiles.mockReturnValue(baseQueryResult({ isError: true }));
  render(<FilesPage projectId={1} />);
  expect(screen.getByText("Retry")).toBeInTheDocument();
});

it("renders file cards when data is populated", () => {
  mockUseProjectFiles.mockReturnValue(
    baseQueryResult({
      data: [
        {
          id: 1,
          orgId: "org-1",
          projectId: 1,
          uploadedByMembershipId: 7,
          fileName: "project-brief.pdf",
          mimeType: "application/pdf",
          sizeBytes: 204800,
          createdAt: new Date(0).toISOString(),
          deletedAt: null,
        },
      ],
    }),
  );
  render(<FilesPage projectId={1} />);
  expect(screen.getByText("project-brief.pdf")).toBeInTheDocument();
});

it("hides delete button when canManage is false", () => {
  mockUseCan.mockImplementation((key: string) => key === "build:files:view");
  mockUseProjectFiles.mockReturnValue(
    baseQueryResult({
      data: [
        {
          id: 1,
          orgId: "org-1",
          projectId: 1,
          uploadedByMembershipId: 7,
          fileName: "specs.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          sizeBytes: 512000,
          createdAt: new Date(0).toISOString(),
          deletedAt: null,
        },
      ],
    }),
  );
  render(<FilesPage projectId={1} />);
  expect(screen.queryByText("Confirm Delete")).not.toBeInTheDocument();
});

it("shows skeleton and not a denial while the access snapshot is still in flight because useCan answers false before access lands", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseCan.mockReturnValue(false);
  mockUseProjectFiles.mockReturnValue(baseQueryResult({ data: [], isLoading: false }));
  render(<FilesPage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the plan upgrade link the backend sent with a 402 MODULE_NOT_ENABLED instead of a generic error", () => {
  mockUseProjectFiles.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<FilesPage projectId={1} />);
  expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute("href", "/settings/billing");
});
