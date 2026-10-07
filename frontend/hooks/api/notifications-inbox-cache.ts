import type { InfiniteData, Query, QueryClient } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { Notification } from "@/types/notifications";
import type { IdCursorPage } from "@/hooks/api/id-cursor-page-schema";
import type { NotificationInboxItem, UnifiedInboxItem, UnifiedInboxResponse } from "@/types/inbox";

type PersonalRow = Notification | NotificationInboxItem;
type CacheRow = Notification | UnifiedInboxItem;
export type NotificationFieldChange =
  | { field: "isRead" | "pinned"; value: boolean }
  | { field: "archivedAt" | "snoozedUntil"; value: Notification["archivedAt"] };
export type NotificationCacheChange =
  | { kind: "field"; change: NotificationFieldChange; matches: (row: PersonalRow) => boolean }
  | { kind: "remove"; ids: ReadonlySet<number> };
type Operation = { token: symbol; change: NotificationFieldChange; pending: boolean };
type FieldState = {
  query: Query; id: number; owner: string; base: NotificationFieldChange; expected: CacheRow; generation: number;
  operations: Operation[];
};
export type NotificationFieldReceipt = { state: FieldState; token: symbol };
const fields = new WeakMap<QueryClient, Map<Query, Map<string, FieldState>>>();

