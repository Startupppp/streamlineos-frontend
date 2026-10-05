import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { DecideDialog } from "../decide-dialog";

const refetch = jest.fn();
const detail = { id: 7, orgId: "org-1", projectId: 42, entityType: "task", title: "Reviewed approval", status: "pending", revision: 3 };
const artifact = { state: "current", requestedArtifactVersion: 2, currentArtifactVersion: 2, capturedAt: "2026-10-04T00:00:00Z", digest: "a".repeat(64),
  snapshot: { schemaVersion: 1, id: 8, projectId: 42, ticketNumber: 12, version: 2, title: "Captured task title", description: "<p>Captured description</p>",
    type: "TASK", status: "OPEN", priority: "HIGH", points: null, originalEstimate: null, startDate: null, dueDate: null } };
let artifactOverride: unknown = artifact;
let currentDetail: typeof detail | undefined = detail;
let canDecide = true;
let stamp: string | null = "owner-1";
let readError: unknown = null;
const mutateAsync = jest.fn();
jest.mock("@/hooks/api/build/approvals", () => ({
  useApproval: () => ({ data: currentDetail ? { ...currentDetail, artifact: artifactOverride } : undefined, isPending: !currentDetail && !readError, error: readError, ownerStamp: stamp, refetch }),
  useDecideApproval: () => ({ mutateAsync, isPending: false }),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => canDecide }));
jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));

beforeEach(() => { currentDetail = detail; artifactOverride = artifact; stamp = "owner-1"; canDecide = true; readError = null; refetch.mockReset(); mutateAsync.mockReset(); });

function mount() {
  return render(<DecideDialog open projectId={42} approvalId={7} revision={3} onOpenChange={jest.fn()} />);
}
function submit() { fireEvent.click(screen.getByRole("button", { name: "Submit" })); }

it("reviews a direct entry's fresh revision without inventing an earlier queue revision", async () => {
  render(<DecideDialog open projectId={42} approvalId={7} onOpenChange={jest.fn()} />);
  expect(screen.getByText("Revision 3 · pending")).toBeInTheDocument();
  expect(screen.queryByText(/Updated since the queue was loaded/)).not.toBeInTheDocument();
  submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 3 })));
});

it("waits for fresh direct-entry content before enabling a decision", async () => {
  currentDetail = undefined;
  const view = render(<DecideDialog open projectId={42} approvalId={7} onOpenChange={jest.fn()} />);
  expect(screen.queryByText("Reviewed approval")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  submit();
  expect(mutateAsync).not.toHaveBeenCalled();
  currentDetail = { ...detail, revision: 4 };
  view.rerender(<DecideDialog open projectId={42} approvalId={7} onOpenChange={jest.fn()} />);
  submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 4 })));
});

it.each([403, 404, 503])("hides prior direct-entry content and refuses dispatch on detail %s", async (status) => {
  readError = new ApiError("Approval unavailable", status);
  render(<DecideDialog open projectId={42} approvalId={7} onOpenChange={jest.fn()} />);
  expect(screen.queryByText("Reviewed approval")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("Approval unavailable");
  submit();
  expect(mutateAsync).not.toHaveBeenCalled();
});

it("keeps a direct-entry conflict's reason until a fresh explicit review succeeds", async () => {
  mutateAsync.mockRejectedValueOnce(new ApiError("Revision changed", 409));
  render(<DecideDialog open projectId={42} approvalId={7} onOpenChange={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Comment (optional)"), { target: { value: "Retain direct review" } });
  submit();
  await screen.findByRole("button", { name: "Review latest" });
  refetch.mockResolvedValue({ data: { ...detail, revision: 4, artifact }, error: null });
  fireEvent.click(screen.getByRole("button", { name: "Review latest" }));
  await screen.findByText("Revision 4 · pending");
  expect(screen.getByLabelText("Comment (optional)")).toHaveValue("Retain direct review");
  submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenLastCalledWith({ approvalId: 7, decision: "approved", expectedRevision: 4, decisionComment: "Retain direct review" }));
});

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
  refetch.mockResolvedValue({ data: { ...currentDetail, artifact }, error: null });
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

it.each(["restricted", "unavailable", "unbound"])("refuses a task decision after fresh metadata200 becomes %s", async (state) => {
  const view = mount();
  await screen.findByText("Captured description");
  expect(screen.getByText("Captured task title")).toBeInTheDocument();
  artifactOverride = { state };
  view.rerender(<DecideDialog open projectId={42} approvalId={7} revision={3} onOpenChange={jest.fn()} />);
  const form = screen.getByLabelText("Comment (optional)").closest("form");
  if (!form) throw new Error("Decision form missing");
  fireEvent.submit(form);
  await waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled());
  expect(mutateAsync).not.toHaveBeenCalled();
  expect(screen.queryByText("Captured task title")).not.toBeInTheDocument();
  expect(screen.queryByText("Captured description")).not.toBeInTheDocument();
});

it("refuses the frozen task when the latest artifact version is stale", async () => {
  const view = mount();
  artifactOverride = { ...artifact, state: "stale", currentArtifactVersion: 3 };
  view.rerender(<DecideDialog open projectId={42} approvalId={7} revision={3} onOpenChange={jest.fn()} />);
  submit();
  await waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled());
  expect(mutateAsync).not.toHaveBeenCalled();
  expect(screen.getByText("Captured task title")).toBeInTheDocument();
});

