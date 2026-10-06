import React from "react";

export const currentSearchRef = { current: new URLSearchParams() };
export const mockReplace = jest.fn();
export const mockIsApiError = jest.fn((_e: unknown): _e is { status: number } => false);
export const mockUseOnlineStatus = jest.fn();
export const mockUsePageState = jest.fn();
export const mockUseCan = jest.fn();
export const mockUsePortalSettings = jest.fn();
export const mockUsePublishPortal = jest.fn();
export const mockUseUnpublishPortal = jest.fn();
export const mockUsePortalPreview = jest.fn();
export const mockUseProjectClientGrants = jest.fn();
export const mockRevokeMutate = jest.fn();
export const mockUseRevokeGrant = jest.fn(
  (grantId: string): { mutate: jest.Mock; isPending: boolean; grantId: string } => ({
    mutate: mockRevokeMutate,
    isPending: false,
    grantId,
  }),
);

let capturedTabOnValueChange: ((v: string) => void) | undefined;

jest.mock("@/lib/api-envelope", () => ({
  isApiError: (e: unknown) => mockIsApiError(e),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchRef.current,
  useRouter: () => ({ replace: mockReplace, refresh: jest.fn() }),
  usePathname: () => "/build/1/client-portal",
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
  PM_ROW: "pm-row-class",
  PM_PANEL: "pm-panel-class",
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
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({ tabs }: { tabs: React.ReactNode }) => <div>{tabs}</div>,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  CONTENT_FILL_PANEL: "content-fill-panel-class",
}));

jest.mock("./client-visibility-page", () => ({
  ClientVisibilityPage: () => <div data-testid="visibility-page-stub" />,
}));

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => {
    capturedTabOnValueChange = onValueChange;
    return <div data-active-tab={value}>{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button
      role="tab"
      data-value={value}
      onClick={() => capturedTabOnValueChange?.(value)}
    >
      {children}
    </button>
  ),
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-tab-content={value}>{children}</div>,
}));

jest.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean;
    onCheckedChange?: (v: boolean) => void;
    disabled?: boolean;
    "aria-label"?: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    onConfirm,
    onOpenChange,
  }: {
    open?: boolean;
    title?: string;
    onConfirm?: () => void;
    onOpenChange?: (v: boolean) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={() => onOpenChange?.(false)}>Cancel</button>
      </div>
    ) : null,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) =>
    e instanceof Error ? e.message : String(e),
}));

jest.mock("@/hooks/api/build/client-portal-management", () => ({
  usePortalSettings: () => mockUsePortalSettings(),
  usePublishPortal: () => mockUsePublishPortal(),
  useUnpublishPortal: () => mockUseUnpublishPortal(),
  usePortalPreview: () => mockUsePortalPreview(),
}));

jest.mock("@/hooks/api/portal-access/grants", () => ({
  useProjectClientGrants: (params?: unknown) => mockUseProjectClientGrants(params),
  useRevokeGrant: (grantId: string) => mockUseRevokeGrant(grantId),
}));

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: ({
    pageNumber,
    hasMore,
    onNext,
    onPrevious,
  }: {
    pageNumber?: number;
    hasMore: boolean;
    onNext: () => void;
    onPrevious: () => void;
  }) => (
    <div data-testid="cursor-page-controls" data-page={pageNumber ?? 1}>
      <button type="button" onClick={onPrevious}>
        Previous
      </button>
      <button type="button" disabled={!hasMore} onClick={onNext}>
        Next
      </button>
    </div>
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockUseCan(),
  useCanState: () => "allowed",
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockUsePageState(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    children,
    resolution,
  }: {
    children: React.ReactNode;
    resolution: { kind: string };
    loading?: React.ReactNode;
    onRetry?: () => void;
  }) =>
    resolution.kind === "ready" ? <>{children}</> : null,
}));
