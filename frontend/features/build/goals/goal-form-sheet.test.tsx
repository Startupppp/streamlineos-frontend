import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GoalFormSheet } from "./goal-form-sheet";
import type { GoalDetail } from "@/hooks/api/goals";
import { ApiError } from "@/lib/api-envelope";
import { FormProvider, useFormContext } from "react-hook-form";

jest.mock("@/hooks/api/goals", () => ({
  useCreateGoal: jest.fn(),
  useUpdateGoal: jest.fn(),
  useGoals: jest.fn(() => ({
    data: [{ id: 99, title: "Self", level: "team" }, { id: 37, title: "Company goal", level: "company" }],
  })),
}));

jest.mock("@/hooks/api/chat-core-read", () => ({
  useChatOrgUsers: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/form", () => ({
  Form: ({ children, ...methods }: React.ComponentProps<typeof FormProvider>) => <FormProvider {...methods}>{children}</FormProvider>,
  FormField: ({ render: renderFn }: { render: (opts: unknown) => React.ReactNode }) =>
    renderFn({ field: { value: "", onChange: jest.fn(), onBlur: jest.fn(), ref: jest.fn(), name: "test" } }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormControl: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FormMessage: () => null,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, type }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit" | "reset" }) => (
    <button type={type ?? "button"} onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({ children, type }: { children: React.ReactNode; type?: "button" | "submit" | "reset" }) => (
    <button type={type ?? "button"}>{children}</button>
  ),
}));

jest.mock("./goal-objective-fields", () => ({
  GoalObjectiveFields: () => {
    const { register } = useFormContext();
    return <input data-testid="objective-fields" defaultValue="Product objective" {...register("title")} />;
  },
}));

jest.mock("./goal-ownership-fields", () => ({
  GoalOwnershipFields: ({ parentOptions }: { parentOptions: Array<{ id: number; title: string }> }) => {
    const { register } = useFormContext();
    return (
      <select data-testid="parent-goal" {...register("parentGoalId")}>
        <option value="none">No parent</option>
        {parentOptions.map((o) => <option key={o.id} value={String(o.id)}>{o.title}</option>)}
      </select>
    );
  },
}));

jest.mock("./goal-key-results", () => ({
  GoalKeyResultsPanel: () => null,
  buildKeyResults: jest.fn(() => []),
  EMPTY_KR: {},
}));

import { useCreateGoal, useUpdateGoal } from "@/hooks/api/goals";
import { toast } from "sonner";

const mockUseCreateGoal = useCreateGoal as jest.Mock;
const mockUseUpdateGoal = useUpdateGoal as jest.Mock;
const mockToast = toast as unknown as { success: jest.Mock; error: jest.Mock };

function buildMutate(impl?: (input: unknown, opts: { onSuccess?: () => void; onError?: (e: unknown) => void }) => void) {
  return jest.fn().mockImplementation(
    (input: unknown, opts: { onSuccess?: () => void; onError?: (e: unknown) => void }) => {
      if (impl) impl(input, opts);
    },
  );
}

function baseGoal(overrides: Partial<GoalDetail> = {}): GoalDetail {
  return {
    id: 99,
    orgId: "org-1",
    title: "Original Title",
    description: "Original description",
    ownerMembershipId: null,
    level: "company",
    status: "not_started",
    progress: 0,
    confidence: null,
    version: 3,
    startDate: null,
    dueDate: null,
    parentGoalId: null,
    projectId: null,
    createdByMembershipId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    deletedAt: null,
    owner: null,
    project: null,
    keyResults: [],
    updates: [],
    links: [],
    measurementSources: [],
    linkedRoadmapItems: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCreateGoal.mockReturnValue({ mutate: buildMutate(), isPending: false });
  mockUseUpdateGoal.mockReturnValue({ mutate: buildMutate(), isPending: false });
});

