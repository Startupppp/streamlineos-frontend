import { filterVisibleProjects } from "./projects-page";
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
  it("keeps only the projects matching an active health filter, because the health chip claims to filter and must actually narrow the list", () => {
    const onTrack = makeProject({ id: 1, name: "Fast", health: "on_track" });
    const offTrack = makeProject({ id: 2, name: "Slow", health: "off_track" });

    const result = filterVisibleProjects([onTrack, offTrack], { health: "off_track" }, true);

    expect(result.map((p) => p.id)).toEqual([2]);
  });
});
