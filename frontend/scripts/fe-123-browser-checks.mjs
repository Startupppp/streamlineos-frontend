#!/usr/bin/env node
import { existsSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

import { findBrowser } from "./lib/chrome-launcher.mjs";
import {
  sleep,
  waitForDevTools,
  cdpSession,
  launchChrome,
  firstPageTarget,
} from "./lib/cdp.mjs";
import { overflowVerdict } from "./lib/acceptance-matrix.mjs";
import {
  overflowExpression,
  pressKey,
  TAB,
  activeElementExpression,
} from "./lib/acceptance-browser.mjs";
import { makeScreenshotter } from "./lib/screenshot.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(FRONTEND_ROOT, "..");
const PUBLIC_ROOT = join(FRONTEND_ROOT, "public");
const EVIDENCE_DIR = join(REPO_ROOT, "docs", "build-module", "phase-4-browser-evidence");
const CSS_SOURCE = join(
  REPO_ROOT.replace("slos-phase-4-collab", "Streamlineos"),
  "frontend",
  ".next",
  "static",
  "css",
  "e4722c266c890a04.css",
);

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const HEADLESS = !argv.includes("--no-headless");
const WIDTHS = [375, 1440];
const SETTLE_MS = 2500;

const SURFACES = [
  {
    key: "client-visibility",
    label: "ClientVisibilityPage",
    componentPath: "features/build/client-portal/client-visibility-page.tsx",
    exportName: "ClientVisibilityPage",
    props: { projectId: 1 },
    chartSurface: false,
    hooks: ["client-portal", "use-page-state"],
  },
  {
    key: "portal-list",
    label: "PortalListPage",
    componentPath: "features/build/client-portal/portal-list-page.tsx",
    exportName: "PortalListPage",
    props: {},
    chartSurface: false,
    hooks: ["client-portal", "use-page-state"],
  },
  {
    key: "change-requests",
    label: "ChangeRequestsPage",
    componentPath: "features/build/change-requests/change-requests-page.tsx",
    exportName: "ChangeRequestsPage",
    props: { projectId: 1 },
    chartSurface: false,
    hooks: ["change-requests", "use-page-state", "access", "organization"],
  },
  {
    key: "client-access",
    label: "ClientAccessPage",
    componentPath: "features/portal-access/client-access-page.tsx",
    exportName: "ClientAccessPage",
    props: { projectId: 1 },
    chartSurface: false,
    hooks: ["portal-grants", "use-page-state", "access"],
  },
  {
    key: "feedbucket",
    label: "ProjectFeedbucketPage",
    componentPath: "features/build/feedbucket/project-feedbucket-page.tsx",
    exportName: "ProjectFeedbucketPage",
    props: { projectId: 1 },
    chartSurface: false,
    hooks: ["feedbucket", "build-projects", "use-page-state"],
  },
  {
    key: "velocity-chart",
    label: "VelocityChart",
    componentPath: "features/build/reports/velocity-chart.tsx",
    exportName: "VelocityChart",
    props: {
      data: [
        { name: "Sprint 1", Committed: 20, Completed: 18 },
        { name: "Sprint 2", Committed: 25, Completed: 23 },
        { name: "Sprint 3", Committed: 22, Completed: 20 },
        { name: "Sprint 4", Committed: 28, Completed: 25 },
      ],
    },
    chartSurface: true,
    hooks: [],
  },
  {
    key: "burnup-chart",
    label: "BurnupChart",
    componentPath: "features/build/reports/burnup-chart.tsx",
    exportName: "BurnupChart",
    props: {
      data: [
        { date: "Jan 1", Scope: 40, Completed: 5, Ideal: 4 },
        { date: "Jan 8", Scope: 42, Completed: 12, Ideal: 8 },
        { date: "Jan 15", Scope: 42, Completed: 20, Ideal: 12 },
        { date: "Jan 22", Scope: 45, Completed: 28, Ideal: 16 },
      ],
    },
    chartSurface: true,
    hooks: [],
  },
  {
    key: "cfd-chart",
    label: "CfdChart",
    componentPath: "features/build/reports/cfd-chart.tsx",
    exportName: "CfdChart",
    props: {
      data: [
        { date: "Jan 1", Todo: 20, InProgress: 5, Done: 2 },
        { date: "Jan 8", Todo: 18, InProgress: 7, Done: 5 },
        { date: "Jan 15", Todo: 14, InProgress: 9, Done: 8 },
      ],
    },
    chartSurface: true,
    hooks: [],
  },
  {
    key: "cycle-time-chart",
    label: "CycleTimeChart",
    componentPath: "features/build/reports/cycle-time-chart.tsx",
    exportName: "CycleTimeChart",
    props: {
      data: [
        { ticket: "PROJ-1", days: 3.2 },
        { ticket: "PROJ-2", days: 1.5 },
        { ticket: "PROJ-3", days: 5.1 },
        { ticket: "PROJ-4", days: 2.8 },
      ],
    },
    chartSurface: true,
    hooks: [],
  },
  {
    key: "lead-time-chart",
    label: "LeadTimeChart",
    componentPath: "features/build/reports/lead-time-chart.tsx",
    exportName: "LeadTimeChart",
    props: {
      data: [
        { ticket: "PROJ-1", days: 5.2 },
        { ticket: "PROJ-2", days: 3.5 },
        { ticket: "PROJ-3", days: 8.1 },
        { ticket: "PROJ-4", days: 4.8 },
      ],
    },
    chartSurface: true,
    hooks: [],
  },
  {
    key: "critical-path-section",
    label: "CriticalPathSection",
    componentPath: "features/build/reports/critical-path-section.tsx",
    exportName: "CriticalPathSection",
    props: { projectId: 1 },
    chartSurface: false,
    focusExpected: false,
    hooks: ["build-reports"],
  },
];

const MOCK_FILES = {
  "mock-next-link.jsx": `
import React from "react";
export default function Link({ children, href, className, ...rest }) {
  return React.createElement("a", { href, className, ...rest }, children);
}
`,
  "mock-next-navigation.js": `
export const useRouter = () => ({ push: () => {}, back: () => {}, replace: () => {}, refresh: () => {}, forward: () => {}, prefetch: () => {} });
export const useSearchParams = () => new URLSearchParams();
export const usePathname = () => "/";
export const useParams = () => ({});
`,
  "mock-next-dynamic.jsx": `
import React from "react";
export default function dynamic(importFn, opts) {
  const Loading = opts && opts.loading ? opts.loading : () => React.createElement("div", { "data-dynamic-loading": true });
  return Loading;
}
`,
  "mock-framer-motion.jsx": `
import React from "react";
const passthrough = (tag) => React.forwardRef(({ children, variants, transition, animate, initial, exit, whileHover, whileTap, ...rest }, ref) => React.createElement(tag, { ref, ...rest }, children));
export const motion = { div: passthrough("div"), li: passthrough("li"), ul: passthrough("ul"), span: passthrough("span"), p: passthrough("p"), article: passthrough("article"), section: passthrough("section") };
export const useReducedMotion = () => false;
export const AnimatePresence = ({ children }) => children;
`,
  "mock-sonner.js": `
export const toast = Object.assign(() => {}, {
  error: () => {},
  success: () => {},
  info: () => {},
  warning: () => {},
  dismiss: () => {},
  promise: () => {},
});
export const Toaster = () => null;
`,
  "mock-animateicons.jsx": `
import React from "react";
function icon(d) {
  return React.forwardRef(({ size = 16, strokeWidth = 2, ...props }, ref) =>
    React.createElement("svg", { ref, width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, ...props },
      React.createElement("path", { d })
    )
  );
}
export const PlusIcon = icon("M12 5v14M5 12h14");
export const EllipsisIcon = icon("M5 12h.01M12 12h.01M19 12h.01");
export const SettingsIcon = icon("M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z");
export const CheckIcon = icon("M20 6L9 17l-5-5");
export const XIcon = icon("M18 6L6 18M6 6l12 12");
export const SearchIcon = icon("M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0");
export const ChevronDownIcon = icon("M6 9l6 6 6-6");
export const ChevronUpIcon = icon("M18 15l-6-6-6 6");
export const ArrowLeftIcon = icon("M19 12H5m7-7l-7 7 7 7");
export const ArrowRightIcon = icon("M5 12h14m-7-7l7 7-7 7");
export const ExternalLinkIcon = icon("M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6");
export const EditIcon = icon("M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7");
export const TrashIcon = icon("M3 6h18m-2 0l-1 14H6L5 6m5 0V4h4v2");
export const Trash2Icon = TrashIcon;
export const CopyIcon = icon("M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z");
export const DownloadIcon = icon("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4-5l5 5 5-5m-5 5V3");
export const UploadIcon = icon("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m14-7l-5-5-5 5m5-5v12");
export const FilterIcon = icon("M22 3H2l8 9.46V19l4 2v-8.54L22 3z");
export const RefreshCwIcon = icon("M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15");
export const ZapIcon = icon("M13 2L3 14h9l-1 8 10-12h-9l1-8z");
export const BellIcon = icon("M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0");
export const UserIcon = icon("M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z");
export const MailIcon = icon("M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 8 8-8");
export const CalendarIcon = icon("M3 9h18M3 4h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2zm9 5v6m-3-3h6");
export const ClockIcon = icon("M12 2a10 10 0 100 20A10 10 0 0012 2zm0 6v4l3 3");
export const InfoIcon = icon("M12 2a10 10 0 100 20A10 10 0 0012 2zm0 8v4m0-6h.01");
export const AlertCircleIcon = icon("M12 2a10 10 0 100 20A10 10 0 0012 2zm0 8v4m0 4h.01");
export const LogOutIcon = icon("M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9");
export const GlobeIcon = icon("M12 2a10 10 0 100 20A10 10 0 0012 2zm-2 8a2 2 0 014 0c0 1.1-.9 2-2 2s-2-.9-2-2z");
`,
  "mock-use-page-state.js": `
export function usePageState() { return { kind: "ready" }; }
`,
  "mock-access.js": `
export const useAccess = () => ({
  data: { isOrgOwner: false, scopes: Object.fromEntries([
    "build:portal:view","build:clientvisibility:manage","build:changerequest:manage",
    "portal-access:grants:manage","feedbucket:manage"
  ].map(k => [k, "all"])), modules: {} },
  isLoading: false,
});
export const useCan = () => true;
export const usePermissionGate = () => ({ granted: true, loading: false });
`,
  "mock-entitlements.js": `
export const useEntitlements = () => ({ data: undefined, isLoading: false });
`,
  "mock-use-animated-icon.js": `
import { useRef } from "react";
export const useAnimatedIcon = () => ({ iconRef: useRef(null), hoverHandlers: {} });
`,
  "mock-use-query-param-open.js": `
import { useState } from "react";
export const useQueryParamOpen = (key) => {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
};
`,
  "mock-hooks-client-portal.js": `
export const usePortalProjects = () => ({
  data: [
    { id: 1, name: "Alpha Project", key: "ALP", status: "active", color: "#3b82f6", startDate: "2026-01-01", targetEndDate: "2026-12-31" },
    { id: 2, name: "Beta Initiative", key: "BETA", status: "active", color: "#8b5cf6", startDate: "2026-02-01", targetEndDate: "2026-09-30" },
    { id: 3, name: "Gamma Release", key: "GAM", status: "planning", color: null, startDate: null, targetEndDate: "2026-06-30" },
  ],
  isLoading: false, isError: false, error: null, refetch: () => {},
});
export const useClientVisibility = () => ({
  data: {
    tickets: [
      { id: 1, ticketNumber: 101, title: "Fix authentication timeout on mobile devices", type: "bug", clientVisible: true },
      { id: 2, ticketNumber: 102, title: "Add two-factor authentication support", type: "feature", clientVisible: false },
      { id: 3, ticketNumber: 103, title: "Improve dashboard load time", type: "improvement", clientVisible: true },
      { id: 4, ticketNumber: 104, title: "Resolve data export formatting issues", type: "bug", clientVisible: false },
    ],
    milestones: [
      { id: 1, name: "V1.0 Release - Core Features Complete", clientVisible: true },
      { id: 2, name: "Beta Testing Phase", clientVisible: false },
      { id: 3, name: "Public Launch", clientVisible: true },
    ],
  },
  isLoading: false, isError: false, error: null, refetch: () => {},
});
export const useUpdateTicketVisibility = () => ({ mutate: () => {}, isPending: false });
export const useUpdateMilestoneVisibility = () => ({ mutate: () => {}, isPending: false });
`,
  "mock-hooks-change-requests.js": `
export const useChangeRequests = () => ({
  data: [
    { id: 1, crNumber: 1, title: "Add user analytics dashboard", status: "submitted", estimateMinutes: 120, budgetImpactCents: null, timelineImpactDays: null, requestedById: "u1" },
    { id: 2, crNumber: 2, title: "Mobile app redesign scope expansion", status: "approved", estimateMinutes: 480, budgetImpactCents: 500000, timelineImpactDays: 5, requestedById: "u2" },
    { id: 3, crNumber: 3, title: "Integration with Slack notifications", status: "under_review", estimateMinutes: null, budgetImpactCents: null, timelineImpactDays: null, requestedById: "u1" },
  ],
  isLoading: false, isError: false, error: null, refetch: () => {},
});
export const useDeleteChangeRequest = () => ({ mutate: () => {}, isPending: false });
export const useCreateChangeRequest = () => ({ mutate: () => {}, isPending: false });
export const useUpdateChangeRequest = () => ({ mutate: () => {}, isPending: false });
`,
  "mock-hooks-organization.js": `
export const useOrgMembers = () => ({
  data: {
    data: [
      { userId: "u1", name: "Alice Johnson", email: "alice@example.com" },
      { userId: "u2", name: "Bob Smith", email: "bob@example.com" },
    ],
    total: 2,
  },
  isLoading: false,
});
export const useOrgMembersByIds = () => ({ data: [], isLoading: false });
export const useOrgMember = () => ({ data: undefined, isLoading: false });
`,
  "mock-hooks-portal-grants.js": `
export const useProjectClientGrants = () => ({
  data: {
    items: [
      { id: 1, email: "client1@example.com", name: "John Client", status: "active", grantedAt: "2026-01-15T00:00:00Z", expiresAt: null },
      { id: 2, email: "client2@example.com", name: "Jane Stakeholder", status: "active", grantedAt: "2026-02-01T00:00:00Z", expiresAt: "2026-12-31T00:00:00Z" },
      { id: 3, email: "client3@example.com", name: "Old Access", status: "expired", grantedAt: "2025-01-01T00:00:00Z", expiresAt: "2026-01-01T00:00:00Z" },
    ],
    nextCursor: null,
    total: 3,
  },
  isLoading: false, isError: false, error: null, refetch: () => {},
});
export const useRevokeGrant = () => ({ mutate: () => {}, isPending: false });
export const useCreateGrant = () => ({ mutate: () => {}, isPending: false });
export const useUpdateGrant = () => ({ mutate: () => {}, isPending: false });
export const usePortalMemberships = () => ({ data: [], isLoading: false });
`,
  "mock-hooks-feedbucket.js": `
export const useFeedbucketWidgets = () => ({
  data: [
    { id: "w1", name: "Support Portal Widget", key: "SUPPORT", projectId: 1, apiKey: "sk_test_abc123", createdAt: "2026-01-01T00:00:00Z" },
    { id: "w2", name: "Beta Feedback Form", key: "BETA_FB", projectId: 1, apiKey: "sk_test_def456", createdAt: "2026-02-01T00:00:00Z" },
  ],
  isLoading: false, isError: false, error: null, refetch: () => {},
});
export const useCreateFeedbucketWidget = () => ({ mutate: () => {}, isPending: false });
export const useUpdateFeedbucketWidget = () => ({ mutate: () => {}, isPending: false });
export const useDeleteFeedbucketWidget = () => ({ mutate: () => {}, isPending: false });
export const useRotateFeedbucketWidgetKey = () => ({ mutate: () => {}, isPending: false });
export const useFeedbucketSubmissions = () => ({ data: { items: [], nextCursor: null }, isLoading: false, isError: false, error: null, refetch: () => {} });
export const useDeleteFeedbucketSubmission = () => ({ mutate: () => {}, isPending: false });
export const useFeedbucketWidgetByKey = () => ({ data: undefined, isLoading: false });
`,
  "mock-hooks-build-projects.js": `
export const useProject = () => ({
  data: { id: 1, name: "Alpha Project", key: "ALP", status: "active", color: "#3b82f6" },
  isLoading: false,
});
export const useProjectMembers = () => ({ data: [], isLoading: false });
export const useProjects = () => ({ data: [], isLoading: false });
`,
  "mock-hooks-build-reports.js": `
export const useCriticalPath = () => ({
  data: {
    criticalPath: [
      { ticketId: 1, title: "Design system tokens", estimate: 3, earliestStart: 0, earliestFinish: 3 },
      { ticketId: 2, title: "API schema migration", estimate: 5, earliestStart: 3, earliestFinish: 8 },
      { ticketId: 3, title: "Frontend integration", estimate: 4, earliestStart: 8, earliestFinish: 12 },
      { ticketId: 4, title: "QA and deployment", estimate: 2, earliestStart: 12, earliestFinish: 14 },
    ],
    totalDuration: 14,
    nodeCount: 10,
    edgeCount: 7,
    hasCycle: false,
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: () => {},
});
export const useVelocityReport = () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: () => {} });
export const useBurnupReport = () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: () => {} });
export const useCfdReport = () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: () => {} });
export const useCycleTimeReport = () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: () => {} });
export const useLeadTimeReport = () => ({ data: undefined, isLoading: false, isError: false, error: null, refetch: () => {} });
export const useCaptureSnapshot = () => ({ mutate: () => {}, isPending: false });
`,
};

function selfTest() {
  let passed = 0;
  const failures = [];
  const assert = (label, cond) => { if (cond) passed++; else failures.push(label); };

  assert("findBrowser returns a string on this machine", typeof findBrowser("") === "string");
  assert("overflowVerdict detects overflow by > 1px", overflowVerdict({ scrollWidth: 400, innerWidth: 375 }).overflows === true);
  assert("overflowVerdict tolerates 1px rounding", overflowVerdict({ scrollWidth: 376, innerWidth: 375 }).overflows === false);
  assert("overflowVerdict marks unmeasured as not-measured", overflowVerdict({}).measured === false);
  assert("EVIDENCE_DIR path contains phase-4", EVIDENCE_DIR.includes("phase-4"));
  assert("CSS_SOURCE path exists", existsSync(CSS_SOURCE));
  assert("public illustration fixture exists", existsSync(join(PUBLIC_ROOT, "illustrations", "empty-clients.svg")));

  if (failures.length) {
    for (const f of failures) console.error(`  [FAIL] ${f}`);
    console.error(`\nFE-123 self-test FAILED: ${failures.length} failures`);
    process.exit(1);
  }
  console.log(`fe-123-browser-checks self-tests: ${passed} passed`);
  process.exit(0);
}

if (SELF_TEST) selfTest();

function buildEntrySource(surface) {
  const relPath = surface.componentPath.replace(/\.tsx?$/, "");
  const propsJson = JSON.stringify(surface.props);
  return `
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ${surface.exportName} } from "@/${relPath}";

class FE123ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error && error.message ? error.message : String(error) };
  }
  render() {
    if (this.state.error) {
      return React.createElement("div", {
        id: "fe123-error-boundary",
        "data-error": this.state.error,
        style: { padding: "16px", color: "crimson", fontFamily: "monospace", whiteSpace: "pre-wrap", fontSize: "13px" }
      }, "Mount error: " + this.state.error);
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
const domTarget = document.getElementById("root");
const root = createRoot(domTarget);
root.render(
  React.createElement(QueryClientProvider, { client: queryClient },
    React.createElement(FE123ErrorBoundary, null,
      React.createElement(${surface.exportName}, ${propsJson})
    )
  )
);
`;
}

function buildAliases(surface, tmpDir) {
  const a = {};
  const m = (id, file) => { a[id] = join(tmpDir, file); };

  m("next/link", "mock-next-link.jsx");
  m("next/navigation", "mock-next-navigation.js");
  m("next/dynamic", "mock-next-dynamic.jsx");
  m("sonner", "mock-sonner.js");
  m("framer-motion", "mock-framer-motion.jsx");
  m("@animateicons/react/lucide", "mock-animateicons.jsx");
  m("@/hooks/api/use-page-state", "mock-use-page-state.js");
  m("@/hooks/api/access", "mock-access.js");
  m("@/hooks/api/entitlements", "mock-entitlements.js");
  m("@/hooks/common/use-animated-icon", "mock-use-animated-icon.js");
  m("@/hooks/common/use-query-param-open", "mock-use-query-param-open.js");

  if (surface.hooks.includes("client-portal")) m("@/hooks/api/build/client-portal", "mock-hooks-client-portal.js");
  if (surface.hooks.includes("change-requests")) m("@/hooks/api/build/change-requests", "mock-hooks-change-requests.js");
  if (surface.hooks.includes("organization")) m("@/hooks/api/organization", "mock-hooks-organization.js");
  if (surface.hooks.includes("portal-grants")) m("@/hooks/api/portal-access/grants", "mock-hooks-portal-grants.js");
  if (surface.hooks.includes("feedbucket")) m("@/hooks/api/feedbucket", "mock-hooks-feedbucket.js");
  if (surface.hooks.includes("build-projects")) m("@/hooks/api/build/projects", "mock-hooks-build-projects.js");
  if (surface.hooks.includes("build-reports")) m("@/hooks/api/build/reports", "mock-hooks-build-reports.js");

  return a;
}

async function buildBundle(surface, tmpDir, outDir) {
  const { build } = await import("esbuild");
  const entryPath = join(tmpDir, `entry-${surface.key}.jsx`);
  const outPath = join(outDir, `${surface.key}.js`);

  writeFileSync(entryPath, buildEntrySource(surface));

  await build({
    entryPoints: [entryPath],
    bundle: true,
    platform: "browser",
    format: "iife",
    outfile: outPath,
    loader: {
      ".tsx": "tsx",
      ".ts": "ts",
      ".jsx": "jsx",
      ".js": "js",
      ".mjs": "js",
      ".svg": "text",
      ".png": "dataurl",
      ".jpg": "dataurl",
      ".gif": "dataurl",
      ".webp": "dataurl",
    },
    alias: buildAliases(surface, tmpDir),
    nodePaths: [join(FRONTEND_ROOT, "node_modules")],
    tsconfig: join(FRONTEND_ROOT, "tsconfig.json"),
    absWorkingDir: FRONTEND_ROOT,
    define: {
      "process.env.NODE_ENV": JSON.stringify("development"),
      "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("http://localhost:1500"),
      "process.env.NEXT_PUBLIC_PORTAL_API_URL": JSON.stringify("http://localhost:1500"),
    },
    banner: {
      js: 'if(typeof process==="undefined")var process={env:{NODE_ENV:"development",NEXT_PUBLIC_API_URL:"http://localhost:1500",NEXT_PUBLIC_PORTAL_API_URL:"http://localhost:1500"},browser:true};',
    },
    logLevel: "error",
    jsx: "automatic",
  });

  return outPath;
}

function buildHtml(surfaceKey, surfaceLabel) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${surfaceLabel} — FE-123</title>
<link rel="stylesheet" href="/styles.css">
<style>
body { margin: 0; padding: 0; background: var(--background, #f8fafc); color: var(--foreground, #0f172a); font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
#root { min-height: 100vh; }
</style>
<script>
window.__fe123_js_errors = [];
window.onerror = function(msg, src, line, col, err) {
  window.__fe123_js_errors.push(String(err ? err.message || err : msg));
};
window.onunhandledrejection = function(e) {
  window.__fe123_js_errors.push("UnhandledRejection: " + String(e.reason && e.reason.message ? e.reason.message : e.reason));
};
</script>
</head>
<body>
<div id="root"></div>
<script src="/${surfaceKey}.js"></script>
</body>
</html>`;
}

function startServer(bundleDir, cssSource, port) {
  const cssContent = readFileSync(cssSource);
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = req.url.split("?")[0];
      if (url === "/styles.css") {
        res.writeHead(200, { "Content-Type": "text/css", "Cache-Control": "no-store" });
        res.end(cssContent);
        return;
      }
      if (url.startsWith("/illustrations/") && url.endsWith(".svg")) {
        const name = url.slice("/illustrations/".length);
        const file = join(PUBLIC_ROOT, "illustrations", name);
        if (!name.includes("/") && !name.includes("\\") && existsSync(file)) {
          res.writeHead(200, { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" });
          res.end(readFileSync(file));
          return;
        }
      }
      if (url.endsWith(".js")) {
        const name = url.slice(1);
        const file = join(bundleDir, name);
        if (existsSync(file)) {
          res.writeHead(200, { "Content-Type": "application/javascript", "Cache-Control": "no-store" });
          res.end(readFileSync(file));
          return;
        }
      }
      if (url.endsWith(".html")) {
        const name = url.slice(1);
        const file = join(bundleDir, name);
        if (existsSync(file)) {
          res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" });
          res.end(readFileSync(file));
          return;
        }
      }
      res.writeHead(404);
      res.end("not found");
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function walkFocusOrder(cdp, maxTabs = 40) {
  const focusLog = [];
  const evaluate = async (expr) => {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
    return r.result?.value;
  };

  await evaluate("document.body.focus()");
  await sleep(150);

  for (let i = 0; i < maxTabs; i++) {
    await pressKey(cdp, TAB);
    await sleep(80);
    const el = await evaluate(activeElementExpression());
    if (!el) break;
    const key = `${el.tag}[${el.role || ""}]${el.name ? ":" + el.name.slice(0, 40) : ""}`;
    if (focusLog.length > 0 && focusLog[focusLog.length - 1] === key) break;
    focusLog.push(key);
    if (el.tag === "body") break;
  }

  return focusLog;
}

async function checkSvgPaint(cdp) {
  const evaluate = async (expr) => {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
    return r.result?.value;
  };

  const result = await evaluate(`(() => {
    const svgs = Array.from(document.querySelectorAll("svg"));
    const charts = [];
    for (const svg of svgs) {
      try {
        const bbox = svg.getBBox();
        const rect = svg.getBoundingClientRect();
        const paths = Array.from(svg.querySelectorAll("path, rect, circle, line, polyline, polygon")).length;
        charts.push({
          width: Math.round(bbox.width),
          height: Math.round(bbox.height),
          clientWidth: Math.round(rect.width),
          clientHeight: Math.round(rect.height),
          pathCount: paths,
          painted: bbox.width > 0 && bbox.height > 0,
        });
      } catch (e) {
        charts.push({ error: String(e.message) });
      }
    }
    return charts;
  })()`);

  return result || [];
}

async function analyzeFocusOrder(cdp) {
  const evaluate = async (expr) => {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true });
    return r.result?.value;
  };

  return await evaluate(`(() => {
    const FOCUSABLE_SEL = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([tabindex="-1"])',
      '[role="checkbox"]:not([tabindex="-1"])',
      '[role="switch"]:not([tabindex="-1"])',
      '[role="radio"]:not([tabindex="-1"])',
      '[role="tab"]:not([tabindex="-1"])',
    ];

    function elDesc(el) {
      const radixAttrs = Array.from(el.attributes)
        .filter(function(a) { return a.name.startsWith("data-radix"); })
        .map(function(a) { return a.name; });
      const ariaHidden = el.getAttribute("aria-hidden");
      const role = el.getAttribute("role");
      const ti = el.getAttribute("tabindex") ?? "";
      const parent = el.parentElement;
      const parts = [
        el.tagName.toLowerCase(),
        role ? ("role=" + role) : null,
        ariaHidden ? ("aria-hidden=" + ariaHidden) : null,
        ti !== "" ? ("tabindex=" + ti) : null,
        radixAttrs.length ? radixAttrs.join(",") : null,
        el.id ? ("#" + el.id) : null,
        el.className ? ("." + String(el.className).replace(/\\s+/g, ".").slice(0, 50)) : null,
        parent ? ("(parent:" + parent.tagName.toLowerCase() + (parent.getAttribute("role") ? "[" + parent.getAttribute("role") + "]" : "") + ")") : null,
      ];
      return parts.filter(Boolean).join(" ");
    }

    function zeroSizeExemptReason(el) {
      if (el.getAttribute("aria-hidden") === "true") return ["RADIX-FOCUS-GUARD", "aria-hidden=true"];
      const guardAttr = Array.from(el.attributes).map(function(a) { return a.name; }).find(function(n) { return n.indexOf("focus-guard") !== -1; });
      if (guardAttr) return ["RADIX-FOCUS-GUARD", guardAttr + " present"];
      var cs = window.getComputedStyle(el);
      if (cs.display === "none") return ["DISPLAY-NONE-NOT-FOCUSABLE", "computed display:none — element cannot receive keyboard focus in browsers regardless of tabindex value"];
      if (cs.visibility === "hidden") return ["VISIBILITY-HIDDEN-NOT-FOCUSABLE", "computed visibility:hidden — element is not keyboard-reachable"];
      return null;
    }

    function isTablistRovingTabindex(el) {
      if (el.getAttribute("role") === "tab") return true;
      if (el.closest('[role="tablist"]')) return true;
      return false;
    }

    const seenFocusable = new Set();
    const domFocusable = [];
    for (var fi = 0; fi < FOCUSABLE_SEL.length; fi++) {
      var matches = document.querySelectorAll(FOCUSABLE_SEL[fi]);
      for (var mi = 0; mi < matches.length; mi++) {
        var el = matches[mi];
        if (seenFocusable.has(el)) continue;
        seenFocusable.add(el);
        var rect = el.getBoundingClientRect();
        var ti = parseInt(el.getAttribute("tabindex") ?? "0", 10);
        domFocusable.push({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute("role") ?? "",
          tabIndex: isNaN(ti) ? 0 : ti,
          label: (el.textContent || el.getAttribute("aria-label") || "").slice(0, 40).trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }

    const positiveTabIndex = domFocusable.filter(function(e) { return e.tabIndex > 0; }).map(function(e) { return e.tag + (e.label ? ":" + e.label : ""); });

    const seenZero = new Set();
    const zeroSizeFocusable = [];
    const zeroSizeExempted = [];
    for (var fi2 = 0; fi2 < FOCUSABLE_SEL.length; fi2++) {
      var matches2 = document.querySelectorAll(FOCUSABLE_SEL[fi2]);
      for (var mi2 = 0; mi2 < matches2.length; mi2++) {
        var el2 = matches2[mi2];
        if (seenZero.has(el2)) continue;
        var rect2 = el2.getBoundingClientRect();
        if (rect2.width > 0 && rect2.height > 0) continue;
        seenZero.add(el2);
        var desc = elDesc(el2);
        var exemptInfo = zeroSizeExemptReason(el2);
        if (exemptInfo) {
          zeroSizeExempted.push({ descriptor: desc, reason: exemptInfo[0] + ": " + exemptInfo[1] });
        } else {
          zeroSizeFocusable.push(desc);
        }
      }
    }

    const mouseOnly = [];
    const mouseOnlyExempted = [];
    var moEls = document.querySelectorAll('a[href], button:not([disabled]), [role="button"], [role="tab"]');
    for (var mi3 = 0; mi3 < moEls.length; mi3++) {
      var el3 = moEls[mi3];
      if (el3.getAttribute("tabindex") !== "-1") continue;
      var rect3 = el3.getBoundingClientRect();
      if (rect3.width === 0 || rect3.height === 0) continue;
      var label3 = (el3.textContent || el3.getAttribute("aria-label") || "").slice(0, 40).trim();
      var desc3 = el3.tagName.toLowerCase() + (el3.getAttribute("role") ? "[role=" + el3.getAttribute("role") + "]" : "") + (label3 ? ":" + label3 : "");
      if (isTablistRovingTabindex(el3)) {
        mouseOnlyExempted.push({ descriptor: desc3, reason: "TABLIST-ROVING-TABINDEX: role=tab or descendant of role=tablist uses roving tabindex per WAI-ARIA Tabs pattern; inactive tabs are intentionally excluded from Tab sequence and reached via Arrow keys" });
      } else {
        mouseOnly.push(desc3);
      }
    }

    return {
      domFocusableCount: domFocusable.length,
      positiveTabIndex,
      zeroSizeFocusable,
      zeroSizeExempted,
      mouseOnly,
      mouseOnlyExempted,
    };
  })()`);
}

async function main() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  const tmpDir = join(tmpdir(), `fe-123-${randomBytes(4).toString("hex")}`);
  mkdirSync(tmpDir, { recursive: true });
  const bundleDir = join(tmpDir, "bundles");
  mkdirSync(bundleDir, { recursive: true });

  const browserPath = findBrowser("");
  if (!browserPath) {
    writeFileSync(
      join(EVIDENCE_DIR, "FE-123-report.md"),
      [
        "# FE-123 Browser Evidence",
        "",
        "**STATUS: BLOCKED**",
        "",
        "No Chrome or Edge browser found on this machine.",
        "Install Chrome to unblock this workstream.",
        "",
        `Searched: ${process.env.ProgramFiles || "C:\\Program Files"}, ${process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)"}, ${process.env.LOCALAPPDATA || ""}\\Google\\Chrome`,
      ].join("\n"),
    );
    console.error("BLOCKED: no browser found");
    process.exit(2);
  }

  if (!existsSync(CSS_SOURCE)) {
    writeFileSync(
      join(EVIDENCE_DIR, "FE-123-report.md"),
      [
        "# FE-123 Browser Evidence",
        "",
        "**STATUS: BLOCKED**",
        "",
        `Compiled CSS not found at ${CSS_SOURCE}`,
        "Unblock: run a Next.js build in the main checkout to produce .next/static/css/e4722c266c890a04.css",
      ].join("\n"),
    );
    console.error(`BLOCKED: CSS not found at ${CSS_SOURCE}`);
    process.exit(2);
  }

  console.log(`browser: ${browserPath}`);
  console.log(`css: ${CSS_SOURCE}`);
  console.log(`evidence: ${EVIDENCE_DIR}`);

  for (const [name, content] of Object.entries(MOCK_FILES)) {
    writeFileSync(join(tmpDir, name), content.trim());
  }

  const bundleResults = {};
  for (const surface of SURFACES) {
    if (surface.notCovered) {
      bundleResults[surface.key] = { ok: false, notCovered: true, error: surface.notCoveredReason };
      console.log(`  ${surface.key}: NOT-COVERED — ${surface.notCoveredReason}`);
      continue;
    }
    try {
      console.log(`bundling ${surface.key}…`);
      await buildBundle(surface, tmpDir, bundleDir);
      writeFileSync(join(bundleDir, `${surface.key}.html`), buildHtml(surface.key, surface.label));
      bundleResults[surface.key] = { ok: true };
      console.log(`  ${surface.key}: OK`);
    } catch (err) {
      bundleResults[surface.key] = { ok: false, error: String(err.message || err) };
      console.error(`  ${surface.key}: FAILED — ${err.message}`);
    }
  }

  const port = 19600 + Math.floor(Math.random() * 300);
  const server = await startServer(bundleDir, CSS_SOURCE, port);
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`server: ${baseUrl}`);

  const { proc, debugPort } = launchChrome(browserPath, { headless: HEADLESS });
  const measurements = [];
  const screenshotDir = join(EVIDENCE_DIR, "screenshots");
  mkdirSync(screenshotDir, { recursive: true });
  const screenshot = makeScreenshotter(screenshotDir);

  try {
    await waitForDevTools(debugPort, 20000);
    const cdp = await cdpSession(await firstPageTarget(debugPort));
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const evaluate = async (expr) => {
      const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: false });
      return r.result?.value;
    };

    for (const surface of SURFACES) {
      const bundle = bundleResults[surface.key];
      if (!bundle.ok) {
        const reason = bundle.notCovered
          ? `not covered: ${bundle.error}`
          : `bundle failed: ${bundle.error}`;
        for (const width of WIDTHS) {
          measurements.push({
            surface: surface.key,
            label: surface.label,
            notCovered: !!bundle.notCovered,
            width,
            overflowCheck: { verdict: "NOT-RUN", reason },
            focusCheck: { verdict: "NOT-RUN", reason },
            svgCheck: surface.chartSurface ? { verdict: "NOT-RUN", reason } : null,
            screenshots: [],
          });
        }
        continue;
      }

      for (const width of WIDTHS) {
        console.log(`\n=== ${surface.key} @ ${width}px ===`);

        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width,
          height: width < 768 ? 812 : 900,
          deviceScaleFactor: 1,
          mobile: width < 768,
        });

        await cdp.send("Page.navigate", { url: `${baseUrl}/${surface.key}.html` });
        await sleep(SETTLE_MS);

        const landed = await evaluate("location.href");
        console.log(`  landed: ${landed}`);

        const rootContent = await evaluate(`(() => {
          const root = document.getElementById("root");
          if (!root) return { hasContent: false, reason: "no #root element" };
          const errEl = document.getElementById("fe123-error-boundary");
          const mountError = errEl ? errEl.getAttribute("data-error") : null;
          const jsErrors = (window.__fe123_js_errors || []).join(" | ");
          const text = root.innerText ? root.innerText.trim() : "";
          const children = root.children.length;
          const svgCount = root.querySelectorAll("svg").length;
          return { hasContent: children > 0, childCount: children, textLen: text.length, svgCount, textSample: text.slice(0, 80), mountError, jsErrors };
        })()`);
        const mountError = rootContent?.mountError || (rootContent?.jsErrors ? rootContent.jsErrors : null) || null;
        const pageRendered = rootContent?.hasContent !== false && !rootContent?.mountError;
        if (rootContent?.mountError) {
          console.log(`  MOUNT ERROR (boundary): ${rootContent.mountError}`);
        }
        if (rootContent?.jsErrors) {
          console.log(`  JS ERRORS: ${rootContent.jsErrors.slice(0, 200)}`);
        }
        console.log(`  render: children=${rootContent?.childCount} textLen=${rootContent?.textLen} sample="${rootContent?.textSample?.slice(0,40)}"`);

        const overflowData = await evaluate(overflowExpression());
        console.log(`  overflow: scrollWidth=${overflowData?.scrollWidth} innerWidth=${overflowData?.innerWidth} widest=${overflowData?.widest}`);
        const ov = overflowVerdict(overflowData || {});
        let overflowVerdict2;
        if (!pageRendered) {
          overflowVerdict2 = "NOT-RUN";
        } else if (!overflowData?.scrollWidth) {
          overflowVerdict2 = "NOT-RUN";
        } else {
          overflowVerdict2 = ov.overflows ? "FAIL" : "PASS";
        }
        const overflowCheck = {
          verdict: overflowVerdict2,
          scrollWidth: overflowData?.scrollWidth,
          innerWidth: overflowData?.innerWidth,
          by: ov.by,
          widest: overflowData?.widest,
          measured: ov.measured,
          pageRendered,
        };
        if (!pageRendered) overflowCheck.reason = mountError ? `mount error: ${mountError.slice(0, 120)}` : "page rendered blank — component did not mount";
        if (mountError) overflowCheck.mountError = mountError;
        console.log(`  overflow verdict: ${overflowCheck.verdict} (by ${ov.by}px, widest: ${overflowData?.widest})`);

        const focusSequence = await walkFocusOrder(cdp, 35);
        const uniqueFocused = new Set(focusSequence).size;
        const onlyBody = focusSequence.length <= 1 && focusSequence.every((k) => k.startsWith("body["));
        const orderAnalysis = pageRendered ? await analyzeFocusOrder(cdp) : null;

        let focusVerdict;
        const focusIssues = [];

        if (!pageRendered) {
          focusVerdict = "NOT-RUN";
        } else if (
          surface.focusExpected === false &&
          (focusSequence.length === 0 || onlyBody) &&
          orderAnalysis?.domFocusableCount === 0 &&
          orderAnalysis?.mouseOnly?.length === 0
        ) {
          focusVerdict = "PASS";
        } else if (focusSequence.length === 0 || onlyBody) {
          focusVerdict = "NOT-RUN";
        } else {
          focusVerdict = "PASS";
          if (orderAnalysis?.positiveTabIndex?.length > 0) {
            focusIssues.push(`positive tabIndex on: ${orderAnalysis.positiveTabIndex.slice(0, 3).join(", ")}`);
            focusVerdict = "FAIL";
          }
          if (orderAnalysis?.zeroSizeFocusable?.length > 0) {
            focusIssues.push(`zero-size keyboard-focusable: ${orderAnalysis.zeroSizeFocusable.slice(0, 3).join(", ")}`);
            focusVerdict = "FAIL";
          }
          if (orderAnalysis?.mouseOnly?.length > 0) {
            focusIssues.push(`mouse-reachable not keyboard-reachable: ${orderAnalysis.mouseOnly.slice(0, 3).join(", ")}`);
            focusVerdict = "FAIL";
          }
        }

        const focusCheck = {
          verdict: focusVerdict,
          tabCount: focusSequence.length,
          uniqueElements: uniqueFocused,
          sequence: focusSequence,
          domFocusableCount: orderAnalysis?.domFocusableCount ?? null,
          orderIssues: focusIssues,
          zeroSizeExempted: orderAnalysis?.zeroSizeExempted ?? [],
          mouseOnlyExempted: orderAnalysis?.mouseOnlyExempted ?? [],
          orderAnalysis,
        };
        if (!pageRendered) focusCheck.reason = mountError ? `mount error: ${mountError.slice(0, 120)}` : "page rendered blank — component did not mount";
        else if (focusVerdict === "PASS" && surface.focusExpected === false && orderAnalysis?.domFocusableCount === 0) focusCheck.reason = "non-interactive surface verified with no keyboard or mouse-only controls";
        else if (focusSequence.length === 0) focusCheck.reason = "no Tab stops recorded";
        else if (onlyBody) focusCheck.reason = "Tab returned immediately to body — no interactive elements in DOM";
        else if (focusIssues.length > 0) focusCheck.reason = focusIssues.join("; ");
        else focusCheck.reason = `tab sequence verified: ${focusSequence.length} stops, ${orderAnalysis?.domFocusableCount ?? "?"} DOM-focusable; no positive-tabIndex, no zero-size, no mouse-only interactive elements`;
        console.log(`  focus: ${focusSequence.length} stops / ${orderAnalysis?.domFocusableCount ?? "?"} DOM-focusable, issues=${focusIssues.length} (${focusVerdict})`);

        let svgCheck = null;
        if (surface.chartSurface) {
          await sleep(800);
          const svgs = await checkSvgPaint(cdp);
          const painted = svgs.filter((s) => s.painted);
          const unpainted = svgs.filter((s) => !s.error && !s.painted);
          svgCheck = {
            verdict: svgs.length === 0 ? "NOT-RUN" :
                     painted.length > 0 ? "PASS" :
                     unpainted.length > 0 ? "FAIL" : "NOT-RUN",
            svgCount: svgs.length,
            paintedCount: painted.length,
            unpaintedCount: unpainted.length,
            svgs,
          };
          if (svgCheck.verdict === "NOT-RUN" && svgs.length === 0) {
            svgCheck.reason = "no SVG elements found — chart may not have rendered";
          }
          if (svgCheck.verdict === "FAIL") {
            svgCheck.reason = `${unpainted.length} SVG(s) with zero bbox — chart rendered empty container`;
          }
          console.log(`  svg: ${svgs.length} svgs, ${painted.length} painted, verdict: ${svgCheck.verdict}`);
        }

        await evaluate(`(() => {
          window.scroll(0, 0);
          const all = document.querySelectorAll("*");
          for (let i = 0; i < all.length; i++) {
            if (all[i].scrollLeft !== 0) all[i].scrollLeft = 0;
            if (all[i].scrollTop !== 0) all[i].scrollTop = 0;
          }
        })()`);
        await sleep(150);
        const shotState = `${surface.key}-${width}px`;
        const shotPath = await screenshot(cdp, shotState, width, "");
        console.log(`  screenshot: ${shotPath}`);

        measurements.push({
          surface: surface.key,
          label: surface.label,
          width,
          overflowCheck,
          focusCheck,
          svgCheck,
          screenshots: [shotPath],
        });
      }
    }

  } finally {
    try { proc.kill(); } catch { void 0; }
    try { server.close(); } catch { void 0; }
  }

  const cssHash = createHash("sha256").update(readFileSync(CSS_SOURCE)).digest("hex");

  const jsonOut = join(EVIDENCE_DIR, "FE-123-measurements.json");
  writeFileSync(jsonOut, JSON.stringify({ capturedAt: new Date().toISOString(), widths: WIDTHS, browserPath, cssHash, measurements }, null, 2));

  const reportLines = buildReport(measurements, bundleResults, cssHash);
  const reportOut = join(EVIDENCE_DIR, "FE-123-report.md");
  writeFileSync(reportOut, reportLines.join("\n"));
  console.log(`\nreport: ${reportOut}`);
  console.log(`json: ${jsonOut}`);

  rmSync(tmpDir, { recursive: true, force: true });

  const fails = measurements.filter((m) => m.overflowCheck.verdict === "FAIL" || m.focusCheck.verdict === "FAIL" || (m.svgCheck && m.svgCheck.verdict === "FAIL"));
  const notRun = measurements.filter((m) => m.overflowCheck.verdict === "NOT-RUN" || m.focusCheck.verdict === "NOT-RUN");
  console.log(`\nFAIL: ${fails.length}, NOT-RUN: ${notRun.length}, total cells: ${measurements.length}`);
  process.exit(fails.length > 0 || notRun.length > 0 ? 1 : 0);
}

