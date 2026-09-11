import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import {
  cancelAndSnapshot,
  patchCount,
  patchDetail,
  patchRow,
  patchRows,
  removeRow,
  restoreSnapshot,
  type RowPage,
} from "./optimistic-cache";

interface Row {
  id: number;
  isRead: boolean;
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const markRead = (rows: Row[]) => rows.map((row) => ({ ...row, isRead: true }));

describe("patchRows — every cache shape this codebase stores rows in", () => {
  it("patches a flat array", () => {
    const qc = client();
    qc.setQueryData(["mail", "list"], [{ id: 1, isRead: false }]);

    patchRows<Row>(qc, { queryKey: ["mail"] }, markRead);

    expect(qc.getQueryData(["mail", "list"])).toEqual([{ id: 1, isRead: true }]);
  });

  it("patches a cursor page keyed by `data` without dropping its pagination", () => {
    const qc = client();
    qc.setQueryData(["mail", "page"], {
      data: [{ id: 1, isRead: false }],
      pagination: { nextCursor: "abc", hasMore: true },
    });

    patchRows<Row>(qc, { queryKey: ["mail"] }, markRead);

    expect(qc.getQueryData(["mail", "page"])).toEqual({
      data: [{ id: 1, isRead: true }],
      pagination: { nextCursor: "abc", hasMore: true },
    });
  });

  it("patches a page keyed by `items`", () => {
    const qc = client();
    qc.setQueryData(["mail", "items"], { items: [{ id: 1, isRead: false }], total: 1 });

    patchRows<Row>(qc, { queryKey: ["mail"] }, markRead);

    expect(qc.getQueryData(["mail", "items"])).toEqual({
      items: [{ id: 1, isRead: true }],
      total: 1,
    });
  });

  it("patches every page of an InfiniteData, not just the first", () => {
    const qc = client();
    const infinite: InfiniteData<RowPage<Row>> = {
      pages: [
        { data: [{ id: 1, isRead: false }] },
        { data: [{ id: 2, isRead: false }] },
        { data: [{ id: 3, isRead: false }] },
      ],
      pageParams: [undefined, "p2", "p3"],
    };
    qc.setQueryData(["mail", "infinite"], infinite);

    patchRows<Row>(qc, { queryKey: ["mail"] }, markRead);

    const next = qc.getQueryData<InfiniteData<RowPage<Row>>>(["mail", "infinite"]);
    expect(next?.pages).toEqual([
      { data: [{ id: 1, isRead: true }] },
      { data: [{ id: 2, isRead: true }] },
      { data: [{ id: 3, isRead: true }] },
    ]);
    expect(next?.pageParams).toEqual([undefined, "p2", "p3"]);
  });

  it("leaves an unrecognised shape untouched rather than guessing", () => {
    const qc = client();
    qc.setQueryData(["mail", "odd"], { rows: [{ id: 1, isRead: false }] });

    patchRows<Row>(qc, { queryKey: ["mail"] }, markRead);

    expect(qc.getQueryData(["mail", "odd"])).toEqual({ rows: [{ id: 1, isRead: false }] });
  });

  it("does not create an entry for a key that holds nothing", () => {
    const qc = client();

    patchRows<Row>(qc, { queryKey: ["mail"] }, markRead);

    expect(qc.getQueryData(["mail", "list"])).toBeUndefined();
  });

  it("patches list, page and infinite variants of one prefix in a single call", () => {
    const qc = client();
    qc.setQueryData(["mail", "list"], [{ id: 1, isRead: false }]);
    qc.setQueryData(["mail", "page"], { data: [{ id: 1, isRead: false }] });
    qc.setQueryData(["mail", "infinite"], {
      pages: [{ items: [{ id: 1, isRead: false }] }],
      pageParams: [undefined],
    });

    patchRows<Row>(qc, { queryKey: ["mail"] }, markRead);

    expect(qc.getQueryData(["mail", "list"])).toEqual([{ id: 1, isRead: true }]);
    expect(qc.getQueryData(["mail", "page"])).toEqual({ data: [{ id: 1, isRead: true }] });
    expect(
      qc.getQueryData<InfiniteData<RowPage<Row>>>(["mail", "infinite"])?.pages,
    ).toEqual([{ items: [{ id: 1, isRead: true }] }]);
  });
});

describe("patchRow and removeRow", () => {
  it("touches only the identified row", () => {
    const qc = client();
    qc.setQueryData(["mail", "list"], [
      { id: 1, isRead: false },
      { id: 2, isRead: false },
    ]);

    patchRow<Row>(qc, { queryKey: ["mail"] }, (row) => row.id === 2, (row) => ({
      ...row,
      isRead: true,
    }));

    expect(qc.getQueryData(["mail", "list"])).toEqual([
      { id: 1, isRead: false },
      { id: 2, isRead: true },
    ]);
  });

  it("removes the identified row from every page", () => {
    const qc = client();
    qc.setQueryData(["mail", "infinite"], {
      pages: [{ data: [{ id: 1, isRead: false }] }, { data: [{ id: 2, isRead: false }] }],
      pageParams: [undefined, "p2"],
    });

    removeRow<Row>(qc, { queryKey: ["mail"] }, (row) => row.id === 2);

    expect(
      qc.getQueryData<InfiniteData<RowPage<Row>>>(["mail", "infinite"])?.pages,
    ).toEqual([{ data: [{ id: 1, isRead: false }] }, { data: [] }]);
  });
});

describe("cancelAndSnapshot / restoreSnapshot", () => {
  it("restores every snapshotted key after a failed mutation", async () => {
    const qc = client();
    qc.setQueryData(["mail", "list"], [{ id: 1, isRead: false }]);
    qc.setQueryData(["mail", "unreadCount"], 1);

    const snapshot = await cancelAndSnapshot(qc, [{ queryKey: ["mail"] }]);
    patchRows<Row>(qc, { queryKey: ["mail", "list"] }, markRead);
    patchCount(qc, ["mail", "unreadCount"], (n) => n - 1);
    expect(qc.getQueryData(["mail", "list"])).toEqual([{ id: 1, isRead: true }]);
    expect(qc.getQueryData(["mail", "unreadCount"])).toBe(0);

    restoreSnapshot(qc, snapshot);

    expect(qc.getQueryData(["mail", "list"])).toEqual([{ id: 1, isRead: false }]);
    expect(qc.getQueryData(["mail", "unreadCount"])).toBe(1);
  });

  it("snapshots across several filters without losing a key", async () => {
    const qc = client();
    qc.setQueryData(["mail", "list"], [{ id: 1, isRead: false }]);
    qc.setQueryData(["chat", "list"], [{ id: 9, isRead: false }]);

    const snapshot = await cancelAndSnapshot(qc, [
      { queryKey: ["mail"] },
      { queryKey: ["chat"] },
    ]);

    expect(snapshot).toHaveLength(2);
  });

  it("cancels in-flight reads so a stale refetch cannot overwrite the patch", async () => {
    const qc = client();
    const cancelQueries = jest.spyOn(qc, "cancelQueries");

    await cancelAndSnapshot(qc, [{ queryKey: ["mail"] }, { queryKey: ["chat"] }]);

    expect(cancelQueries).toHaveBeenCalledTimes(2);
    expect(cancelQueries).toHaveBeenCalledWith({ queryKey: ["mail"] });
  });
});

describe("concurrent realtime delivery", () => {
  it("merges into optimistic state instead of replacing the collection", () => {
    const qc = client();
    qc.setQueryData(["mail", "list"], [
      { id: 1, isRead: false },
      { id: 2, isRead: false },
    ]);

    patchRow<Row>(qc, { queryKey: ["mail"] }, (row) => row.id === 1, (row) => ({
      ...row,
      isRead: true,
    }));
    patchRow<Row>(qc, { queryKey: ["mail"] }, (row) => row.id === 2, (row) => ({
      ...row,
      isRead: true,
    }));

    expect(qc.getQueryData(["mail", "list"])).toEqual([
      { id: 1, isRead: true },
      { id: 2, isRead: true },
    ]);
  });

  it("keeps the optimistic row when a realtime insert lands mid-flight", () => {
    const qc = client();
    qc.setQueryData(["mail", "list"], [{ id: 1, isRead: false }]);

    patchRow<Row>(qc, { queryKey: ["mail"] }, (row) => row.id === 1, (row) => ({
      ...row,
      isRead: true,
    }));
    patchRows<Row>(qc, { queryKey: ["mail"] }, (rows) => [{ id: 3, isRead: false }, ...rows]);

    expect(qc.getQueryData(["mail", "list"])).toEqual([
      { id: 3, isRead: false },
      { id: 1, isRead: true },
    ]);
  });
});

describe("patchDetail and patchCount", () => {
  it("updates a present entry and leaves an absent one absent", () => {
    const qc = client();
    qc.setQueryData(["mail", "detail", 1], { id: 1, isRead: false });

    patchDetail<Row>(qc, ["mail", "detail", 1], (row) => ({ ...row, isRead: true }));
    patchDetail<Row>(qc, ["mail", "detail", 2], (row) => ({ ...row, isRead: true }));
    patchCount(qc, ["mail", "missingCount"], (n) => n + 1);

    expect(qc.getQueryData(["mail", "detail", 1])).toEqual({ id: 1, isRead: true });
    expect(qc.getQueryData(["mail", "detail", 2])).toBeUndefined();
    expect(qc.getQueryData(["mail", "missingCount"])).toBeUndefined();
  });
});
