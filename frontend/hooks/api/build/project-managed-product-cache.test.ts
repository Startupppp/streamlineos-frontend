import { QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProjectListItem, ProjectListResponse, ProjectWithDetails } from "@/types/projects";
import { moveLinkedProjectRowCache, patchManagedProductLinkCache } from "./project-managed-product-cache";
import type { LinkedProjectRow, LinkedProjectsPage } from "./managed-product-projects";

const project = {
  id: 11,
  name: "Existing project",
  key: "EX",
  description: null,
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
} satisfies ProjectListItem;

const page = (data: ProjectListItem[]): ProjectListResponse => ({
  data,
  hasMore: false,
  nextCursor: null,
});

it("adds a newly linked project to the cached product list and patches existing rows without refetching", () => {
  const client = new QueryClient();
  const candidateKey = buildWorkQueryKeys.projects.list({ limit: 50 });
  const productKey = buildWorkQueryKeys.projects.list({ limit: 12, managedProductId: 39 });
  const detailKey = buildWorkQueryKeys.projects.detail(project.id);
  client.setQueryData(candidateKey, page([project]));
  client.setQueryData(productKey, page([]));
  const detail: ProjectWithDetails = {
    ...project,
    orgId: "org-1",
    settings: null,
  };
  client.setQueryData(detailKey, detail);

  patchManagedProductLinkCache(client, project, 39);

  expect(client.getQueryData<ProjectListResponse>(candidateKey)?.data[0]?.managedProductId).toBe(39);
  expect(client.getQueryData<ProjectListResponse>(productKey)?.data.map((row) => row.id)).toEqual([11]);
  expect(client.getQueryData<ProjectWithDetails>(detailKey)?.managedProductId).toBe(39);
});

it("does not insert into another product or into filtered lists that the project does not match", () => {
  const client = new QueryClient();
  const otherProductKey = buildWorkQueryKeys.projects.list({ managedProductId: 40 });
  const filteredKey = buildWorkQueryKeys.projects.list({ managedProductId: 39, search: "different" });
  client.setQueryData(otherProductKey, page([]));
  client.setQueryData(filteredKey, page([]));

  patchManagedProductLinkCache(client, project, 39);

  expect(client.getQueryData<ProjectListResponse>(otherProductKey)?.data).toEqual([]);
  expect(client.getQueryData<ProjectListResponse>(filteredKey)?.data).toEqual([]);
});

it("keeps first-page cursor metadata correct when the new link fills the page", () => {
  const client = new QueryClient();
  const productKey = buildWorkQueryKeys.projects.list({ managedProductId: 39, limit: 2 });
  client.setQueryData(productKey, page([{ ...project, id: 21 }, { ...project, id: 5 }]));

  patchManagedProductLinkCache(client, project, 39);

  expect(client.getQueryData<ProjectListResponse>(productKey)).toMatchObject({
    data: [{ id: 21 }, { id: 11 }],
    hasMore: true,
    nextCursor: 11,
  });
});

it("does not guess into incomplete cursor pages, but patches known rows", () => {
  const client = new QueryClient();
  const productKey = buildWorkQueryKeys.projects.list({ managedProductId: 39, limit: 2 });
  const laterPageKey = buildWorkQueryKeys.projects.list({ managedProductId: 39, limit: 2, afterId: 8 });
  client.setQueryData(productKey, { data: [{ ...project, id: 21 }], hasMore: true, nextCursor: 21 });
  client.setQueryData(laterPageKey, page([{ ...project, id: 5 }]));

  patchManagedProductLinkCache(client, project, 39);

  expect(client.getQueryData<ProjectListResponse>(productKey)?.data.map((row) => row.id)).toEqual([21]);
  expect(client.getQueryData<ProjectListResponse>(laterPageKey)?.data.map((row) => row.id)).toEqual([5]);
});

