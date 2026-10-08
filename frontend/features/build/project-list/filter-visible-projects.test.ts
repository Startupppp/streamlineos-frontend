import { filterVisibleProjects } from "./project-list-shaping";
import type { ProjectListItem } from "@/types/projects/projects";

function makeProject(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: 1,
    name: "Project",
    description: null,
    key: "PRJ",
    status: "ACTIVE",
    priority: null,
    health: "on_track",
    managedProductId: null,
    startDate: null,
    endDate: null,
    manager: null,
    progress: { total: 0, done: 0, percentage: 0 },
    members: [],
    teams: [],
    ...overrides,
  };
}

describe("filterVisibleProjects", () => {
  it("keeps every row the server returned under an active health filter, because narrowing a keyset page again in the client presents one page as the whole filtered set", () => {
    const onTrack = makeProject({ id: 1, name: "Fast", health: "on_track" });
    const offTrack = makeProject({ id: 2, name: "Slow", health: "off_track" });

    const result = filterVisibleProjects([onTrack, offTrack], { health: "off_track" }, true);

    expect(result.map((p) => p.id)).toEqual([1, 2]);
  });

  it("still applies the status filter and the closed-project preference, so dropping the health branch did not disarm the rest", () => {
    const active = makeProject({ id: 1, status: "ACTIVE" });
    const archived = makeProject({ id: 2, status: "ARCHIVED" });

    expect(
      filterVisibleProjects([active, archived], {}, false).map((p) => p.id),
    ).toEqual([1]);
    expect(
      filterVisibleProjects([active, archived], { status: "ARCHIVED" }, true).map((p) => p.id),
    ).toEqual([2]);
    expect(
      filterVisibleProjects([active, archived], { status: "ARCHIVED" }, false).map((p) => p.id),
    ).toEqual([2]);
  });
});
