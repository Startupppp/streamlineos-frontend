import { renderToStaticMarkup } from "react-dom/server";
import { ShiftsPage } from "./shifts-page";
import { DevicesPage } from "@/features/hr/devices/devices-page";
import { RostersPage } from "@/features/hr/rosters/rosters-page";

jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));
jest.mock("./shift-templates-tab", () => ({ ShiftTemplatesTab: () => <p>BODY</p> }));
jest.mock("./shift-assignments-tab", () => ({ ShiftAssignmentsTab: () => null }));
jest.mock("./shift-swaps-tab", () => ({ ShiftSwapsTab: () => null }));
jest.mock("./shift-form-sheet", () => ({ ShiftFormSheet: () => null }));
jest.mock("@/features/hr/enterprise/comp/devices-table", () => ({ DevicesTable: () => <p>BODY</p> }));
jest.mock("@/features/hr/enterprise/comp/device-sheet", () => ({ DeviceSheet: () => null }));
jest.mock("@/hooks/api/hr/enterprise-comp", () => ({
  useFailedSyncs: () => ({ isLoading: true }),
  useDeviceSyncLogs: () => ({ isLoading: true }),
}));
jest.mock("@/features/hr/rosters/rosters-grid", () => ({ RostersGrid: () => <p>BODY</p> }));
jest.mock("@/features/hr/rosters/create-roster-sheet", () => ({ CreateRosterSheet: () => null }));

describe.each([
  ["shifts", ShiftsPage],
  ["devices", DevicesPage],
  ["rosters", RostersPage],
])("/hr/%s first paint", (_name, Page) => {
  it("paints the body, not an opacity-0 wrapper around it", () => {
    const html = renderToStaticMarkup(<Page />);
    expect(html).toContain("BODY");
    expect(html).not.toMatch(/opacity:\s*0/);
  });
});

describe("HR page bodies never start at opacity 0", () => {
  const read = (path: string) =>
    jest.requireActual<typeof import("fs")>("fs").readFileSync(
      jest.requireActual<typeof import("path")>("path").join(process.cwd(), path),
      "utf8",
    );

  it.each([
    "features/hr/enterprise/comp/equity-page.tsx",
    "features/hr/enterprise/comp/compensation-planning-page.tsx",
    "features/hr/enterprise/comp/devices-table.tsx",
    "features/hr/workforce-cost/workforce-cost-page.tsx",
    "features/hr/workflows/workflows-settings-page.tsx",
    "features/hr/leave-policies/leave-policies-page.tsx",
    "features/hr/policies/policies-page.tsx",
    "features/hr/biometric/biometric-page.tsx",
    "features/hr/geofencing/geofencing-page.tsx",
    "features/hr/overtime/overtime-page.tsx",
  ])("%s", (path) => {
    expect(read(path)).not.toMatch(/initial=\{\{\s*opacity:\s*0/);
  });

  it.each([
    "features/hr/holidays/holidays-page.tsx",
    "features/hr/engagement/engagement-page.tsx",
  ])("%s skips the view-switch fade on first paint", (path) => {
    expect(read(path)).toContain('<AnimatePresence mode="wait" initial={false}>');
  });
});