import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequestApprovalSheet } from "./request-approval-sheet";
import { DB_ENUMS } from "@/contracts/db-enums.generated";
import {
  entityTypeLabel,
  entityTypeSearchLabel,
  entityTypeTitlePrefix,
  ENTITY_OPTIONS,
} from "./approvals-constants";
import type { RequestApprovalValues } from "./approvals-schema";
import type { CreateApprovalInput } from "@/types/projects";

let currentFormValues: RequestApprovalValues = {
  entityType: "task",
  entityId: "1",
  title: "Approve task: Seed",
  approverId: "user-seed",
  reason: "",
  dueAt: "",
  level: "1",
};

let mockSetValueRef: jest.Mock = jest.fn();
let mockDirtyFields: Record<string, boolean> = {};

jest.mock("react-hook-form", () => ({
  useForm: () => ({
    handleSubmit:
      (fn: (values: RequestApprovalValues) => void) =>
      (e?: { preventDefault?: () => void }) => {
        e?.preventDefault?.();
        fn(currentFormValues);
      },
    control: {},
    reset: jest.fn(),
    formState: { isDirty: false, dirtyFields: mockDirtyFields, errors: {} },
    watch: (field: string) => {
      const values: Record<string, unknown> = currentFormValues;
      return values[field] ?? "";
    },
    setValue: (...args: unknown[]) => mockSetValueRef(...args),
  }),
  zodResolver: jest.fn(),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: { key: "PROJ", id: 42, orgId: "org-1", name: "Test Project", description: null, managedProductId: null, startDate: null, endDate: null, status: "ACTIVE", settings: null } }),
}));

let mockTicketsData: { data: { id: number; ticketNumber: number; title: string; status: string }[]; hasMore: boolean; nextCursor: null } = { data: [], hasMore: false, nextCursor: null };

jest.mock("@/hooks/api/build/tickets", () => ({
  useTickets: () => ({ data: mockTicketsData, isFetching: false }),
}));

jest.mock("@/hooks/api/build/milestones", () => ({
  useProjectMilestones: () => ({ data: { data: [] }, isFetching: false }),
  useProjectBudget: () => ({ data: null, isFetching: false }),
}));

jest.mock("@/hooks/api/build/releases", () => ({
  useReleases: () => ({ data: { data: [] }, isFetching: false }),
}));

jest.mock("@/hooks/api/build/change-requests", () => ({
  useChangeRequests: () => ({ data: { data: [] }, isFetching: false }),
}));

jest.mock("@/hooks/api/timesheets-core/entries", () => ({
  useTimesheetEntries: () => ({ data: { data: [] }, isFetching: false }),
}));

jest.mock("@/hooks/api/build/project-files", () => ({
  useProjectFiles: () => ({ data: [], isFetching: false }),
}));

jest.mock("@/hooks/api/build/client-portal", () => ({
  usePortalChangeRequests: () => ({ data: [], isFetching: false }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormField: ({
    render: renderFn,
  }: {
    render: (args: { field: { value: string; onChange: () => void } }) => React.ReactNode;
  }) => renderFn({ field: { value: "", onChange: jest.fn() } }) as React.ReactElement,
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormMessage: () => null,
  FormDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    isPending: _isPending,
    loadingText: _loadingText,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isPending?: boolean;
    loadingText?: string;
  }) => <button {...props}>{children}</button>,
}));

jest.mock("@/components/ui/combobox", () => ({
  Combobox: () => <div data-testid="entity-combobox" />,
}));

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: () => null,
}));

const PROJECT_ID = 42;

function renderSheet(onSubmit: (input: CreateApprovalInput) => void = jest.fn()) {
  return render(
    <RequestApprovalSheet
      open
      onOpenChange={jest.fn()}
      onSubmit={onSubmit}
      isPending={false}
      projectId={PROJECT_ID}
    />,
  );
}