it("hides a changed binding until explicit review and preserves the entered reason", async () => {
  const view = mount();
  await screen.findByText("Captured description");
  fireEvent.change(screen.getByLabelText("Comment (optional)"), { target: { value: "Keep artifact review reason" } });
  artifactOverride = { ...artifact, requestedArtifactVersion: 3, currentArtifactVersion: 3, digest: "b".repeat(64), snapshot: { ...artifact.snapshot, version: 3, title: "New capture" } };
  view.rerender(<DecideDialog open projectId={42} approvalId={7} onOpenChange={jest.fn()} />);
  expect(screen.queryByText("Captured task title")).not.toBeInTheDocument();
  expect(screen.queryByText("New capture")).not.toBeInTheDocument();
  submit();
  expect(mutateAsync).not.toHaveBeenCalled();
  refetch.mockResolvedValue({ data: { ...detail, artifact: artifactOverride }, error: null });
  fireEvent.click(screen.getByRole("button", { name: "Review latest" }));
  await screen.findByText("New capture");
  expect(screen.getByLabelText("Comment (optional)")).toHaveValue("Keep artifact review reason");
  submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 3, decisionComment: "Keep artifact review reason" })));
});

it.each(["milestone", "budget", "release", "change_request", "document", "timesheet", "client_approval"])("preserves the unbound %s decision lifecycle", async (entityType) => {
  currentDetail = { ...detail, entityType };
  artifactOverride = { state: "unbound" };
  mount(); submit();
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 3 })));
});

it("renders only the sanitized captured description without embedded file requests or editing", async () => {
  artifactOverride = { ...artifact, snapshot: { ...artifact.snapshot, description: '<p>Safe snapshot</p><img src="https://files.invalid/private.png"><script>window.bad=true</script><a href="javascript:alert(1)">Unsafe target</a>' } };
  mount();
  await screen.findByText("Safe snapshot");
  const panel = screen.getByRole("region", { name: "Requested ticket artifact" });
  expect(panel.querySelector("script,img,[contenteditable=true]")).toBeNull();
  expect(panel.querySelector("a")?.getAttribute("href")).toBeNull();
});

it("removes SVG and CSS resource loads while preserving rich text and safe links", async () => {
  artifactOverride = { ...artifact, snapshot: { ...artifact.snapshot, description: '<p style="background-image:url(https://files.invalid/css.png)">Resource-free content <strong>Bold text</strong></p><style>.asset{background:url(https://files.invalid/style.png)}</style><svg><image href="https://files.invalid/image.png"/><filter><feImage href="https://files.invalid/filter.png"/></filter></svg><ul><li>List entry</li></ul><a href="https://example.com/review">Review source</a>' } };
  mount();
  await screen.findByText("Bold text");
  const panel = screen.getByRole("region", { name: "Requested ticket artifact" });
  expect(panel.querySelector("svg,image,feImage,style,[style],[src],[srcset]")).toBeNull();
  expect(panel.querySelector("strong")).toHaveTextContent("Bold text");
  expect(panel.querySelector("ul > li")).toHaveTextContent("List entry");
  expect(screen.getByRole("link", { name: "Review source" })).toHaveAttribute("href", "https://example.com/review");
});
