import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { HolidaysPage } from "./holidays-page";

const CONTRACT = join(process.cwd(), "contracts/openapi.json");
const HOOKS = join(process.cwd(), "hooks/api/hr/holidays.ts");
const PAGE = join(process.cwd(), "features/hr/holidays/holidays-page.tsx");
const ROUTE = join(process.cwd(), "app/(authenticated)/hr/holidays/page.tsx");

interface Operation {
  readonly "x-permission"?: string;
}

function permissionFor(path: string, method: string): string | undefined {
  const spec: unknown = JSON.parse(readFileSync(CONTRACT, "utf8"));
  if (typeof spec !== "object" || spec === null) throw new Error("no spec");
  const paths: unknown = Reflect.get(spec, "paths");
  if (typeof paths !== "object" || paths === null) throw new Error("no paths");
  const entry: unknown = Reflect.get(paths, path);
  if (typeof entry !== "object" || entry === null) throw new Error(`no path ${path}`);
  const operation = Reflect.get(entry, method) as Operation | undefined;
  return operation?.["x-permission"];
}

const holidays = jest.fn();
const canManage = jest.fn();

jest.mock("@/hooks/api/hr/holidays", () => ({
  useHolidays: () => holidays(),
  useCreateHoliday: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateHoliday: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteHoliday: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => canManage(permission),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isError }: { isError: boolean }) => ({
    kind: isError ? "error" : "ready",
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  holidays.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  canManage.mockReturnValue(true);
});

describe("HRMS-B3-001 the holiday calendar's three gates name the keys the backend enforces", () => {
  it("reads the list through the self-service endpoint, and gates the route and the page state on that same key", () => {
    const listKey = permissionFor("/me/attendance/holidays", "get");
    const hooks = readFileSync(HOOKS, "utf8");
    const page = readFileSync(PAGE, "utf8");
    const route = readFileSync(ROUTE, "utf8");

    expect(listKey).toBe("self:attendance");
    expect(hooks).toContain(`useCan("${listKey}")`);
    expect(hooks).toContain('apiClient.get<Holiday[]>("/me/attendance/holidays"');
    expect(page).toContain(`permission: "${listKey}"`);
    expect(route).toContain(`requirePermission("${listKey}")`);
  });

  it("gates the add CTA on the very key the create, update and delete routes enforce, so a visible CTA cannot 403", () => {
    const createKey = permissionFor("/hr/attendance/holidays", "post");
    const patchKey = permissionFor("/hr/attendance/holidays/{holidayId}", "patch");
    const deleteKey = permissionFor("/hr/attendance/holidays/{holidayId}", "delete");
    const hooks = readFileSync(HOOKS, "utf8");
    const page = readFileSync(PAGE, "utf8");

    expect(createKey).toBe("hr:attendance:manage");
    expect(patchKey).toBe(createKey);
    expect(deleteKey).toBe(createKey);
    expect(
      hooks.match(new RegExp(`useAuthorizedMutation\\("${createKey}"`, "g")),
    ).toHaveLength(3);
    expect(page).toContain(`useCan("${createKey}")`);
  });

  it("gates no part of this surface on a leave key, which is the third key the triple split introduced", () => {
    const hooks = readFileSync(HOOKS, "utf8");
    const page = readFileSync(PAGE, "utf8");

    expect(hooks).not.toMatch(/leaves:manage/);
    expect(page).not.toMatch(/leaves:manage/);
  });

  it("shows the add CTA to a principal holding the mutation's own key", () => {
    render(<HolidaysPage />);

    expect(screen.getByRole("button", { name: /add holiday/i })).toBeInTheDocument();
    expect(canManage).toHaveBeenCalledWith("hr:attendance:manage");
  });

  it("fails the CTA closed when that key is absent, rather than offering a control that would 403", () => {
    canManage.mockReturnValue(false);
    render(<HolidaysPage />);

    expect(screen.queryByRole("button", { name: /add holiday/i })).toBeNull();
  });
});