describe("entityTypeLabel — label lookup and humanized fallback", () => {
  it.each([
    ["task", "Task"],
    ["milestone", "Milestone"],
    ["budget", "Budget"],
    ["release", "Release"],
    ["change_request", "Change Request"],
    ["document", "Document"],
    ["timesheet", "Timesheet Entry"],
    ["client_approval", "Client Approval"],
  ] as const)("returns %s label for %s", (value, expected) => {
    expect(entityTypeLabel(value)).toBe(expected);
  });

  it("returns humanized fallback for a value not in the map", () => {
    expect(entityTypeLabel("future_approval")).toBe("Future Approval");
  });

  it("returns humanized fallback for a single-word value not in the map", () => {
    expect(entityTypeLabel("invoice")).toBe("Invoice");
  });
});

describe("entityTypeTitlePrefix — prefix lookup and humanized fallback", () => {
  it.each([
    ["task", "Approve task"],
    ["milestone", "Approve milestone"],
    ["budget", "Approve budget"],
    ["release", "Approve release"],
    ["change_request", "Approve change request"],
    ["document", "Approve document"],
    ["timesheet", "Approve timesheet"],
    ["client_approval", "Approve client request"],
  ] as const)("returns correct prefix for %s", (value, expected) => {
    expect(entityTypeTitlePrefix(value)).toBe(expected);
  });

  it("returns humanized prefix for a value not in the map", () => {
    expect(entityTypeTitlePrefix("future_approval")).toBe("Approve future approval");
  });
});

describe("entityTypeSearchLabel — search label lookup and humanized fallback", () => {
  it("returns custom search label for known type", () => {
    expect(entityTypeSearchLabel("task")).toBe("tasks");
    expect(entityTypeSearchLabel("change_request")).toBe("change requests");
  });

  it("returns humanized fallback for a value not in the map", () => {
    expect(entityTypeSearchLabel("future_approval")).toBe("future approval");
  });
});

describe("ENTITY_OPTIONS — derived from DB_ENUMS", () => {
  it("contains the all-types sentinel plus exactly eight type entries", () => {
    expect(ENTITY_OPTIONS).toHaveLength(DB_ENUMS.approval_entity_type.length + 1);
    expect(ENTITY_OPTIONS[0]).toEqual({ value: "all", label: "All types" });
  });

  it("uses custom labels for all eight known types", () => {
    for (const v of DB_ENUMS.approval_entity_type) {
      const entry = ENTITY_OPTIONS.find((o) => o.value === v);
      expect(entry).toBeDefined();
      expect(entry?.label).toBe(entityTypeLabel(v));
    }
  });
});

describe("RequestApprovalSheet — form submit for each entity type", () => {
  const SUBMIT_CASES: Array<{
    entityType: RequestApprovalValues["entityType"];
    entityId: string;
    title: string;
    expectedEntityId: number;
    includeReason?: boolean;
    includeDueAt?: boolean;
  }> = [
    { entityType: "task", entityId: "101", title: "Approve task: Fix critical bug", expectedEntityId: 101 },
    { entityType: "milestone", entityId: "202", title: "Approve milestone: Alpha release", expectedEntityId: 202 },
    { entityType: "release", entityId: "303", title: "Approve release: v1.0.0", expectedEntityId: 303 },
    { entityType: "budget", entityId: String(PROJECT_ID), title: "Approve budget: Project Budget", expectedEntityId: PROJECT_ID },
    { entityType: "change_request", entityId: "404", title: "Approve change request: Add OAuth", expectedEntityId: 404 },
    { entityType: "timesheet", entityId: "505", title: "Approve timesheet: Day log", expectedEntityId: 505 },
    { entityType: "document", entityId: "606", title: "Approve document: Spec v2", expectedEntityId: 606 },
    { entityType: "client_approval", entityId: "707", title: "Approve client request: Portal CR-1", expectedEntityId: 707 },
  ];

  it.each(SUBMIT_CASES)(
    "submits correct CreateApprovalInput for $entityType entity type",
    ({ entityType, entityId, title, expectedEntityId }) => {
      currentFormValues = {
        entityType,
        entityId,
        title,
        approverId: "user-xyz",
        reason: "",
        dueAt: "",
        level: "2",
      };

      const onSubmit = jest.fn();
      renderSheet(onSubmit);

      fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith<[CreateApprovalInput]>({
        entityType,
        entityId: expectedEntityId,
        title,
        approverId: "user-xyz",
        level: 2,
      });
    },
  );

  it("includes reason and dueAt in the output when provided", () => {
    currentFormValues = {
      entityType: "task",
      entityId: "1",
      title: "Approve task: Fix bug",
      approverId: "user-xyz",
      reason: "Urgent fix needed",
      dueAt: "2026-10-01",
      level: "3",
    };

    const onSubmit = jest.fn();
    renderSheet(onSubmit);

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    expect(onSubmit).toHaveBeenCalledWith<[CreateApprovalInput]>({
      entityType: "task",
      entityId: 1,
      title: "Approve task: Fix bug",
      approverId: "user-xyz",
      reason: "Urgent fix needed",
      dueAt: "2026-10-01",
      level: 3,
    });
  });

  it("omits reason and dueAt from the output when blank", () => {
    currentFormValues = {
      entityType: "task",
      entityId: "1",
      title: "Approve task: Fix bug",
      approverId: "user-xyz",
      reason: "",
      dueAt: "",
      level: "1",
    };

    const onSubmit = jest.fn();
    renderSheet(onSubmit);

    fireEvent.click(screen.getByRole("button", { name: /submit request/i }));

    const result = onSubmit.mock.calls[0][0] as CreateApprovalInput;
    expect(result).not.toHaveProperty("reason");
    expect(result).not.toHaveProperty("dueAt");
  });
});