function buildReport(measurements, bundleResults, cssHash) {
  const lines = [
    "# FE-123 Browser Evidence Report",
    "",
    `Captured: ${new Date().toISOString()}`,
    `Widths: ${WIDTHS.join(", ")}px`,
    `Approach: (a) static-render via esbuild bundle + compiled Tailwind CSS`,
    `CSS source: main checkout .next/static/css/e4722c266c890a04.css (Tailwind v4, 393 KB)`,
    `CSS SHA-256: ${cssHash || "unknown"} (stated limitation: design-token CSS variables may differ from production build)`,
    "",
    "## Approach",
    "",
    "Approach (a) — static-render harness — was used.",
    "",
    "Each surface component was bundled to browser JavaScript using esbuild with mock stubs",
    "for all data-fetching hooks, `next/link`, `next/navigation`, `next/dynamic`, `framer-motion`,",
    "and `sonner`. UI components (Radix, Tailwind) are real and unblocked.",
    "The real compiled Tailwind CSS from the main checkout was served alongside the bundle.",
    "",
    "Per-surface step order (each width, in sequence):",
    "  1. Navigate and settle (2500ms)",
    "  2. Measure overflow (scrollWidth vs innerWidth via overflowExpression)",
    "  3. Walk focus order (Tab keypresses via CDP, up to 35 stops)",
    "  4. Analyse focus order (DOM queries for positive-tabIndex, zero-size, mouse-only)",
    "  5. Check SVG paint (getBBox on chart surfaces only)",
    "  6. Reset scroll to origin (window.scroll(0,0) + all scrolled containers)",
    "  7. Capture screenshot",
    "",
    "Screenshots therefore show the initial rendered state, not the post-focus-walk scroll position.",
    "Overflow is measured at step 2 before Tab keypresses move any scroll container.",
    "",
    "Focus order analysis checks three conditions via CDP DOM queries: (1) positive tabIndex",
    "attributes (break natural document order), (2) zero-size keyboard-focusable elements",
    "(invisible but reachable by keyboard), and (3) mouse-reachable-but-keyboard-excluded",
    "elements (visible interactive elements with tabindex=-1).",
    "",
    "Three named exemption rules are applied before verdict; all are documented in the report:",
    "TABLIST-ROVING-TABINDEX, RADIX-FOCUS-GUARD, and DISPLAY-NONE-NOT-FOCUSABLE (see Named Exemptions).",
    "",
    "Approach (b) (Next.js dev server) was rejected: no backend is running, authenticated",
    "routes redirect to sign-in, and starting Next.js without auth is out of scope.",
    "",
    "Chart surfaces (velocity, burnup, CFD, cycle-time, lead-time) render the chart component",
    "directly (bypassing the section wrapper with its `dynamic(() => ..., {ssr: false})`)",
    "to allow recharts SVG to render synchronously in the browser bundle.",
    "",
    "## Named Exemptions",
    "",
    "These rules are applied before focus-order verdict and suppress false positives.",
    "Each exempted element is listed per surface so a reviewer can verify the classification.",
    "A PASS with exemptions differs from a PASS without: the former means the harness found",
    "elements that matched a named rule; the latter means the harness found nothing to exempt.",
    "",
    "### TABLIST-ROVING-TABINDEX",
    "- **Applies to:** elements with `role=tab`, or any descendant of `[role=tablist]`, carrying `tabindex=\"-1\"`",
    "- **Justification:** WAI-ARIA Authoring Practices (Tabs Pattern, §5.3) requires roving tabindex: exactly",
    "  one tab carries `tabindex=0` (the active tab); all inactive tabs carry `tabindex=-1` and are reached via",
    "  Arrow keys, not Tab. An inactive tab IN the Tab sequence would be the defect. Radix UI",
    "  `@radix-ui/react-tabs` implements this correctly.",
    "- **Source:** WAI-ARIA APG Tabs Pattern; Radix UI tabs.tsx:4 (`@radix-ui/react-tabs`)",
    "",
    "### RADIX-FOCUS-GUARD",
    "- **Applies to:** zero-size keyboard-focusable elements carrying `aria-hidden=true` OR any",
    "  `data-radix-*-focus-guard` attribute",
    "- **Justification:** Radix UI inserts zero-size sentinel elements around modal content to intercept",
    "  Tab-wrap events. They are marked `aria-hidden=true` and carry a `data-radix-focus-guard` attribute.",
    "  Screen readers skip them; sighted users never see them. Flagging them would produce noise on every",
    "  surface that uses Radix Dialog, Sheet, or DropdownMenu.",
    "- **Source:** radix-ui/primitives focus-guards.tsx",
    "",
    "### DISPLAY-NONE-NOT-FOCUSABLE",
    "- **Applies to:** zero-size elements whose computed `display` property is `none` (or whose computed",
    "  `visibility` is `hidden`), regardless of their `tabindex` attribute value",
    "- **Justification:** HTML specification and all major browser implementations: `display:none` elements",
    "  cannot receive keyboard focus regardless of tabindex. An element can have `tabindex=0` in the DOM",
    "  (so it is ready to receive focus when its state changes to visible) while being `display:none`",
    "  when inactive — a common pattern in Radix UI TabsContent (`data-[state=inactive]:hidden`) and",
    "  similar widget implementations. The tabindex attribute is harmless; the element is not in the Tab",
    "  sequence and poses no accessibility issue.",
    "- **Detection:** `getComputedStyle(el).display === \"none\"` via CDP Runtime.evaluate",
    "",
    "## Bundle Status",
    "",
  ];

  for (const surface of SURFACES) {
    const r = bundleResults[surface.key];
    if (r.ok) {
      lines.push(`- ${surface.key}: BUILD OK`);
    } else if (r.notCovered) {
      lines.push(`- ${surface.key}: NOT-COVERED — ${r.error?.slice(0, 120)}`);
    } else {
      lines.push(`- ${surface.key}: BUILD FAILED — ${r.error?.slice(0, 120)}`);
    }
  }

  lines.push("", "## Coverage Matrix", "", "surface | 375px overflow | 375px focus | 375px SVG | 1440px overflow | 1440px focus | 1440px SVG");
  lines.push("--- | --- | --- | --- | --- | --- | ---");

  const byKey = {};
  for (const m of measurements) {
    if (!byKey[m.surface]) byKey[m.surface] = {};
    byKey[m.surface][m.width] = m;
  }

  for (const surface of SURFACES) {
    if (surface.notCovered) {
      lines.push(`${surface.key} | NOT-RUN | NOT-RUN | n/a | NOT-RUN | NOT-RUN | n/a`);
      continue;
    }
    const cells = [];
    for (const width of WIDTHS) {
      const m = byKey[surface.key]?.[width];
      if (!m) {
        cells.push("NOT-RUN", "NOT-RUN", surface.chartSurface ? "NOT-RUN" : "n/a");
      } else {
        cells.push(m.overflowCheck.verdict);
        cells.push(m.focusCheck.verdict);
        cells.push(surface.chartSurface ? (m.svgCheck?.verdict || "NOT-RUN") : "n/a");
      }
    }
    lines.push(`${surface.key} | ${cells.join(" | ")}`);
  }

  lines.push("", "## Findings", "");

  let findingCount = 0;
  for (const m of measurements) {
    if (m.overflowCheck.verdict === "FAIL") {
      findingCount++;
      lines.push(`### F${findingCount}: Layout overflow — ${m.surface} @ ${m.width}px`);
      lines.push(`- Surface: \`${m.label}\``);
      lines.push(`- Width: ${m.width}px`);
      lines.push(`- Measured scrollWidth: ${m.overflowCheck.scrollWidth}px`);
      lines.push(`- Viewport innerWidth: ${m.overflowCheck.innerWidth}px`);
      lines.push(`- Overflow by: ${m.overflowCheck.by}px`);
      lines.push(`- Widest element: \`${m.overflowCheck.widest}\``);
      lines.push(`- Screenshot: ${m.screenshots[0] || "none"}`);
      lines.push("");
    }
    if (m.focusCheck.verdict === "FAIL") {
      findingCount++;
      lines.push(`### F${findingCount}: Focus order issue — ${m.surface} @ ${m.width}px`);
      lines.push(`- Surface: \`${m.label}\``);
      lines.push(`- Reason: ${m.focusCheck.reason}`);
      lines.push(`- Tab stops reached: ${m.focusCheck.tabCount}`);
      lines.push(`- DOM-focusable elements: ${m.focusCheck.domFocusableCount ?? "n/a"}`);
      if (m.focusCheck.orderAnalysis?.positiveTabIndex?.length > 0) {
        lines.push(`- Positive tabIndex: ${m.focusCheck.orderAnalysis.positiveTabIndex.join("; ")}`);
      }
      if (m.focusCheck.orderAnalysis?.zeroSizeFocusable?.length > 0) {
        lines.push(`- Zero-size focusable (not exempted):`);
        for (const d of m.focusCheck.orderAnalysis.zeroSizeFocusable) {
          lines.push(`  - \`${d}\``);
        }
      }
      if (m.focusCheck.orderAnalysis?.mouseOnly?.length > 0) {
        lines.push(`- Mouse-only interactive (not exempted): ${m.focusCheck.orderAnalysis.mouseOnly.join("; ")}`);
      }
      if ((m.focusCheck.zeroSizeExempted?.length ?? 0) > 0 || (m.focusCheck.mouseOnlyExempted?.length ?? 0) > 0) {
        lines.push(`- Exempted elements (not counted in verdict):`);
        for (const ex of (m.focusCheck.zeroSizeExempted || [])) {
          lines.push(`  - [${ex.reason}] \`${ex.descriptor}\``);
        }
        for (const ex of (m.focusCheck.mouseOnlyExempted || [])) {
          lines.push(`  - [${ex.reason}] \`${ex.descriptor}\``);
        }
      }
      lines.push(`- Screenshot: ${m.screenshots[0] || "none"}`);
      lines.push("");
    }
    if (m.focusCheck.verdict === "PASS" && ((m.focusCheck.zeroSizeExempted?.length ?? 0) > 0 || (m.focusCheck.mouseOnlyExempted?.length ?? 0) > 0)) {
      lines.push(`### Note: Focus exemptions applied — ${m.surface} @ ${m.width}px (verdict: PASS)`);
      for (const ex of (m.focusCheck.zeroSizeExempted || [])) {
        lines.push(`- [${ex.reason}] \`${ex.descriptor}\``);
      }
      for (const ex of (m.focusCheck.mouseOnlyExempted || [])) {
        lines.push(`- [${ex.reason}] \`${ex.descriptor}\``);
      }
      lines.push("");
    }
    if (m.svgCheck?.verdict === "FAIL") {
      findingCount++;
      lines.push(`### F${findingCount}: SVG not painted — ${m.surface} @ ${m.width}px`);
      lines.push(`- Surface: \`${m.label}\``);
      lines.push(`- SVG elements: ${m.svgCheck.svgCount}`);
      lines.push(`- Painted (non-zero bbox): ${m.svgCheck.paintedCount}`);
      lines.push(`- Unpainted: ${m.svgCheck.unpaintedCount}`);
      lines.push(`- Screenshot: ${m.screenshots[0] || "none"}`);
      lines.push("");
    }
  }

  if (findingCount === 0) lines.push("No FAIL findings.");

  lines.push("", "## NOT-COVERED Surfaces", "");
  const notCoveredSurfaces = SURFACES.filter(s => s.notCovered);
  if (notCoveredSurfaces.length === 0) {
    lines.push("None.");
  } else {
    for (const s of notCoveredSurfaces) {
      lines.push(`- **${s.key}** (${s.label}): ${s.notCoveredReason}`);
    }
  }

  lines.push("", "## NOT-RUN Cells", "");
  let notRunCount = 0;
  const dedupedNotRun = new Set();
  for (const m of measurements) {
    if (m.notCovered) continue;
    for (const [checkName, check] of [["overflow", m.overflowCheck], ["focus", m.focusCheck], ["svg", m.svgCheck]]) {
      if (check && check.verdict === "NOT-RUN") {
        const key = `${m.surface}@${m.width}px[${checkName}]`;
        if (dedupedNotRun.has(key)) continue;
        dedupedNotRun.add(key);
        notRunCount++;
        const reason = check.reason || "not run";
        lines.push(`- ${m.surface} @ ${m.width}px [${checkName}]: ${reason}`);
        if (check.mountError) lines.push(`  - Mount error: \`${check.mountError.slice(0, 200)}\``);
      }
    }
  }
  if (notRunCount === 0) lines.push("None.");

  lines.push("", "## Focus Analysis Detail", "");
  lines.push("surface | width | tab-stops | dom-focusable | pos-tabindex | zero-size | mouse-only | tablist-exempt | radix-guard-exempt | verdict");
  lines.push("--- | --- | --- | --- | --- | --- | --- | --- | --- | ---");
  for (const m of measurements) {
    if (m.notCovered) continue;
    const fc = m.focusCheck;
    if (fc.verdict === "NOT-RUN") {
      lines.push(`${m.surface} | ${m.width} | - | - | - | - | - | - | - | NOT-RUN`);
    } else {
      const oa = fc.orderAnalysis || {};
      const tablistExempt = (oa.mouseOnlyExempted || []).length;
      const radixGuardExempt = (oa.zeroSizeExempted || []).length;
      lines.push(`${m.surface} | ${m.width} | ${fc.tabCount} | ${oa.domFocusableCount ?? "-"} | ${(oa.positiveTabIndex?.length || 0)} | ${(oa.zeroSizeFocusable?.length || 0)} | ${(oa.mouseOnly?.length || 0)} | ${tablistExempt} | ${radixGuardExempt} | ${fc.verdict}`);
    }
  }

  lines.push("", "## Screenshots", "");
  for (const m of measurements) {
    for (const shot of m.screenshots) {
      lines.push(`- ${m.surface} @ ${m.width}px: \`${shot}\``);
    }
  }

  lines.push("", "## Reproduction", "");
  lines.push("```bash");
  lines.push("node frontend/scripts/fe-123-browser-checks.mjs");
  lines.push("# Self-test mode:");
  lines.push("node frontend/scripts/fe-123-browser-checks.mjs --self-test");
  lines.push("# Visible browser (for debugging):");
  lines.push("node frontend/scripts/fe-123-browser-checks.mjs --no-headless");
  lines.push("```");

  return lines;
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
