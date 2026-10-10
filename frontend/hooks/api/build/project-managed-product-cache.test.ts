import { QueryClient } from "@tanstack/react-query";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { ProjectListItem, ProjectListResponse, ProjectWithDetails } from "@/types/projects";
import { patchManagedProductLinkCache } from "./project-managed-product-cache";

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
  client.setQueryData(detailKey, { ...project, orgId: "org-1" } as ProjectWithDetails);

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

it("removes a known row from another product when its relationship changes", () => {
  const client = new QueryClient();
  const oldProductKey = buildWorkQueryKeys.projects.list({ managedProductId: 40 });
  client.setQueryData(oldProductKey, page([{ ...project, managedProductId: 40 }]));

  patchManagedProductLinkCache(client, project, 39);

  expect(client.getQueryData<ProjectListResponse>(oldProductKey)?.data).toEqual([]);
});