it("inserts a new high-ID link into a full first page and advances its cursor", () => {
  const client = new QueryClient();
  const productKey = buildWorkQueryKeys.projects.list({ managedProductId: 39, limit: 2 });
  client.setQueryData(productKey, { data: [{ ...project, id: 21 }, { ...project, id: 11 }], hasMore: true, nextCursor: 11 });

  patchManagedProductLinkCache(client, { ...project, id: 30 }, 39);

  expect(client.getQueryData<ProjectListResponse>(productKey)).toMatchObject({
    data: [{ id: 30 }, { id: 21 }],
    hasMore: true,
    nextCursor: 21,
  });
});

const linkedPage = (rows: LinkedProjectRow[], hasMore = false): LinkedProjectsPage => ({
  data: rows,
  pagination: { limit: 20, hasMore, nextCursor: hasMore ? "next" : null },
});

const linkedRow = (id: number): LinkedProjectRow => ({
  id,
  name: `Project ${id}`,
  key: `P${id}`,
  status: "ACTIVE",
  health: null,
  ownerId: null,
  ownerMembershipId: null,
  managerMembershipId: null,
  startDate: null,
  endDate: null,
  nextMilestone: null,
  nextRelease: null,
  linkedGoals: [],
  contribution: { totalTickets: 0, doneTickets: 0, percent: null },
  linkedRoadmapItemCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

it("shows a newly linked project on the product's unfiltered linked-projects page in id order", () => {
  const client = new QueryClient();
  const listKey = buildWorkQueryKeys.projects.managedProducts.linkedProjects(39, { limit: 20, cursor: undefined });
  const filteredKey = buildWorkQueryKeys.projects.managedProducts.linkedProjects(39, { limit: 20, search: "x" });
  client.setQueryData(listKey, linkedPage([linkedRow(20), linkedRow(1)]));
  client.setQueryData(filteredKey, linkedPage([]));

  moveLinkedProjectRowCache(client, { ...project, progress: { total: 4, done: 1, percentage: 25 } }, 39);

  const rows = client.getQueryData<LinkedProjectsPage>(listKey)?.data;
  expect(rows?.map((row) => row.id)).toEqual([20, 11, 1]);
  expect(rows?.[1]).toMatchObject({ name: "Existing project", health: "on_track", contribution: { totalTickets: 4, doneTickets: 1, percent: 25 } });
  expect(client.getQueryData<LinkedProjectsPage>(filteredKey)?.data).toEqual([]);
});

it("removes a moved project from its previous product's linked-projects pages", () => {
  const client = new QueryClient();
  const sourceKey = buildWorkQueryKeys.projects.managedProducts.linkedProjects(40, { limit: 20 });
  const targetKey = buildWorkQueryKeys.projects.managedProducts.linkedProjects(39, { limit: 20 });
  client.setQueryData(sourceKey, linkedPage([linkedRow(11), linkedRow(3)]));
  client.setQueryData(targetKey, linkedPage([]));

  moveLinkedProjectRowCache(client, { ...project, managedProductId: 40 }, 39);

  expect(client.getQueryData<LinkedProjectsPage>(sourceKey)?.data.map((row) => row.id)).toEqual([3]);
  expect(client.getQueryData<LinkedProjectsPage>(targetKey)?.data.map((row) => row.id)).toEqual([11]);
});

it("does not append a low-id link past an unseen cursor", () => {
  const client = new QueryClient();
  const listKey = buildWorkQueryKeys.projects.managedProducts.linkedProjects(39, { limit: 20 });
  client.setQueryData(listKey, linkedPage([linkedRow(20)], true));

  moveLinkedProjectRowCache(client, project, 39);

  expect(client.getQueryData<LinkedProjectsPage>(listKey)?.data.map((row) => row.id)).toEqual([20]);
});

it("removes a known row from another product when its relationship changes", () => {
  const client = new QueryClient();
  const oldProductKey = buildWorkQueryKeys.projects.list({ managedProductId: 40 });
  client.setQueryData(oldProductKey, page([{ ...project, managedProductId: 40 }]));

  patchManagedProductLinkCache(client, project, 39);

  expect(client.getQueryData<ProjectListResponse>(oldProductKey)?.data).toEqual([]);
});
