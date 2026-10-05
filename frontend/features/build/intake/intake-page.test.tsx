import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { IntakePage } from "./intake-page";
import { ApiError } from "@/lib/api-envelope";
import userEvent from "@testing-library/user-event";
import type { IntakeRequest } from "@/types/projects";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";

const mockRequests = jest.fn(), mockCreate = jest.fn(), mockUpdate = jest.fn(), mockAccept = jest.fn();
const mockCan = jest.fn(), mockAccess = jest.fn(), mockFilters = jest.fn(), mockTickets = jest.fn(), mockSession = jest.fn();
const mockMembers = jest.fn(), mockCycles = jest.fn(), mockModules = jest.fn();
const mockTicket = jest.fn(), mockPush = jest.fn(), mockLeave = jest.fn();
type ToastOptions = { action?: { label: string; onClick: () => void }; id?: string | number };
const mockToast = { success: jest.fn((message: string, options?: ToastOptions) => { void message; void options; }), error: jest.fn() };
jest.mock("@/hooks/api/build/advanced", () => ({
  useIntakeRequests: (...args: unknown[]) => mockRequests(...args),
  useCreateIntakeRequest: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateIntakeRequest: () => ({ mutate: mockUpdate, isPending: false }),
  useCycles: () => mockCycles(), useModules: () => mockModules(),
}));
jest.mock("@/hooks/api/build/intake-mutations", () => ({ useAcceptIntakeRequest: () => ({ mutate: mockAccept, isPending: false }) }));
jest.mock("@/hooks/api/build/project-members", () => ({ useProjectMembers: () => mockMembers() }));
jest.mock("@/hooks/api/build/tickets", () => ({ useTickets: (...args: unknown[]) => mockTickets(...args), useTicket: (...args: unknown[]) => mockTicket(...args) }));
jest.mock("@/hooks/api/build/projects", () => ({ useProject: () => ({ data: { id: 1, key: "PROJ" } }) }));
jest.mock("next-auth/react", () => ({ useSession: () => mockSession() }));
jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCan(), useAccess: () => mockAccess() }));
jest.mock("@/features/build/shared/use-build-list-filters", () => ({ useBuildListFilters: () => mockFilters() }));
jest.mock("@/components/shared/dirty-state-context", () => ({ useRegisterDirtyState: jest.fn(), useNavigationLeave: () => mockLeave }));
jest.mock("sonner", () => ({ toast: { success: (message: string, options?: ToastOptions) => mockToast.success(message, options), error: (...args: unknown[]) => mockToast.error(...args) } }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }), usePathname: () => "/build/1/intake" }));
jest.mock("@/components/illustrations", () => ({ EmptyInboxIllustration: () => <div /> }));

