import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { DecideDialog } from "../decide-dialog";

const refetch = jest.fn();
const detail = { id: 7, orgId: "org-1", projectId: 42, title: "Reviewed approval", status: "pending", revision: 3 };
let currentDetail: typeof detail | undefined = detail;
let canDecide = true;
let stamp: string | null = "owner-1";
const mutateAsync = jest.fn();
jest.mock("@/hooks/api/build/approvals", () => ({
  useApproval: () => ({ data: currentDetail, isPending: !currentDetail, error: null, ownerStamp: stamp, refetch }),
  useDecideApproval: () => ({ mutateAsync, isPending: false }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => canDecide }));
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));

beforeEach(() => { currentDetail = detail; stamp = "owner-1"; canDecide = true; refetch.mockReset(); mutateAsync.mockReset(); });

function mount() {
  return render(<DecideDialog open projectId={42} approvalId={7} revision={3} onOpenChange={jest.fn()} />);
}
function submit() { fireEvent.click(screen.getByRole("button", { name: "Submit" })); }

it("submits the displayed detail revision with the entered reason", async () => {
  mount();
  fireEvent.change(screen.getByLabelText("Comment (optional)"), { target: { value: "Evidence still missing" } });
  submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ approvalId: 7, decision: "approved", decisionComment: "Evidence still missing", expectedRevision: 3 }));
});

it("keeps choice and reason after conflict and refuses programmatic resubmit until latest is reviewed", async () => {
  mutateAsync.mockRejectedValueOnce(new ApiError("Revision changed", 409));
  const view = mount();
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: "Reject" }));
  fireEvent.change(screen.getByLabelText("Comment (optional)"), { target: { value: "Keep this reason" } });
  submit();
  await screen.findByRole("button", { name: "Review latest" });
  currentDetail = { ...detail, revision: 4, title: "Changed approval" };
  view.rerender(<DecideDialog open projectId={42} approvalId={7} revision={3} onOpenChange={jest.fn()} />);
  expect(screen.getByText("Reviewed approval")).toBeInTheDocument();
  const form = screen.getByLabelText("Comment (optional)").closest("form");
  if (!form) throw new Error("Decision form missing");
  fireEvent.submit(form);
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText("Comment (optional)")).toHaveValue("Keep this reason");
  refetch.mockResolvedValue({ data: currentDetail, error: null });
  fireEvent.click(screen.getByRole("button", { name: "Review latest" }));
  await screen.findByText("Changed approval");
  submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenLastCalledWith({ approvalId: 7, expectedRevision: 4, decision: "rejected", decisionComment: "Keep this reason" }));
});

it("does not rebase a reviewed revision from a background success", async () => {
  const view = mount();
  currentDetail = { ...detail, revision: 4 };
  view.rerender(<DecideDialog open projectId={42} approvalId={7} revision={3} onOpenChange={jest.fn()} />);
  submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 3 })));
});

it("does not unlock a conflicted revision when reviewing latest is denied", async () => {
  mutateAsync.mockRejectedValueOnce(new ApiError("Revision changed", 409));
  mount(); submit();
  await screen.findByRole("button", { name: "Review latest" });
  refetch.mockResolvedValue({ data: undefined, error: new ApiError("Not available", 403) });
  fireEvent.click(screen.getByRole("button", { name: "Review latest" }));
  await screen.findByText("Not available");
  expect(screen.queryByText("Reviewed approval")).not.toBeInTheDocument();
  submit();
  expect(mutateAsync).toHaveBeenCalledTimes(1);
});

it("hides previous content and refuses dispatch when permission or committed owner is absent", async () => {
  const view = mount();
  canDecide = false; stamp = null; currentDetail = undefined;
  view.rerender(<DecideDialog open projectId={42} approvalId={7} revision={3} onOpenChange={jest.fn()} />);
  expect(screen.queryByText("Reviewed approval")).not.toBeInTheDocument();
  submit();
  expect(mutateAsync).not.toHaveBeenCalled();
});

it.each(["pending", "escalated", "changes_requested"])("allows a current %s decision", async (status) => {
  currentDetail = { ...detail, status };
  mount(); submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 3 })));
});
it("refuses requested status through both button and programmatic form submission", async () => {
  currentDetail = { ...detail, status: "requested" };
  mount();
  const form = screen.getByLabelText("Comment (optional)").closest("form");
  if (!form) throw new Error("Decision form missing");
  fireEvent.submit(form);
  await waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled());
  expect(mutateAsync).not.toHaveBeenCalled();
});
