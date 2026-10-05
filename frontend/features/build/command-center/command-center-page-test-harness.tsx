import type { ReactNode, HTMLAttributes } from "react";

export const mockUseOnlineStatus = jest.fn(() => true);
export const mockRouterPush = jest.fn();
export const mockSearchParamsRef = { current: new URLSearchParams() };
export const mockUseKeyboardShortcuts = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParamsRef.current,
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn() }),
  usePathname: () => "/build/command-center",
}));

jest.mock("./command-center-toolbar", () => ({
  CommandCenterToolbar: () => <div data-testid="command-center-toolbar" />,
}));

jest.mock("./use-dashboard-layout", () => ({
  useDashboardLayoutEditor: jest.fn(),
}));

jest.mock("./command-center-layout-manager", () => ({
  CommandCenterLayoutPanel: ({ children }: { children: ReactNode }) => <>{children}</>,
  LayoutResetButton: () => <button type="button">Reset layout</button>,
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: jest.fn(() => "/build/1/tickets/T-1"),
}));

jest.mock("@/components/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(),
}));

jest.mock("@/hooks/api/build/all-work", () => ({
  useInfiniteAllWork: jest.fn(),
  useAllWork: jest.fn(),
  COMMAND_CENTER_MY_ISSUES_FILTERS: { scope: "mine", limit: 20 },
}));

jest.mock("@/components/command-palette/hooks/use-command-palette", () => ({
  useCommandPalette: () => ({ openCreateTicket: jest.fn() }),
}));

jest.mock("@/features/build/project-create/project-create-wizard", () => ({
  ProjectCreateWizard: () => null,
}));

jest.mock("./use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: (...args: unknown[]) => mockUseKeyboardShortcuts(...args),
}));

jest.mock("./command-center-actions", () => ({
  QuickCreateMenu: () => null,
  CreateIssueButton: () => null,
}));

jest.mock("./command-center-pinned-nav", () => ({
  PinnedNav: () => <div data-testid="pinned-nav" />,
}));

jest.mock("./command-center-my-issues-panel", () => ({
  MyIssuesPanel: () => <div data-testid="my-issues-panel" />,
}));

jest.mock("./command-center-projects-panel", () => ({
  ProjectsPanel: () => <div data-testid="projects-panel" />,
}));

jest.mock("./command-center-approvals-panel", () => ({
  ApprovalsPanel: () => <div data-testid="approvals-panel" />,
}));

jest.mock("./command-center-agent-runs-panel", () => ({
  AgentRunsPanel: () => <div data-testid="agent-runs-panel" />,
}));

jest.mock("./command-center-risks-panel", () => ({
  RisksPanel: () => <div data-testid="risks-panel" />,
}));

jest.mock("./command-center-releases-panel", () => ({
  ReleasesPanel: () => <div data-testid="releases-panel" />,
}));

jest.mock("./command-center-rows", () => ({
  CommandCenterRow: () => null,
  ProjectCard: () => null,
}));

jest.mock("./command-center-blockers-panel", () => ({
  BlockersPanel: () => <div data-testid="blockers-panel" />,
}));

jest.mock("./command-center-my-work-row", () => ({
  MyWorkRow: () => null,
}));

jest.mock("./command-center-rows-model", () => ({
  projectHealthClasses: () => "",
  PROJECT_HEALTH_LABEL: {},
  STATUS_COLOR: {},
  isOverdue: () => false,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_PANEL: "",
}));

jest.mock("@/lib/motion-presets", () => ({
  pmSnappy: {},
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    p: ({ children, ...rest }: HTMLAttributes<HTMLParagraphElement>) => <p {...rest}>{children}</p>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
  }: {
    children: ReactNode;
    title?: string;
    contentClassName?: string;
    actions?: ReactNode;
    subtitle?: string;
  }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="stat-card">{label}{value}</div>
  ),
  StatCardGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  StatCardGridSkeleton: () => <div data-testid="stat-card-grid-skeleton" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description, onRetry }: { description?: string; onRetry?: () => void }) => (
    <div data-testid="error-state">
      {description}
      {onRetry ? <button onClick={onRetry}>Retry</button> : null}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));