const ACCESS_GRANTED = { data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} }, isLoading: false };
const request = { id: 42, title: "Actual request", status: "pending" };
type Callbacks = { onSuccess: (result: IntakeRequest) => void; onError: (error: Error) => void };
const callbacks: Callbacks[] = [];
function ack(status: IntakeRequest["status"], overrides: Partial<IntakeRequest> = {}): IntakeRequest {
  return { id: 42, projectId: 1, orgId: "org-1", title: request.title, description: null, source: "manual", status, submitterEmail: null, submitterName: null, priority: null, requestType: null, linkedWorkItemId: 91, declineReason: null, createdAt: "2026-10-04T00:00:00Z", updatedAt: "2026-10-04T00:00:00Z", ...overrides };
}
function query(overrides: Record<string, unknown> = {}) {
  return { data: undefined, isLoading: false, isError: false, error: undefined, refetch: jest.fn(), ...overrides };
}
function showRequest() {
  mockCan.mockReturnValue(true);
  mockRequests.mockReturnValue(query({ data: { data: [request] } }));
  return render(<IntakePage projectId={1} />);
}
beforeEach(() => {
  jest.clearAllMocks();
  callbacks.length = 0;
  mockLeave.mockImplementation((action: () => void) => action());
  mockTicket.mockReturnValue(query({ data: { id: 91, projectId: 1, ticketNumber: 7 }, isPending: false }));
  jest.spyOn(window, "open").mockImplementation(() => null);
  mockUpdate.mockImplementation((_body: unknown, handlers: Callbacks) => callbacks.push(handlers));
  mockAccept.mockImplementation((_body: unknown, handlers: Callbacks) => callbacks.push(handlers));
  mockCan.mockReturnValue(false);
  mockAccess.mockReturnValue(ACCESS_GRANTED);
  mockFilters.mockReturnValue({ value: () => "pending", setValue: jest.fn() });
  mockRequests.mockReturnValue(query({ data: { data: [] } }));
  mockTickets.mockReturnValue({ data: { data: [{ id: 91, ticketNumber: 7, title: "Canonical ticket", status: "todo" }] }, isFetching: false });
  mockSession.mockReturnValue({ status: "authenticated", data: { orgId: "org-1", user: { id: "actor-1" } } });
  mockMembers.mockReturnValue(query({ data: { data: [{ id: "user-123", firstName: "Jane", email: "jane@example.test" }] } }));
  mockCycles.mockReturnValue(query({ data: [{ id: 5, name: "Cycle five" }] }));
  mockModules.mockReturnValue(query({ data: [{ id: 2, name: "Workstream two" }] }));
});
afterEach(() => jest.restoreAllMocks());
it("renders permission denial instead of an empty queue", () => {
  mockAccess.mockReturnValue({ data: { isOrgOwner: false, scopes: {}, modules: {} }, isLoading: false });
  mockRequests.mockReturnValue(query());
  render(<IntakePage projectId={1} />);
  expect(screen.getByText(/permission/i)).toBeInTheDocument();
  expect(screen.queryByText("No pending items")).not.toBeInTheDocument();
});
it("does not flash denial while access is loading", () => {
  mockAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockRequests.mockReturnValue(query({ isLoading: true }));
  render(<IntakePage projectId={1} />);
  expect(screen.queryByText(/don't have permission/i)).not.toBeInTheDocument();
});
it("offers the backend 402 upgrade path", () => {
  mockRequests.mockReturnValue(query({ isError: true, error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" }) }));
  render(<IntakePage projectId={1} />);
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute("href", "/settings/billing");
});
it("hides New Item without workspace manage", () => {
  render(<IntakePage projectId={1} />);
  expect(screen.queryByRole("button", { name: /new item/i })).not.toBeInTheDocument();
});
it("hides every actual row decision without workspace manage", () => {
  mockRequests.mockReturnValue(query({ data: { data: [request] } }));
  render(<IntakePage projectId={1} />);
  expect(screen.getByText(request.title)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /accept|decline|duplicate/i })).not.toBeInTheDocument();
  expect(mockAccept).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
});
it("uses the URL backed intake tab to filter rows", () => {
  mockFilters.mockReturnValue({ value: () => "accepted", setValue: jest.fn() });
  mockRequests.mockReturnValue(query({ data: { data: [request, { id: 2, title: "Accepted item", status: "accepted" }] } }));
  render(<IntakePage projectId={1} />);
  expect(screen.getByText("Accepted item")).toBeInTheDocument();
  expect(screen.queryByText(request.title)).not.toBeInTheDocument();
});
it("requires a ticket selection before the actual row Duplicate action mutates", async () => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Mark as duplicate" }));
  await screen.findByRole("dialog");
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog", { name: /duplicate/i })).toBeInTheDocument();
});

async function choose(name: string, option: string) {
  fireEvent.keyDown(await screen.findByRole("combobox", { name }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}
async function chooseTicket() {
  fireEvent.click(await screen.findByRole("combobox", { name: "Search tickets…" }));
  fireEvent.click(await screen.findByRole("option", { name: /Canonical ticket/ }));
}
function latestCallbacks() {
  const result = callbacks.at(-1);
  if (!result) throw new Error("Expected actual decision mutation callback");
  return result;
}
it("submits every accept form field through the actual row and RHF controls", async () => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Accept — move to work queue" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Accept & Create" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("State is required");
  expect(mockAccept).not.toHaveBeenCalled();
  await choose("State", "In Review");
  await choose("Assignee", "Jane");
  await choose("Cycle", "Cycle five");
  await choose("Workstream", "Workstream two");
  fireEvent.click(screen.getByRole("button", { name: "Accept & Create" }));
  await waitFor(() => expect(mockAccept).toHaveBeenCalledTimes(1));
  expect(mockAccept).toHaveBeenCalledWith({ intakeRequestId: 42, projectId: 1, status: "accepted", state: "in_review", assigneeId: "user-123", cycleId: 5, moduleId: 2 }, expect.any(Object));
  expect(mockUpdate).not.toHaveBeenCalled();
  act(() => latestCallbacks().onSuccess(ack("accepted")));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(mockToast.success).toHaveBeenCalledWith("Item accepted — ticket created", expect.any(Object));
});
it("requires a decline reason and preserves the exact draft for retry", async () => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Decline — remove from intake" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Decline Item" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Reason is required");
  expect(mockUpdate).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox", { name: "Reason" }), { target: { value: "Already handled" } });
  fireEvent.click(screen.getByRole("button", { name: "Decline Item" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  const expected = { intakeRequestId: 42, projectId: 1, status: "declined", declineReason: "Already handled" };
  expect(mockUpdate).toHaveBeenLastCalledWith(expected, expect.any(Object));
  act(() => latestCallbacks().onError(new Error("Request refused")));
  expect(screen.getByRole("textbox", { name: "Reason" })).toHaveValue("Already handled");
  expect(mockToast.error).toHaveBeenCalledWith("Request refused");
  fireEvent.click(screen.getByRole("button", { name: "Decline Item" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  expect(mockUpdate).toHaveBeenLastCalledWith(expected, expect.any(Object));
  act(() => latestCallbacks().onSuccess(ack("declined")));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("uses the same-project canonical ticket picker and submits a selected duplicate", async () => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Mark as duplicate" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Mark as Duplicate" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Select a valid existing ticket.");
  expect(mockUpdate).not.toHaveBeenCalled();
  await chooseTicket();
  expect(mockTickets).toHaveBeenCalledWith(1, { limit: 20 });
  fireEvent.click(screen.getByRole("button", { name: "Mark as Duplicate" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(mockUpdate).toHaveBeenCalledWith({ intakeRequestId: 42, projectId: 1, status: "duplicate", linkedWorkItemId: 91 }, expect.any(Object));
  act(() => latestCallbacks().onSuccess(ack("duplicate")));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it.each([0, -1, 1.5, 2147483648])("refuses invalid canonical picker target %s", async (id) => {
  mockTickets.mockReturnValue({ data: { data: [{ id, ticketNumber: 7, title: "Canonical ticket", status: "todo" }] }, isFetching: false });
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Mark as duplicate" }));
  await screen.findByRole("dialog");
  await chooseTicket();
  fireEvent.click(screen.getByRole("button", { name: "Mark as Duplicate" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Select a valid existing ticket.");
  expect(mockUpdate).not.toHaveBeenCalled();
});
it("fences pending close, Escape, edit and repeated submit until matching ACK", async () => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Decline — remove from intake" }));
  await screen.findByRole("dialog");
  const reason = screen.getByRole("textbox", { name: "Reason" });
  fireEvent.change(reason, { target: { value: "Bound draft" } });
  const submit = screen.getByRole("button", { name: "Decline Item" });
  fireEvent.click(submit);
  fireEvent.click(submit);
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(reason).toBeDisabled();
  expect(submit).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await act(async () => { fireEvent.pointerDown(document.body, { button: 0, pointerType: "mouse" }); });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await userEvent.setup().type(reason, "changed");
  expect(reason).toHaveValue("Bound draft");
  fireEvent.submit(screen.getByRole("dialog").querySelector("form") ?? reason);
  await act(async () => {});
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  act(() => latestCallbacks().onSuccess(ack("declined")));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it.each(["accept", "duplicate"])("fences pending %s controls and repeated submissions", async (action) => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: action === "accept" ? "Accept — move to work queue" : "Mark as duplicate" }));
  await screen.findByRole("dialog");
  if (action === "accept") await choose("State", "Todo");
  else await chooseTicket();
  const label = action === "accept" ? "Accept & Create" : "Mark as Duplicate";
  const mutation = action === "accept" ? mockAccept : mockUpdate;
  fireEvent.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(mutation).toHaveBeenCalledTimes(1));
  const dialog = screen.getByRole("dialog");
  for (const control of within(dialog).getAllByRole("combobox")) expect(control).toBeDisabled();
  fireEvent.submit(dialog.querySelector("form") ?? dialog);
  fireEvent.keyDown(dialog, { key: "Escape" });
  await act(async () => {});
  expect(mutation).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  act(() => latestCallbacks().onError(new Error("Retry decision")));
  expect(screen.getByRole("button", { name: label })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(mutation).toHaveBeenCalledTimes(2));
  expect(mutation.mock.calls[1]?.[0]).toEqual(mutation.mock.calls[0]?.[0]);
  act(() => latestCallbacks().onSuccess(ack(action === "accept" ? "accepted" : "duplicate")));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("permits dismissal before submission and resets a reopened draft", async () => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Decline — remove from intake" }));
  await screen.findByRole("dialog");
  fireEvent.change(screen.getByRole("textbox", { name: "Reason" }), { target: { value: "Discard me" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Decline — remove from intake" }));
  await screen.findByRole("dialog");
  expect(screen.getByRole("textbox", { name: "Reason" })).toHaveValue("");
  expect(mockUpdate).not.toHaveBeenCalled();
});
it("allows a managing actor to open the existing create flow", async () => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: /new item/i }));
  expect(await screen.findByRole("dialog", { name: "Create Intake Item" })).toBeInTheDocument();
});
it.each<Partial<IntakeRequest>>([{ id: 43 }, { projectId: 2 }, { orgId: "org-2" }, { status: "declined" }, { linkedWorkItemId: 92 }])("preserves the duplicate draft on mismatched ACK %j and retries its exact target", async (mismatch) => {
  showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Mark as duplicate" }));
  await screen.findByRole("dialog");
  await chooseTicket();
  fireEvent.click(screen.getByRole("button", { name: "Mark as Duplicate" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  act(() => latestCallbacks().onSuccess(ack("duplicate", mismatch)));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Search tickets…" })).toHaveTextContent("Canonical ticket");
  expect(mockToast.success).not.toHaveBeenCalled();
  expect(mockToast.error).toHaveBeenCalledWith("The decision response did not match this request. Please retry.");
  fireEvent.click(screen.getByRole("button", { name: "Mark as Duplicate" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  expect(mockUpdate.mock.calls[1]?.[0]).toEqual(mockUpdate.mock.calls[0]?.[0]);
  act(() => latestCallbacks().onSuccess(ack("duplicate")));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it.each(["project", "organization", "actor", "session", "permission"])("discards the pending draft on %s change and ignores its late ACK", async (change) => {
  const view = showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Decline — remove from intake" }));
  await screen.findByRole("dialog");
  fireEvent.change(screen.getByRole("textbox", { name: "Reason" }), { target: { value: "Old context" } });
  fireEvent.click(screen.getByRole("button", { name: "Decline Item" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  const previous = latestCallbacks();
  if (change === "organization") mockSession.mockReturnValue({ status: "authenticated", data: { orgId: "org-2", user: { id: "actor-1" } } });
  if (change === "actor") mockSession.mockReturnValue({ status: "authenticated", data: { orgId: "org-1", user: { id: "actor-2" } } });
  if (change === "session") mockSession.mockReturnValue({ status: "unauthenticated", data: null });
  if (change === "permission") mockCan.mockReturnValue(false);
  view.rerender(<IntakePage projectId={change === "project" ? 2 : 1} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  if (change === "session") mockSession.mockReturnValue({ status: "authenticated", data: { orgId: "org-1", user: { id: "actor-1" } } });
  if (change === "permission") mockCan.mockReturnValue(true);
  view.rerender(<IntakePage projectId={change === "project" ? 2 : 1} />);
  fireEvent.click(screen.getByRole("button", { name: "Decline — remove from intake" }));
  await screen.findByRole("dialog");
  expect(screen.getByRole("textbox", { name: "Reason" })).toHaveValue("");
  fireEvent.change(screen.getByRole("textbox", { name: "Reason" }), { target: { value: "New context" } });
  act(() => { previous.onSuccess(ack("declined")); previous.onError(new Error("Stale failure")); });
  expect(screen.getByRole("textbox", { name: "Reason" })).toHaveValue("New context");
  expect(mockToast.success).not.toHaveBeenCalled();
  expect(mockToast.error).not.toHaveBeenCalled();
});

it("highlights the card whose id matches highlightId", () => {
  mockFilters.mockReturnValue({ value: () => "all", setValue: jest.fn() });
  mockRequests.mockReturnValue(query({ data: { data: [{ id: 77, title: "Linked item", status: "pending" }] } }));
  render(<IntakePage projectId={1} highlightId={77} />);
  const highlighted = document.querySelector("[data-highlighted='true']");
  expect(highlighted).toBeInTheDocument();
  expect(highlighted).toHaveClass("ring-2");
  expect(screen.getByText("Linked item")).toBeInTheDocument();
  expect(screen.queryByTestId("intake-item-not-found")).not.toBeInTheDocument();
});

async function acceptRequest() {
  const view = showRequest();
  fireEvent.click(screen.getByRole("button", { name: "Accept — move to work queue" }));
  await screen.findByRole("dialog");
  await choose("State", "Todo");
  fireEvent.click(screen.getByRole("button", { name: "Accept & Create" }));
  await waitFor(() => expect(mockAccept).toHaveBeenCalledTimes(1));
  act(() => latestCallbacks().onSuccess(ack("accepted")));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(mockToast.success.mock.calls[0]?.[0]).toBe("Item accepted — ticket created");
  return view;
}

function ticketActions() {
  return mockToast.success.mock.calls.flatMap(([, options]) => options?.action ? [options.action] : []);
}

it("opens the accepted ticket using its authorized number rather than its database id", async () => {
  await acceptRequest();
  await waitFor(() => expect(ticketActions()).toHaveLength(1));
  const action = ticketActions()[0];
  if (!action) throw new Error("Expected actual View ticket action");
  expect(action.label).toBe("View ticket");
  act(() => action.onClick());
  expect(mockPush).toHaveBeenCalledWith("/build/1/tickets/7");
  expect(mockLeave).toHaveBeenCalledTimes(1);
  expect(window.open).not.toHaveBeenCalled();
  expect(mockTicket).toHaveBeenLastCalledWith(1, 91, INLINE_READ_ERROR);
});

it.each(["pending", "denied", "missing", "error", "wrong-id", "wrong-project"])("keeps acceptance successful without a View ticket action for %s lookup", async (state) => {
  mockTicket.mockReturnValue(query({
    data: state === "wrong-id" ? { id: 92, projectId: 1, ticketNumber: 7 } : state === "wrong-project" ? { id: 91, projectId: 2, ticketNumber: 7 } : null,
    isPending: state === "pending",
    isError: state === "denied" || state === "error",
    error: state === "denied" ? new ApiError("Denied", 403) : state === "error" ? new TypeError("Failed to fetch") : null,
  }));
  await acceptRequest();
  expect(ticketActions()).toHaveLength(0);
  expect(mockToast.error).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(window.open).not.toHaveBeenCalled();
});

it("offers one action after pending lookup resolves and preserves it across repeated renders", async () => {
  mockTicket.mockReturnValue(query({ isPending: true }));
  const view = await acceptRequest();
  expect(ticketActions()).toHaveLength(0);
  mockTicket.mockReturnValue(query({ data: { id: 91, projectId: 1, ticketNumber: 7 }, isPending: false }));
  view.rerender(<IntakePage projectId={1} />);
  await waitFor(() => expect(ticketActions()).toHaveLength(1));
  view.rerender(<IntakePage projectId={1} />);
  view.rerender(<IntakePage projectId={1} />);
  expect(ticketActions()).toHaveLength(1);
});

it.each(["project", "session"])("ignores delayed accepted-ticket data after %s context changes", async (change) => {
  mockTicket.mockReturnValue(query({ isPending: true }));
  const view = await acceptRequest();
  mockToast.success.mockClear();
  if (change === "session") mockSession.mockReturnValue({ status: "authenticated", data: { orgId: "org-2", user: { id: "actor-2" } } });
  mockTicket.mockReturnValue(query({ data: { id: 91, projectId: 1, ticketNumber: 7 }, isPending: false }));
  view.rerender(<IntakePage projectId={change === "project" ? 2 : 1} />);
  expect(ticketActions()).toHaveLength(0);
  expect(mockPush).not.toHaveBeenCalled();
});

it("lets the navigation leave guard fence the actual View ticket action", async () => {
  await acceptRequest();
  await waitFor(() => expect(ticketActions()).toHaveLength(1));
  mockLeave.mockImplementation(() => undefined);
  const action = ticketActions()[0];
  if (!action) throw new Error("Expected actual View ticket action");
  act(() => action.onClick());
  expect(mockLeave).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
  expect(window.open).not.toHaveBeenCalled();
});

it.each(["project", "session", "permission"])("refuses a captured View ticket action after %s context changes", async (change) => {
  const view = await acceptRequest();
  await waitFor(() => expect(ticketActions()).toHaveLength(1));
  const action = ticketActions()[0];
  if (!action) throw new Error("Expected actual View ticket action");
  if (change === "session") mockSession.mockReturnValue({ status: "unauthenticated", data: null });
  if (change === "permission") mockCan.mockReturnValue(false);
  view.rerender(<IntakePage projectId={change === "project" ? 2 : 1} />);
  act(() => action.onClick());
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockLeave).not.toHaveBeenCalled();
  expect(window.open).not.toHaveBeenCalled();
});

it("rechecks the authorized ticket after a delayed navigation leave confirmation", async () => {
  const view = await acceptRequest();
  await waitFor(() => expect(ticketActions()).toHaveLength(1));
  let confirmLeave: (() => void) | undefined;
  mockLeave.mockImplementation((action: () => void) => { confirmLeave = action; });
  const action = ticketActions()[0];
  if (!action) throw new Error("Expected actual View ticket action");
  act(() => action.onClick());
  expect(mockPush).not.toHaveBeenCalled();
  mockTicket.mockReturnValue(query({ isError: true, error: new ApiError("Access revoked", 403) }));
  view.rerender(<IntakePage projectId={1} />);
  const confirm = confirmLeave;
  if (!confirm) throw new Error("Expected navigation leave confirmation");
  act(() => confirm());
  expect(mockPush).not.toHaveBeenCalled();
  act(() => action.onClick());
  expect(mockLeave).toHaveBeenCalledTimes(1);
  expect(window.open).not.toHaveBeenCalled();
});

it("shows the not-in-this-view banner when highlightId does not match any loaded item", () => {
  mockFilters.mockReturnValue({ value: () => "all", setValue: jest.fn() });
  mockRequests.mockReturnValue(query({ data: { data: [{ id: 1, title: "Other item", status: "pending" }] } }));
  render(<IntakePage projectId={1} highlightId={99} />);
  expect(screen.getByTestId("intake-item-not-found")).toBeInTheDocument();
  expect(document.querySelector("[data-highlighted='true']")).not.toBeInTheDocument();
});

it("switches the active tab to 'all' when the highlighted item is on a different tab", () => {
  const mockSetValue = jest.fn();
  mockFilters.mockReturnValue({ value: () => "pending", setValue: mockSetValue });
  mockRequests.mockReturnValue(query({ data: { data: [{ id: 77, title: "Accepted item", status: "accepted" }] } }));
  render(<IntakePage projectId={1} highlightId={77} />);
  expect(mockSetValue).toHaveBeenCalledWith("tab", "all");
});
