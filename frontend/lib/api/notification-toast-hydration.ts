import { isImpersonating, request } from "@/lib/api-client";
import { ApiError, isApiError, lazyContract, parseApiResponse } from "@/lib/api-envelope";
import { expectedRequestIdentitySchema, type ExpectedRequestIdentity } from "@/lib/api-request-identity";
import type { Notification } from "@/types/notifications";

const listContract = lazyContract(() => import("@/hooks/api/notifications-schema").then((m) => m.notificationListContract));
const BATCH_SIZE = 100;
const MAX_PENDING = 1_000;
const MAX_SEEN = 1_000;
const MAX_ATTEMPTS = 3;
const BATCH_DELAY_MS = 100;

interface HydrationOptions {
  identity: ExpectedRequestIdentity;
  signal: AbortSignal;
  isCurrent: () => boolean;
  onNotification: (notification: Notification) => void;
  invalidate: () => void;
}

export function createNotificationToastHydration(options: HydrationOptions) {
  const identity = expectedRequestIdentitySchema.safeParse(options.identity);
  const pending = new Map<number, number>();
  const held = new Set<number>();
  const seen = new Set<number>();
  const running = new Set<number>();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let changed = false;
  let inFlight = false;

  const alive = () => !stopped && identity.success && !controller.signal.aborted && !options.signal.aborted;
  const valid = () => alive() && !isImpersonating() && options.isCurrent();
  const remember = (id: number) => {
    seen.add(id);
    if (seen.size > MAX_SEEN) {
      const oldest = seen.values().next().value;
      if (oldest !== undefined) seen.delete(oldest);
    }
  };
  const schedule = (delay = BATCH_DELAY_MS) => {
    if (!valid() || timer || inFlight) return;
    timer = setTimeout(() => { timer = undefined; void flush(); }, delay);
  };
  const stop = () => {
    stopped = true;
    controller.abort();
    if (timer) clearTimeout(timer);
    timer = undefined;
    pending.clear(); held.clear(); running.clear(); seen.clear();
    options.signal.removeEventListener("abort", stop);
  };

  async function flush() {
    if (!valid() || !identity.success) return;
    if (changed) { changed = false; options.invalidate(); }
    const batch = [...pending].slice(0, BATCH_SIZE);
    if (!batch.length) return;
    inFlight = true;
    for (const [id] of batch) { pending.delete(id); running.add(id); }
    try {
      const path = `/notifications?${new URLSearchParams({ section: "UNREAD", ids: batch.map(([id]) => id).join(","), limit: String(batch.length) })}`;
      const response = await request(path, { method: "GET" }, { signal: controller.signal, expectedIdentity: identity.data });
      const page = await parseApiResponse(response, await listContract(), "/notifications");
      if (!valid()) return;
      if (page.data.some((row) => row.orgId !== identity.data.orgId || (row.userId !== null && row.userId !== identity.data.userId)))
        throw new ApiError("Loaded notifications did not match the signed-in account.", 200, "INVALID_RESPONSE");
      const byId = new Map(page.data.map((row) => [row.id, row]));
      for (const [id] of batch) {
        if (!valid()) return;
        remember(id);
        const row = byId.get(id);
        if (row && !row.isRead && !row.archivedAt && (!row.snoozedUntil || Date.parse(row.snoozedUntil) <= Date.now()) && row.priority !== "LOW") options.onNotification(row);
      }
    } catch (error) {
      if (!alive() || isImpersonating()) return;
      const transient = isApiError(error) ? error.code === "NETWORK_ERROR" || error.code === "TIMEOUT" || error.status === 408 || error.status === 429 || (error.status !== undefined && error.status >= 500) : error instanceof TypeError;
      for (const [id, attempt] of batch) {
        if (!transient) remember(id);
        else if (attempt + 1 >= MAX_ATTEMPTS) held.add(id);
        else pending.set(id, attempt + 1);
      }
    } finally {
      if (alive() && !valid() && !isImpersonating())
        for (const [id, attempt] of batch)
          if (!seen.has(id) && !pending.has(id) && !held.has(id)) pending.set(id, attempt);
      inFlight = false;
      running.clear();
      if (pending.size || changed) schedule([...pending.values()].some((attempt) => attempt === 0) ? BATCH_DELAY_MS : 1_000);
    }
  }

  options.signal.addEventListener("abort", stop, { once: true });
  return {
    hint(id: number) {
      if (!valid() || !Number.isSafeInteger(id) || id <= 0) return;
      changed = true;
      if (!seen.has(id) && !pending.has(id) && !running.has(id) && !held.has(id) && pending.size + running.size + held.size < MAX_PENDING) pending.set(id, 0);
      schedule();
    },
    changed() { if (valid()) { changed = true; schedule(); } },
    wake() { if (pending.size || changed) schedule(); },
    reconnect() {
      if (!valid()) return;
      for (const id of held) pending.set(id, 0);
      held.clear();
      changed = true;
      schedule();
    },
    stop,
  };
}
