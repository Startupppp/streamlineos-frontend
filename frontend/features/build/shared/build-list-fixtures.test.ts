import {
  makeRows,
  cursorPage,
  baseQueryResult,
  ACCESS_GRANTED_FIXTURE,
  ACCESS_DENIED_FIXTURE,
  ACCESS_LOADING_FIXTURE,
  GALLERY_STUB_ACCESS,
  GOVERNANCE_RISK_ROWS,
  GOVERNANCE_QA_ROWS,
  GOVERNANCE_INCIDENT_ROWS,
  GOVERNANCE_DECISION_ROWS,
  GOVERNANCE_APPROVAL_ROWS,
  GOVERNANCE_QA_RUN_RESULTS,
  GOVERNANCE_INCIDENT_MEMBERS,
  MANAGED_PRODUCT_GALLERY_ROWS,
} from "./build-list-fixtures";

it("makeRows generates the requested count with sequential ids", () => {
  const rows = makeRows(5);
  expect(rows).toHaveLength(5);
  expect(rows[0]).toEqual({ id: 1, name: "Row 1" });
  expect(rows[4]).toEqual({ id: 5, name: "Row 5" });
});

it("makeRows applies overrides to every row", () => {
  const rows = makeRows(3, { name: "Override" });
  expect(rows.every((r) => r.name === "Override")).toBe(true);
});

it("cursorPage wraps items in the expected envelope", () => {
  const items = makeRows(2);
  const page = cursorPage(items);
  expect(page.data).toBe(items);
  expect(page.pagination.hasMore).toBe(false);
  expect(page.pagination.nextCursor).toBeNull();
});

it("cursorPage forwards hasMore and nextCursor overrides", () => {
  const page = cursorPage(makeRows(1), { hasMore: true, nextCursor: "abc" });
  expect(page.pagination.hasMore).toBe(true);
  expect(page.pagination.nextCursor).toBe("abc");
});

it("baseQueryResult defaults to empty non-error state", () => {
  const result = baseQueryResult();
  expect(result.data).toBeUndefined();
  expect(result.isLoading).toBe(false);
  expect(result.isError).toBe(false);
});

it("ACCESS_GRANTED_FIXTURE carries the build:view scope", () => {
  expect(ACCESS_GRANTED_FIXTURE.data.scopes).toHaveProperty("build:view");
  expect(ACCESS_GRANTED_FIXTURE.isLoading).toBe(false);
});

it("ACCESS_DENIED_FIXTURE has no scopes", () => {
  expect(Object.keys(ACCESS_DENIED_FIXTURE.data.scopes)).toHaveLength(0);
});

it("ACCESS_LOADING_FIXTURE has no data and is loading", () => {
  expect(ACCESS_LOADING_FIXTURE.data).toBeUndefined();
  expect(ACCESS_LOADING_FIXTURE.isLoading).toBe(true);
});

it("GALLERY_STUB_ACCESS grants org-owner so all permission checks pass", () => {
  expect(GALLERY_STUB_ACCESS.isOrgOwner).toBe(true);
});

it("GOVERNANCE_RISK_ROWS has 8 rows with required fields", () => {
  expect(GOVERNANCE_RISK_ROWS).toHaveLength(8);
  expect(GOVERNANCE_RISK_ROWS[0]).toMatchObject({ id: 1, projectId: 1, riskNumber: 100 });
});

it("GOVERNANCE_QA_ROWS has 8 rows with required fields", () => {
  expect(GOVERNANCE_QA_ROWS).toHaveLength(8);
  expect(GOVERNANCE_QA_ROWS[0]).toMatchObject({ id: 1, projectId: 1, caseNumber: 200 });
});

it("GOVERNANCE_INCIDENT_ROWS has 8 rows with required fields", () => {
  expect(GOVERNANCE_INCIDENT_ROWS).toHaveLength(8);
  expect(GOVERNANCE_INCIDENT_ROWS[0]).toMatchObject({ id: 1, projectId: 1, incidentNumber: 300 });
});

it("GOVERNANCE_DECISION_ROWS has 8 rows with required fields", () => {
  expect(GOVERNANCE_DECISION_ROWS).toHaveLength(8);
  expect(GOVERNANCE_DECISION_ROWS[0]).toMatchObject({ id: 1, projectId: 1, decisionNumber: 400 });
});

it("GOVERNANCE_APPROVAL_ROWS has 8 rows with required fields", () => {
  expect(GOVERNANCE_APPROVAL_ROWS).toHaveLength(8);
  expect(GOVERNANCE_APPROVAL_ROWS[0]).toMatchObject({ id: 1, projectId: 1 });
});

it("GOVERNANCE_QA_RUN_RESULTS has 5 rows each with a testCase sub-object", () => {
  expect(GOVERNANCE_QA_RUN_RESULTS).toHaveLength(5);
  expect(GOVERNANCE_QA_RUN_RESULTS[0]).toHaveProperty("testCase.caseNumber");
});

it("GOVERNANCE_INCIDENT_MEMBERS has 2 members with distinct userIds", () => {
  expect(GOVERNANCE_INCIDENT_MEMBERS).toHaveLength(2);
  const userIds = GOVERNANCE_INCIDENT_MEMBERS.map((m) => m.userId);
  expect(new Set(userIds).size).toBe(2);
});

it("MANAGED_PRODUCT_GALLERY_ROWS has 14 rows with id, name and key fields", () => {
  expect(MANAGED_PRODUCT_GALLERY_ROWS).toHaveLength(14);
  expect(MANAGED_PRODUCT_GALLERY_ROWS[0]).toMatchObject({ id: 1, key: "MP-100" });
  expect(MANAGED_PRODUCT_GALLERY_ROWS.every((r) => typeof r.name === "string")).toBe(true);
});
