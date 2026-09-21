import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PmWorkspace } from "@/types/projects";
import {
  createPmWorkspaceFormSchema,
  editPmWorkspaceFormSchema,
} from "./pm-workspace-form-schema";
import { PmWorkspaceFormSheet } from "./pm-workspace-form-sheet";

jest.mock("@/features/build/navigation/build-dirty-state-context", () => ({
  useRegisterBuildDirtyState: jest.fn(),
}));

jest.mock("@/components/shared", () => ({
  FormSheetChrome: ({
    open,
    children,
    footer,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    footer?: React.ReactNode;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="pm-workspace-sheet">
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

const MOCK_WORKSPACE: PmWorkspace = {
  pmWorkspaceId: "ws-1",
  orgId: "org-1",
  name: "Alpha",
  slug: "alpha",
  isDefault: false,
  status: "active",
  deletedAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("pm-workspace-form-schema — backend constraint parity", () => {
  it("rejects a blank name because the backend enforces min(1)", () => {
    const result = createPmWorkspaceFormSchema.safeParse({
      name: "",
      slug: "valid-slug",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slug longer than 60 characters because the backend enforces max(60)", () => {
    const result = createPmWorkspaceFormSchema.safeParse({
      name: "Valid Name",
      slug: "a".repeat(61),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slug that fails the backend regex /^[a-z][a-z0-9-]*$/ when it starts with a digit", () => {
    const result = createPmWorkspaceFormSchema.safeParse({
      name: "Valid Name",
      slug: "1invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slug that fails the backend regex /^[a-z][a-z0-9-]*$/ when it contains uppercase letters", () => {
    const result = createPmWorkspaceFormSchema.safeParse({
      name: "Valid Name",
      slug: "UPPERCASE",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a create payload within all backend constraints", () => {
    const result = createPmWorkspaceFormSchema.safeParse({
      name: "Valid Workspace Name",
      slug: "valid-workspace-slug",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an edit status outside the backend enum because only 'active' and 'archived' are accepted", () => {
    const result = editPmWorkspaceFormSchema.safeParse({
      name: "Valid Name",
      status: "deleted",
    });
    expect(result.success).toBe(false);
  });
});

describe("PmWorkspaceFormSheet — create mode per-field validation", () => {
  it("submitting with name blank shows the name FormMessage and does not call onSubmitCreate because min(1) is violated", async () => {
    const onSubmitCreate = jest.fn();
    render(
      <PmWorkspaceFormSheet
        open
        onOpenChange={jest.fn()}
        mode="create"
        onSubmitCreate={onSubmitCreate}
      />,
    );

    await act(async () => {
      const form = document.getElementById("pm-workspace-create-form");
      if (form) fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    });
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it("submitting with a slug exceeding 60 characters does not call onSubmitCreate because max(60) is violated", async () => {
    const onSubmitCreate = jest.fn();
    render(
      <PmWorkspaceFormSheet
        open
        onOpenChange={jest.fn()}
        mode="create"
        onSubmitCreate={onSubmitCreate}
      />,
    );

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Workspace name"), {
        target: { value: "My Workspace" },
      });
      fireEvent.change(screen.getByPlaceholderText("my-workspace"), {
        target: { value: "a".repeat(61) },
      });
    });

    await act(async () => {
      const form = document.getElementById("pm-workspace-create-form");
      if (form) fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(onSubmitCreate).not.toHaveBeenCalled();
    });
  });
});

describe("PmWorkspaceFormSheet — dirty-state close interception", () => {
  it("clicking cancel with a dirty create form shows UnsavedChangesDialog rather than immediately closing because unsaved work must not be silently discarded", async () => {
    const onOpenChange = jest.fn();
    render(
      <PmWorkspaceFormSheet
        open
        onOpenChange={onOpenChange}
        mode="create"
        onSubmitCreate={jest.fn()}
      />,
    );

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Workspace name"), {
        target: { value: "In-progress workspace" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("clicking cancel with a dirty edit form shows UnsavedChangesDialog rather than immediately closing because unsaved work must not be silently discarded", async () => {
    const onOpenChange = jest.fn();
    render(
      <PmWorkspaceFormSheet
        open
        onOpenChange={onOpenChange}
        mode="edit"
        defaultValues={MOCK_WORKSPACE}
        onSubmitEdit={jest.fn()}
      />,
    );

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Workspace name"), {
        target: { value: "Changed name" },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    });

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("clicking cancel with a pristine create form calls onOpenChange(false) immediately without showing UnsavedChangesDialog", async () => {
    const onOpenChange = jest.fn();
    render(
      <PmWorkspaceFormSheet
        open
        onOpenChange={onOpenChange}
        mode="create"
        onSubmitCreate={jest.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
