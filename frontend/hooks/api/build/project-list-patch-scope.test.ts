import { QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { patchProjectListCache } from "@/hooks/api/build/project-cache-patch";

describe("optimistically patching a project list must not reach ticket caches", () => {
  it("leaves a ticket collection untouched when a project with the same numeric id is renamed, because project and ticket ids come from independent sequences and projects.tickets() sits under the projects.all prefix", () => {
    const qc = new QueryClient();
    const collidingId = 2;

    qc.setQueryData(buildWorkQueryKeys.projects.list(undefined), {
      data: [{ id: collidingId, name: "Original project" }],
      total: 1,
    });
    qc.setQueryData(buildWorkQueryKeys.projects.tickets({ projectId: 7 }), {
      data: [{ id: collidingId, title: "Ticket that must not change" }],
      total: 1,
    });

    qc.setQueriesData(
      { queryKey: buildWorkQueryKeys.projects.list() },
      (old: unknown) =>
        patchProjectListCache(
          old as never,
          collidingId,
          { name: "Renamed project" } as never,
          [],
        ),
    );

    const tickets = qc.getQueryData<{ data: { id: number; title: string }[] }>(
      buildWorkQueryKeys.projects.tickets({ projectId: 7 }),
    );
    expect(tickets?.data[0]).toEqual({
      id: collidingId,
      title: "Ticket that must not change",
    });

    const projects = qc.getQueryData<{ data: { name: string }[] }>(
      buildWorkQueryKeys.projects.list(undefined),
    );
    expect(projects?.data[0]?.name).toBe("Renamed project");
  });

  it("corrupts the ticket when the wider projects.all prefix is used, pinning the exact failure this narrowing prevents", () => {
    const qc = new QueryClient();
    const collidingId = 2;

    qc.setQueryData(buildWorkQueryKeys.projects.tickets({ projectId: 7 }), {
      data: [{ id: collidingId, title: "Ticket that must not change" }],
      total: 1,
    });

    qc.setQueriesData(
      { queryKey: buildWorkQueryKeys.projects.all },
      (old: unknown) =>
        patchProjectListCache(
          old as never,
          collidingId,
          { name: "Renamed project" } as never,
          [],
        ),
    );

    const tickets = qc.getQueryData<{
      data: { id: number; title?: string; name?: string }[];
    }>(buildWorkQueryKeys.projects.tickets({ projectId: 7 }));
    expect(tickets?.data[0]?.name).toBe("Renamed project");
  });

  it("still reaches the infinite project list, so narrowing the prefix did not drop optimistic coverage", () => {
    const qc = new QueryClient();
    const filters = { search: "a" };

    qc.setQueryData(buildWorkQueryKeys.projects.listInfinite(filters), {
      pages: [{ data: [{ id: 5, name: "Before" }], total: 1 }],
      pageParams: [null],
    });

    qc.setQueriesData(
      { queryKey: buildWorkQueryKeys.projects.list() },
      (old: unknown) =>
        patchProjectListCache(old as never, 5, { name: "After" } as never, []),
    );

    const infinite = qc.getQueryData<{
      pages: { data: { name: string }[] }[];
    }>(buildWorkQueryKeys.projects.listInfinite(filters));
    expect(infinite?.pages[0]?.data[0]?.name).toBe("After");
  });
});