export function isInfiniteData<T>(data: unknown): data is InfiniteData<T> {
  return typeof data === "object" && data !== null && "pages" in data && "pageParams" in data;
}
export function isNotificationList(data: unknown): data is Notification[] {
  return Array.isArray(data);
}
function isPersonalRow(row: CacheRow): row is PersonalRow {
  return !("kind" in row) || row.kind === "notification";
}
function mapRows(data: unknown, transform: (row: CacheRow) => CacheRow | null): unknown {
  function map(rows: CacheRow[]) {
    return rows.flatMap((row) => { const next = transform(row); return next === null ? [] : [next]; });
  }
  if (isInfiniteData<Notification[] | IdCursorPage<Notification> | UnifiedInboxResponse>(data)) {
    return { ...data, pages: data.pages.map((page) => Array.isArray(page)
      ? map(page) : "items" in page ? { ...page, items: map(page.items) } : { ...page, data: map(page.data) }) };
  }
  return isNotificationList(data) ? map(data) : data;
}
function rowsOf(data: unknown): CacheRow[] {
  if (isInfiniteData<Notification[] | IdCursorPage<Notification> | UnifiedInboxResponse>(data))
    return data.pages.flatMap<CacheRow>((page) => Array.isArray(page) ? page : "items" in page ? page.items : page.data);
  return isNotificationList(data) ? data : [];
}
function readField(row: PersonalRow, change: NotificationFieldChange): NotificationFieldChange {
  if (change.field === "isRead" || change.field === "pinned") return { field: change.field, value: row[change.field] };
  return { field: change.field, value: "kind" in row ? null : row[change.field] };
}
function writeField(row: PersonalRow, change: NotificationFieldChange): PersonalRow {
  if (change.field === "isRead" || change.field === "pinned") return { ...row, [change.field]: change.value };
  return "kind" in row ? row : { ...row, [change.field]: change.value };
}
function tracks(row: PersonalRow, change: NotificationFieldChange) {
  return !("kind" in row) || change.field === "isRead" || change.field === "pinned";
}
function fieldKey(id: number, field: string) { return String(id) + ":" + field; }
function queryFields(client: QueryClient, query: Query) {
  let queries = fields.get(client);
  if (!queries) { queries = new Map(); fields.set(client, queries); }
  let records = queries.get(query);
  if (!records) { records = new Map(); queries.set(query, records); }
  return records;
}
function updateReferences(client: QueryClient, query: Query, previous: Map<number, CacheRow>, generation: number) {
  const current = new Map<number, PersonalRow>(rowsOf(query.state.data).filter(isPersonalRow).map((row) => [row.id, row]));
  for (const state of fields.get(client)?.get(query)?.values() ?? []) {
    if (state.expected !== previous.get(state.id) || state.generation !== generation) continue;
    const next = current.get(state.id);
    if (next) { state.expected = next; state.generation = query.state.dataUpdateCount; }
  }
}
function stageField(client: QueryClient, query: Query, row: PersonalRow, change: NotificationFieldChange, token: symbol, owner: string) {
  const records = queryFields(client, query);
  const key = fieldKey(row.id, change.field);
  let state = records.get(key);
  if (!state || state.owner !== owner || state.expected !== row || state.generation !== query.state.dataUpdateCount) {
    state = { query, id: row.id, owner, base: readField(row, change), expected: row, generation: query.state.dataUpdateCount, operations: [] };
    records.set(key, state);
  }
  state.operations.push({ token, change, pending: true });
  return { state, token };
}
export function applyNotificationCacheChange(client: QueryClient, effect: NotificationCacheChange, owner: string): NotificationFieldReceipt[] {
  const receipts: NotificationFieldReceipt[] = [];
  const queries = [
    ...client.getQueryCache().findAll({ queryKey: platformCoreQueryKeys.notifications.lists() }),
    ...client.getQueryCache().findAll({ queryKey: platformCoreQueryKeys.inbox.all }),
  ];
  const token = Symbol("notification-field");
  for (const query of queries) {
    const generation = query.state.dataUpdateCount;
    const previous = new Map<number, CacheRow>();
    const next = mapRows(query.state.data, (row) => {
      if (!isPersonalRow(row)) return row;
      previous.set(row.id, row);
      if (effect.kind === "remove") return effect.ids.has(row.id) ? null : row;
      if (!effect.matches(row)) return row;
      if (!tracks(row, effect.change)) {
        return effect.change.value !== null ? null : row;
      }
      receipts.push(stageField(client, query, row, effect.change, token, owner));
      return writeField(row, effect.change);
    });
    if (next !== query.state.data) client.setQueryData(query.queryKey, next);
    updateReferences(client, query, previous, generation);
  }
  return receipts;
}
function prune(client: QueryClient, state: FieldState) {
  const queries = fields.get(client);
  const records = queries?.get(state.query);
  const key = fieldKey(state.id, state.base.field);
  if (state.operations.some((operation) => operation.pending)) {
    const lastSuccess = state.operations.findLast((operation) => !operation.pending);
    state.operations = state.operations.filter((operation) => operation.pending || operation === lastSuccess);
    return;
  }
  if (records?.get(key) === state) records.delete(key);
  if (records?.size === 0) queries?.delete(state.query);
  if (queries?.size === 0) fields.delete(client);
}
export function settleNotificationCacheChange(
  client: QueryClient, receipts: NotificationFieldReceipt[], failed: boolean, mayRestore: boolean,
) {
  const grouped = new Map<Query, NotificationFieldReceipt[]>();
  for (const receipt of receipts) {
    const group = grouped.get(receipt.state.query) ?? [];
    group.push(receipt); grouped.set(receipt.state.query, group);
  }
  for (const [query, group] of grouped) {
    const current = new Map<number, PersonalRow>(rowsOf(query.state.data).filter(isPersonalRow).map((row) => [row.id, row]));
    const changes = new Map<number, NotificationFieldChange[]>();
    const generation = query.state.dataUpdateCount;
    const sameQuery = client.getQueryCache().find({ queryKey: query.queryKey, exact: true }) === query;
    for (const { state, token } of group) {
      const operation = state.operations.find((entry) => entry.token === token);
      if (!operation) continue;
      if (failed) state.operations = state.operations.filter((entry) => entry !== operation);
      else operation.pending = false;
      if (failed && mayRestore && sameQuery && current.get(state.id) === state.expected && state.generation === generation) {
        const rowChanges = changes.get(state.id) ?? [];
        rowChanges.push(state.operations.at(-1)?.change ?? state.base);
        changes.set(state.id, rowChanges);
      }
    }
    if (changes.size > 0) {
      client.setQueryData(query.queryKey, mapRows(query.state.data, (row) => {
        if (!isPersonalRow(row)) return row;
        return (changes.get(row.id) ?? []).reduce(writeField, row);
      }));
      updateReferences(client, query, current, generation);
    }
    for (const { state } of group) prune(client, state);
  }
}
