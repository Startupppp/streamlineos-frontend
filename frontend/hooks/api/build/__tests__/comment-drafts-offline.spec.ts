import { bufferDraft, peekBuffer, acknowledgeBufferedDraft, replayBufferedDrafts } from "../comment-draft-offline-buffer";
import { orgScopedStorageKey } from "@/lib/org-scoped-storage";

const actorA = "authenticated:org-a:user-a";
const actorB = "authenticated:org-a:user-b";
const otherOrg = "authenticated:org-b:user-a";
const storageKey = (scope: string) => orgScopedStorageKey("slos:comment-draft-pending:v2", scope);

beforeEach(() => localStorage.clear());

it("does not expose one account's offline text to another account in the same organization", () => {
  bufferDraft(actorA, 1, "private A");
  expect(peekBuffer(actorB)).toEqual([]);
  expect(peekBuffer(actorA)).toEqual([expect.objectContaining({ ticketId: 1, body: "private A" })]);
});

it("does not expose one organization's offline text when the same person switches organizations", () => {
  bufferDraft(actorA, 1, "org A text");
  expect(peekBuffer(otherOrg)).toEqual([]);
  bufferDraft(otherOrg, 1, "org B text");
  expect(peekBuffer(actorA)[0]?.body).toBe("org A text");
});

it.each(["unscoped", "loading", "unauthenticated", "authenticated::user-a", "authenticated:org-a:"])("refuses storage operations under incomplete scope %s", (scope) => {
  expect(bufferDraft(scope, 1, "private text")).toBeNull();
  expect(peekBuffer(scope)).toEqual([]);
  expect(localStorage.length).toBe(0);
});

it("preserves the ownerless legacy buffer without migrating or replaying it", async () => {
  const legacy = JSON.stringify({ "1": "unattributed private text" });
  localStorage.setItem("slos:comment-draft-pending", legacy);
  const send = jest.fn();
  await replayBufferedDrafts(actorB, send, new AbortController().signal);
  expect(send).not.toHaveBeenCalled();
  expect(localStorage.getItem("slos:comment-draft-pending")).toBe(legacy);
});

it.each(["{broken", JSON.stringify({ version: 1, scope: actorA, entries: [] }), JSON.stringify({ version: 2, scope: actorB, entries: [] }), JSON.stringify({ version: 2, scope: actorA, entries: [], extra: true })])("preserves unreadable scoped bytes instead of overwriting them", (raw) => {
  localStorage.setItem(storageKey(actorA), raw);
  expect(peekBuffer(actorA)).toEqual([]);
  expect(bufferDraft(actorA, 1, "new text")).toBeNull();
  expect(localStorage.getItem(storageKey(actorA))).toBe(raw);
});

it("peeks without consuming and acknowledges only the successful entry revision", () => {
  const entry = bufferDraft(actorA, 5, "first text");
  if (!entry) throw new Error("Missing buffered draft");
  expect(peekBuffer(actorA)).toEqual([entry]);
  const newer = bufferDraft(actorA, 5, "newer text");
  expect(acknowledgeBufferedDraft(actorA, entry)).toBe(false);
  expect(peekBuffer(actorA)).toEqual([newer]);
  if (!newer) throw new Error("Missing newer draft");
  expect(acknowledgeBufferedDraft(actorA, newer)).toBe(true);
  expect(peekBuffer(actorA)).toEqual([]);
});

it("cannot acknowledge another scope's otherwise identical entry", () => {
  const entry = bufferDraft(actorA, 5, "private text");
  if (!entry) throw new Error("Missing buffered draft");
  expect(acknowledgeBufferedDraft(actorB, entry)).toBe(false);
  expect(peekBuffer(actorA)).toEqual([entry]);
});

it.each([0, -1, 1.5, 2147483648, Number.NaN])("does not persist invalid ticket identifier %s", (ticketId) => {
  expect(bufferDraft(actorA, ticketId, "text")).toBeNull();
  expect(localStorage.length).toBe(0);
});

it.each(["", "x".repeat(10001)])("refuses invalid draft body length without discarding existing text", (body) => {
  const saved = bufferDraft(actorA, 1, "retained");
  expect(bufferDraft(actorA, 1, body)).toBeNull();
  expect(peekBuffer(actorA)).toEqual([saved]);
});

it("keeps an unsent entry after a failed replay and recovers it on a later successful replay", async () => {
  const saved = bufferDraft(actorA, 1, "retained");
  await expect(replayBufferedDrafts(actorA, async () => { throw new Error("offline"); }, new AbortController().signal)).rejects.toThrow("offline");
  expect(peekBuffer(actorA)).toEqual([saved]);
  await replayBufferedDrafts(actorA, async () => true, new AbortController().signal);
  expect(peekBuffer(actorA)).toEqual([]);
});

it("never acknowledges an aborted or identity-rejected save", async () => {
  const saved = bufferDraft(actorA, 1, "retained");
  const controller = new AbortController();
  await replayBufferedDrafts(actorA, async () => { controller.abort(); return true; }, controller.signal);
  expect(peekBuffer(actorA)).toEqual([saved]);
  await replayBufferedDrafts(actorA, async () => false, new AbortController().signal);
  expect(peekBuffer(actorA)).toEqual([saved]);
});

it("deduplicates concurrent replay owners and releases the lease after completion", async () => {
  bufferDraft(actorA, 1, "retained");
  let resolveSave: ((saved: boolean) => void) | undefined;
  const send = jest.fn(() => new Promise<boolean>((resolve) => { resolveSave = resolve; }));
  const first = replayBufferedDrafts(actorA, send, new AbortController().signal);
  const second = replayBufferedDrafts(actorA, send, new AbortController().signal);
  expect(send).toHaveBeenCalledTimes(1);
  resolveSave?.(true);
  await Promise.all([first, second]);
  bufferDraft(actorA, 2, "next");
  await replayBufferedDrafts(actorA, async () => true, new AbortController().signal);
  expect(peekBuffer(actorA)).toEqual([]);
});

it("bounds stored entries and preserves existing entries when the collection is full", () => {
  for (let id = 1; id <= 100; id++) bufferDraft(actorA, id, "body " + id);
  expect(bufferDraft(actorA, 101, "overflow")).toBeNull();
  expect(peekBuffer(actorA)).toHaveLength(100);
  expect(bufferDraft(actorA, 1, "edited")).not.toBeNull();
  expect(peekBuffer(actorA)[0]?.body).toBe("edited");
});

it("retains the stored entry when persistence throws during acknowledgement", () => {
  const saved = bufferDraft(actorA, 1, "retained");
  if (!saved) throw new Error("Missing buffered draft");
  const remove = jest.spyOn(Storage.prototype, "removeItem").mockImplementationOnce(() => { throw new Error("unavailable"); });
  expect(acknowledgeBufferedDraft(actorA, saved)).toBe(false);
  remove.mockRestore();
  expect(peekBuffer(actorA)).toEqual([saved]);
});
