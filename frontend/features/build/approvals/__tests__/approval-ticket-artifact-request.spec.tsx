import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { RequestApprovalSheet } from "../request-approval-sheet";

let version: number | undefined = 3;
jest.mock("@/hooks/api/build/projects", () => ({ useProject: () => ({ data: { id: 42, key: "PROJ" } }) }));
jest.mock("@/hooks/api/build/tickets", () => ({ useTickets: () => ({ data: { data: [{ id: 8, ticketNumber: 12, title: "Chosen ticket", status: "OPEN", version }] }, isFetching: false }) }));
jest.mock("@/hooks/api/build/milestones", () => ({ useProjectMilestones: () => ({ data: { data: [{ id: 9, name: "Launch", status: "OPEN" }] } }), useProjectBudget: () => ({ data: { projectId: 42 } }) }));
jest.mock("@/hooks/api/build/releases", () => ({ useReleases: () => ({ data: { data: [{ id: 10, name: "Release", version: "v1", status: "OPEN" }] } }) }));
jest.mock("@/hooks/api/build/change-requests", () => ({ useChangeRequests: () => ({ data: { data: [{ id: 11, title: "Change", crNumber: 1, status: "OPEN" }] } }) }));
jest.mock("@/hooks/api/timesheets-core/entries", () => ({ useTimesheetEntries: () => ({ data: { data: [{ id: 12, date: "2026-10-04", hours: 1, description: "Time entry", status: "OPEN" }] } }) }));
jest.mock("@/hooks/api/build/project-files", () => ({ useProjectFiles: () => ({ data: [{ id: 13, fileName: "Document", mimeType: "text/plain" }] }) }));
jest.mock("@/hooks/api/build/client-portal", () => ({ usePortalChangeRequests: () => ({ data: [{ id: 14, title: "Client request", crNumber: 1, status: "OPEN" }] }) }));
jest.mock("@/components/shared/dirty-state-context", () => ({ useRegisterDirtyState: jest.fn() }));
jest.mock("@/components/ui/combobox", () => ({
  Combobox: ({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) =>
    <select aria-label="Artifact" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select item</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>,
}));
jest.mock("@/components/ui/user-combobox", () => ({ UserCombobox: ({ value, onChange }: { value: string; onChange: (value: string) => void }) =>
  <select aria-label="Approver" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Select approver</option><option value="user-2">Approver two</option></select> }));
jest.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => <select aria-label={/^\d+$/.test(value) ? "Level" : "Entity type"} value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null, SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));
jest.mock("@/components/ui/date-picker", () => ({ DatePicker: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <input aria-label="Due date" value={value} onChange={(event) => onChange(event.target.value)} /> }));

beforeEach(() => { version = 3; });
function fill(entityId = "8") {
  if (entityId !== "42") fireEvent.change(screen.getByLabelText("Artifact"), { target: { value: entityId } });
  fireEvent.change(screen.getByLabelText("Approver"), { target: { value: "user-2" } });
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Explicit approval title" } });
  fireEvent.change(screen.getByLabelText("Reason / Notes (optional)"), { target: { value: "Retain this request reason" } });
}
it("binds explicit selection version without silently rebasing from a background ticket refresh", async () => {
  const onSubmit = jest.fn();
  const view = render(<RequestApprovalSheet open projectId={42} onOpenChange={jest.fn()} onSubmit={onSubmit} />);
  fill();
  version = 4;
  view.rerender(<RequestApprovalSheet open projectId={42} onOpenChange={jest.fn()} onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ entityType: "task", entityId: 8, expectedArtifactVersion: 3, title: "Explicit approval title", approverId: "user-2", reason: "Retain this request reason", level: 1 }));
});

it.each([undefined, 0, -1, 2.5, 2_147_483_648])("refuses a task selection without a valid server version %s", async (invalidVersion) => {
  version = invalidVersion;
  const onSubmit = jest.fn();
  render(<RequestApprovalSheet open projectId={42} onOpenChange={jest.fn()} onSubmit={onSubmit} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  await screen.findByRole("alert");
  expect(onSubmit).not.toHaveBeenCalled();
});

it("retains request fields and selected version on409 until explicit reselection", async () => {
  const onSubmit = jest.fn().mockRejectedValueOnce(new ApiError("Ticket changed. Select the current version.", 409)).mockResolvedValueOnce(undefined);
  const onOpenChange = jest.fn();
  const view = render(<RequestApprovalSheet open projectId={42} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Title")).toHaveValue("Explicit approval title");
  expect(screen.getByLabelText("Reason / Notes (optional)")).toHaveValue("Retain this request reason");
  version = 4;
  view.rerender(<RequestApprovalSheet open projectId={42} onOpenChange={onOpenChange} onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onOpenChange).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Artifact"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Artifact"), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ expectedArtifactVersion: 4 })));
});

it.each([{ type: "milestone", id: 9 }, { type: "budget", id: 42 }, { type: "release", id: 10 }, { type: "change_request", id: 11 },
  { type: "document", id: 13 }, { type: "timesheet", id: 12 }, { type: "client_approval", id: 14 }])("keeps the $type request body unchanged", async ({ type, id }) => {
  const onSubmit = jest.fn();
  render(<RequestApprovalSheet open projectId={42} onOpenChange={jest.fn()} onSubmit={onSubmit} />);
  fireEvent.change(screen.getByLabelText("Entity type"), { target: { value: type } });
  fill(String(id));
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ entityType: type, entityId: id, title: "Explicit approval title", approverId: "user-2", reason: "Retain this request reason", level: 1 }));
});

it("clears the selected binding and retained inputs when the signed-in user changes", async () => {
  const onSubmit = jest.fn();
  const view = render(<RequestApprovalSheet open projectId={42} currentUserId="user-1" onOpenChange={jest.fn()} onSubmit={onSubmit} />);
  fill();
  view.rerender(<RequestApprovalSheet open projectId={42} currentUserId="user-3" onOpenChange={jest.fn()} onSubmit={onSubmit} />);
  expect(screen.getByLabelText("Artifact")).toHaveValue("");
  expect(screen.getByLabelText("Title")).toHaveValue("");
  expect(screen.queryByText(/Ticket version3/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  await waitFor(() => expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true"));
  expect(onSubmit).not.toHaveBeenCalled();
});

it("does not overwrite a newer explicit selection with an earlier pending request's conflict", async () => {
  let reject: ((error: unknown) => void) | undefined;
  const onSubmit = jest.fn().mockImplementationOnce(() => new Promise((resolve, decline) => { reject = decline; })).mockResolvedValueOnce(undefined);
  const view = render(<RequestApprovalSheet open projectId={42} onOpenChange={jest.fn()} onSubmit={onSubmit} />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  version = 4;
  view.rerender(<RequestApprovalSheet open projectId={42} onOpenChange={jest.fn()} onSubmit={onSubmit} />);
  fireEvent.change(screen.getByLabelText("Artifact"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Artifact"), { target: { value: "8" } });
  reject?.(new ApiError("Old selection changed", 409));
  await waitFor(() => expect(screen.getByRole("button", { name: "Submit Request" })).toBeEnabled());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
  await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ expectedArtifactVersion: 4 })));
});
