import type { ChangeEvent, ReactNode } from "react";

/**
 * The presentational doubles the two inbox suites share.
 *
 * Kept out of the suites themselves because each `jest.mock` factory here is
 * ~15 lines and duplicating them put one suite over the 500-line ceiling.
 * Only inert render stubs live here; every spy stays in the suite that asserts
 * on it, so no assertion can leak between files.
 */

interface MockDataTableProps {
  data: unknown[];
  emptyState?: ReactNode;
  selection?: unknown;
  pagination?: {
    mode?: string;
    hasMore?: boolean;
    hasPrevious?: boolean;
    total?: number;
    onNext?: () => void;
    onPrevious?: () => void;
  };
}

export const dataTableModule = {
  DataTable: ({ data, emptyState, selection, pagination }: MockDataTableProps) => (
    <div
      data-testid="data-table"
      data-row-count={data.length}
      data-pagination-mode={pagination?.mode}
      data-has-more={String(pagination?.hasMore)}
      data-has-previous={String(pagination?.hasPrevious)}
      data-total={pagination?.total === undefined ? "absent" : String(pagination.total)}
      data-selection={selection === undefined ? "absent" : "present"}
    >
      <button data-testid="page-next" onClick={pagination?.onNext}>
        next
      </button>
      <button data-testid="page-previous" onClick={pagination?.onPrevious}>
        previous
      </button>
      {data.length === 0 && emptyState}
    </div>
  ),
};

export const bulkToolbarModule = {
  SubmissionBulkToolbar: ({ selectedIds }: { selectedIds: number[] }) => (
    <div data-testid="bulk-toolbar" data-selected-count={selectedIds.length} />
  ),
};

export const searchInputModule = {
  SearchInput: ({
    value,
    onValueChange,
    "aria-label": ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    "aria-label"?: string;
  }) => (
    <input
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
};

export const userComboboxModule = {
  UserCombobox: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <button
      data-testid="user-combobox"
      data-value={value}
      aria-label={placeholder}
      onClick={() => onChange("user-owner")}
    />
  ),
};

export const emptyStateModule = {
  EmptyState: ({
    title,
    action,
  }: {
    title: string;
    action?: { label: string; onClick: () => void };
  }) => (
    <div data-testid="empty-state">
      <span data-testid="empty-title">{title}</span>
      {action && (
        <button data-testid="empty-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  ),
};

export const sharedModule = {
  ErrorState: ({ description, onRetry }: { description: string; onRetry?: () => void }) => (
    <div data-testid="error-state">
      <span>{description}</span>
      {onRetry && (
        <button data-testid="retry-button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  ),
};

export const skeletonModule = {
  Skeleton: () => <div data-testid="skeleton" />,
};

export const confirmDialogModule = { ConfirmDialog: () => null };

export const illustrationsModule = { EmptyInboxIllustration: () => null };

export const badgeModule = {
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
};

export const inputModule = {
  Input: ({
    value,
    onChange,
    "aria-label": ariaLabel,
    ...rest
  }: {
    value?: string;
    onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
    "aria-label"?: string;
  } & Record<string, unknown>) => (
    <input aria-label={ariaLabel} value={value} onChange={onChange} {...rest} />
  ),
};

export const truncatedTextModule = {
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
};

export const selectModule = {
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      <button data-testid={`select-trigger-${value}`} onClick={() => onValueChange?.("open")} />
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
};

export const utilsModule = {
  resolveImageUrl: (url: string) => url,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
};

export const dateFnsModule = { formatDistanceToNow: () => "2 hours ago" };

export const animatedIconModule = {
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
};

export const SAMPLE_SUBMISSION_ROW = {
  id: 1,
  type: "bug",
  status: "open",
  message: "Test",
  createdAt: "2026-01-01T00:00:00Z",
  screenshotUrl: null,
};

function noop(): void {
  return undefined;
}

export function baseInboxQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: noop,
    access: {
      allowed: true,
      denied: false,
      pending: false,
      permission: "feedbucket:submissions:view",
    },
    ...overrides,
  };
}

export function makeCursorPage(
  rows: unknown[] = [],
  pagination: { hasMore?: boolean; nextCursor?: string | null } = {},
) {
  return {
    data: rows,
    pagination: {
      limit: 25,
      hasMore: pagination.hasMore ?? false,
      nextCursor: pagination.nextCursor ?? null,
    },
  };
}