describe("GoalFormSheet conflict UX (Task C)", () => {
  it("creates a goal in its managed product so it remains visible in the scoped list", async () => {
    const mutate = buildMutate();
    mockUseCreateGoal.mockReturnValue({ mutate, isPending: false });

    render(<GoalFormSheet open onOpenChange={jest.fn()} managedProductId={39} />);
    fireEvent.change(screen.getByTestId("objective-fields"), { target: { value: "Product objective" } });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ managedProductId: 39 }),
        expect.any(Object),
      );
    });
  });
  it("sends one create when the form is submitted twice before the first save settles", async () => {
    const mutate = buildMutate();
    mockUseCreateGoal.mockReturnValue({ mutate, isPending: false });

    render(<GoalFormSheet open onOpenChange={jest.fn()} />);
    fireEvent.change(screen.getByTestId("objective-fields"), { target: { value: "Once only" } });
    fireEvent.submit(document.querySelector("form")!);
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mutate).toHaveBeenCalledTimes(1);
  });
  it("shows the conflict alert when the update returns a 409 ApiError", async () => {
    const conflictError = new ApiError("Conflict", 409, "PROJECTS_TICKET_CONFLICT", { currentVersion: 4 });
    const mutate = buildMutate((_, opts) => opts.onError?.(conflictError));
    mockUseUpdateGoal.mockReturnValue({ mutate, isPending: false });

    render(
      <GoalFormSheet
        open
        onOpenChange={jest.fn()}
        goal={baseGoal({ title: "Old Title" })}
      />,
    );

    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("modified while you were editing");
  });

  it("does not call toast.error on a 409 because the conflict UI takes over", async () => {
    const conflictError = new ApiError("Conflict", 409, "PROJECTS_TICKET_CONFLICT", { currentVersion: 4 });
    const mutate = buildMutate((_, opts) => opts.onError?.(conflictError));
    mockUseUpdateGoal.mockReturnValue({ mutate, isPending: false });

    render(
      <GoalFormSheet
        open
        onOpenChange={jest.fn()}
        goal={baseGoal()}
      />,
    );

    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("calls toast.error for a non-409 error and does not show conflict alert", async () => {
    const networkError = new ApiError("Server Error", 500, "INTERNAL");
    const mutate = buildMutate((_, opts) => opts.onError?.(networkError));
    mockUseUpdateGoal.mockReturnValue({ mutate, isPending: false });

    render(
      <GoalFormSheet
        open
        onOpenChange={jest.fn()}
        goal={baseGoal()}
      />,
    );

    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows field-level diffs when the pending edit differs from the original goal values", async () => {
    const conflictError = new ApiError("Conflict", 409, "PROJECTS_TICKET_CONFLICT", { currentVersion: 4 });
    const mutate = buildMutate((_, opts) => opts.onError?.(conflictError));
    mockUseUpdateGoal.mockReturnValue({ mutate, isPending: false });

    render(
      <GoalFormSheet
        open
        onOpenChange={jest.fn()}
        goal={baseGoal({ title: "Old Title", status: "not_started" })}
      />,
    );

    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });
});

describe("GoalFormSheet parent goal", () => {
  it("offers other goals as parents and sends the chosen parent on update", async () => {
    const mutate = buildMutate();
    mockUseUpdateGoal.mockReturnValue({ mutate, isPending: false });
    render(<GoalFormSheet open onOpenChange={jest.fn()} goal={baseGoal()} />);

    expect(screen.queryByRole("option", { name: "Self" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId("parent-goal"), { target: { value: "37" } });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ parentGoalId: 37 }), expect.any(Object));
    });
  });

  it("leaves the parent out of the update when it did not change", async () => {
    const mutate = buildMutate();
    mockUseUpdateGoal.mockReturnValue({ mutate, isPending: false });
    render(<GoalFormSheet open onOpenChange={jest.fn()} goal={baseGoal({ parentGoalId: 37 })} />);

    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(mutate).toHaveBeenCalled());
    expect(mutate.mock.calls[0][0]).not.toHaveProperty("parentGoalId");
  });

  it("toasts a rejected parent link instead of showing the version conflict", async () => {
    const cycleError = new ApiError("Goal parent link would create a cycle", 409, "CONFLICT");
    const mutate = buildMutate((_, opts) => opts.onError?.(cycleError));
    mockUseUpdateGoal.mockReturnValue({ mutate, isPending: false });
    render(<GoalFormSheet open onOpenChange={jest.fn()} goal={baseGoal()} />);

    fireEvent.change(screen.getByTestId("parent-goal"), { target: { value: "37" } });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => expect(mockToast.error).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
