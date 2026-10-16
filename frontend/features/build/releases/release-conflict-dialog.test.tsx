import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ReleaseFormSheet } from "./release-form-sheet";
import { ApiError } from "@/lib/api-envelope";
import type { Release } from "@/types/projects";

const updateMutate = jest.fn();

jest.mock("@/hooks/api/build/releases", () => ({
  releaseBaseKey: () => ["releases"],
  useCreateRelease: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateRelease: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/components/editor/tiptap-editor", () => ({
  TiptapEditor: () => <div data-testid="tiptap" />,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

import { toast } from "sonner";

const RELEASE: Release = {
  id: 1,
  projectId: 1,
  name: "v1.0.0",
  version: "1.0.0",
  rowVersion: 4,
  status: "draft",
  releaseDate: null,
  publishedAt: null,
  readiness: null,
  riskLevel: null,
  ticketCount: 0,
  description: null,
  createdBy: null,
  createdByUser: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

const CONFLICT = new ApiError("conflict", 409, "PROJECTS_TICKET_CONFLICT", { currentVersion: 9 });

beforeEach(() => {
  updateMutate.mockReset();
  updateMutate.mockResolvedValue({ ...RELEASE, rowVersion: 5 });
  (toast.error as jest.Mock).mockClear();
  (toast.warning as jest.Mock).mockClear();
});

async function submitRenamedRelease(failure: unknown): Promise<void> {
  updateMutate.mockRejectedValueOnce(failure);
  const { container } = render(
    <ReleaseFormSheet projectId={1} release={RELEASE} onClose={jest.fn()} />,
  );
  fireEvent.change(screen.getByDisplayValue("v1.0.0"), { target: { value: "v1.0.1" } });
  const form = container.ownerDocument.querySelector("form");
  if (form === null) throw new Error("the release form sheet rendered no form");
  await act(async () => {
    fireEvent.submit(form);
  });
  if (updateMutate.mock.calls.length === 0) {
    throw new Error("the sheet never submitted an update");
  }
}

it("opens a field-level comparison on a 409 instead of only a warning toast", async () => {
  await submitRenamedRelease(CONFLICT);
  const dialog = await screen.findByRole("dialog", {
    name: /this issue changed while you were editing/i,
  });
  expect(within(dialog).getByText("Name")).toBeInTheDocument();
  expect(within(dialog).getByText("v1.0.0")).toBeInTheDocument();
  expect(within(dialog).getByText("v1.0.1")).toBeInTheDocument();
  expect(toast.warning).not.toHaveBeenCalled();
});

it("labels the two sides so the server value is distinguishable from the pending edit", async () => {
  await submitRenamedRelease(CONFLICT);
  await waitFor(() => {
    expect(screen.getByText("On the server now")).toBeInTheDocument();
  });
  expect(screen.getByText("Your edit")).toBeInTheDocument();
});

it("keeps an ordinary failure on the error toast and opens no comparison", async () => {
  await submitRenamedRelease(new ApiError("boom", 500, "INTERNAL"));
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalled();
  });
  expect(screen.queryByText("On the server now")).not.toBeInTheDocument();
});