describe("RequestApprovalSheet — entity picker visibility", () => {
  it.each(
    DB_ENUMS.approval_entity_type.filter((v) => v !== "budget"),
  )("shows entity picker for %s (non-budget) entity type", (entityType) => {
    currentFormValues = {
      entityType,
      entityId: "1",
      title: `Approve ${entityType}: Item`,
      approverId: "user-xyz",
      reason: "",
      dueAt: "",
      level: "1",
    };

    const { unmount } = renderSheet();
    expect(screen.getByTestId("entity-combobox")).toBeTruthy();
    unmount();
  });

  it("hides entity picker for budget type and shows fixed budget display", () => {
    currentFormValues = {
      entityType: "budget",
      entityId: String(PROJECT_ID),
      title: "Approve budget: Project Budget",
      approverId: "user-xyz",
      reason: "",
      dueAt: "",
      level: "1",
    };

    renderSheet();
    expect(screen.queryByTestId("entity-combobox")).toBeNull();
    expect(screen.getByText("Project Budget (auto-selected)")).toBeTruthy();
  });
});

describe("BUG-041 — dirtyFields.title guard prevents auto-fill from overwriting a user-typed title", () => {
  beforeEach(() => {
    mockSetValueRef = jest.fn();
    mockDirtyFields = {};
    mockTicketsData = {
      data: [{ id: 1, ticketNumber: 7, title: "Fix login bug", status: "open" }],
      hasMore: false,
      nextCursor: null,
    };
    currentFormValues = {
      entityType: "task",
      entityId: "1",
      title: "Approve task: Fix login bug",
      approverId: "user-xyz",
      reason: "",
      dueAt: "",
      level: "1",
    };
  });

  afterEach(() => {
    mockTicketsData = { data: [], hasMore: false, nextCursor: null };
  });

  it("calls setValue with the auto-generated title when dirtyFields.title is not set so pristine forms receive the suggestion", () => {
    mockDirtyFields = {};
    renderSheet();
    const titleCalls = mockSetValueRef.mock.calls.filter(
      (c) => (c as unknown[])[0] === "title",
    );
    expect(titleCalls.length).toBeGreaterThan(0);
  });

  it("does NOT call setValue for title when dirtyFields.title is true so a user-typed title is preserved (BUG-041 guard)", () => {
    mockDirtyFields = { title: true };
    renderSheet();
    const titleCalls = mockSetValueRef.mock.calls.filter(
      (c) => (c as unknown[])[0] === "title",
    );
    expect(titleCalls).toHaveLength(0);
  });
});
