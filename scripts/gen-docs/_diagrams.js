// Inline SVG diagram templates rendered to PNG via sharp.
// Each function returns a Buffer ready for ImageRun.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const NAVY = "#0F2B7F";
const GOLD = "#BD882C";
const NAVY_LIGHT = "#E0E8FF";
const GOLD_LIGHT = "#FFF3E0";
const GRAY = "#666666";
const GRAY_LIGHT = "#F5F5F5";
const GREEN = "#15803D";
const GREEN_LIGHT = "#DCFCE7";
const RED = "#B91C1C";
const RED_LIGHT = "#FEE2E2";

const FONT = "Calibri, 'Segoe UI', Helvetica, Arial, sans-serif";

const ASSETS_DIR = path.join(__dirname, "..", "..", "docs", "word-docs", "_assets");
fs.mkdirSync(ASSETS_DIR, { recursive: true });

async function svgToPng(svg, outName) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const outPath = path.join(ASSETS_DIR, outName);
  fs.writeFileSync(outPath, buf);
  return buf;
}

// ── Diagram 1: Architectural Layers ─────────────────────────────────────────
function layerDiagramSvg() {
  const W = 1200, H = 900;
  const layers = [
    { y: 60,  label: "Browser",                     fill: GOLD_LIGHT, stroke: GOLD, sub: "fetch / form / TanStack mutation" },
    { y: 180, label: "Edge: middleware.ts",         fill: NAVY_LIGHT, stroke: NAVY, sub: "rate limit · auth · MFA · role gate" },
    { y: 300, label: "Route handlers (app/api/...)  ·  Pages (app/(...)/...)", fill: NAVY_LIGHT, stroke: NAVY, sub: "withAuth() · parseBody(zod) · ok / err" },
    { y: 420, label: "Server actions (server/actions/...)", fill: NAVY_LIGHT, stroke: NAVY, sub: "requireAuth() · zod parse · revalidatePath" },
    { y: 540, label: "Queries (server/queries/...)",         fill: GREEN_LIGHT, stroke: GREEN, sub: "filters · pagination · aggregation" },
    { y: 660, label: "Repositories (server/repos/...)",      fill: GREEN_LIGHT, stroke: GREEN, sub: "canonical 'load X with relations'" },
    { y: 780, label: "Drizzle ORM  →  Postgres (Neon)",       fill: GRAY_LIGHT,  stroke: GRAY, sub: "lib/db.ts" },
  ];

  const boxes = layers.map(L => `
    <rect x="80" y="${L.y}" width="1040" height="90" rx="10" fill="${L.fill}" stroke="${L.stroke}" stroke-width="2"/>
    <text x="100" y="${L.y + 36}" font-family="${FONT}" font-size="22" font-weight="700" fill="#222">${L.label}</text>
    <text x="100" y="${L.y + 66}" font-family="${FONT}" font-size="16" fill="${GRAY}">${L.sub}</text>
  `).join("");

  const arrows = layers.slice(0, -1).map((_, i) => {
    const y = layers[i].y + 95;
    return `<path d="M 600 ${y} L 600 ${y + 20}" stroke="${NAVY}" stroke-width="3" marker-end="url(#arrow)"/>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${NAVY}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W/2}" y="35" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Architectural Layers — request flow top to bottom</text>
  ${boxes}
  ${arrows}
</svg>`;
}

// ── Diagram 2: Request Lifecycle (sequence diagram) ─────────────────────────
function lifecycleDiagramSvg() {
  const W = 1300, H = 720;
  const cols = [
    { x: 100,  label: "Browser",       fill: GOLD_LIGHT, stroke: GOLD },
    { x: 320,  label: "Middleware",    fill: NAVY_LIGHT, stroke: NAVY },
    { x: 540,  label: "Route handler", fill: NAVY_LIGHT, stroke: NAVY },
    { x: 760,  label: "Query / Repo",  fill: GREEN_LIGHT, stroke: GREEN },
    { x: 980,  label: "Drizzle + DB",  fill: GRAY_LIGHT, stroke: GRAY },
    { x: 1180, label: "Inngest",       fill: GOLD_LIGHT, stroke: GOLD },
  ];

  const headerY = 80;
  const lifelineTop = 130;
  const lifelineBottom = 660;

  const headers = cols.map(c => `
    <rect x="${c.x - 70}" y="${headerY - 30}" width="140" height="50" rx="6" fill="${c.fill}" stroke="${c.stroke}" stroke-width="2"/>
    <text x="${c.x}" y="${headerY}" font-family="${FONT}" font-size="16" font-weight="700" fill="#222" text-anchor="middle">${c.label}</text>
    <line x1="${c.x}" y1="${lifelineTop}" x2="${c.x}" y2="${lifelineBottom}" stroke="${GRAY}" stroke-width="1" stroke-dasharray="4 4"/>
  `).join("");

  const messages = [
    { from: 0, to: 1, y: 170, label: "POST /api/hr/leaves" },
    { from: 1, to: 2, y: 220, label: "pass (auth ok, role ok)" },
    { from: 2, to: 2, y: 270, label: "withAuth() resolves session" },
    { from: 2, to: 2, y: 310, label: "parseBody(req, leaveSchema)" },
    { from: 2, to: 3, y: 360, label: "createLeaveRequest(orgId, ...)" },
    { from: 3, to: 4, y: 410, label: "INSERT INTO leave_requests" },
    { from: 4, to: 3, y: 450, label: "row" },
    { from: 3, to: 2, y: 490, label: "result" },
    { from: 2, to: 5, y: 540, label: "inngest.send('hr/leave.requested')" },
    { from: 2, to: 0, y: 600, label: "200 OK { id }" },
  ];

  const arrowSvg = messages.map(m => {
    const x1 = cols[m.from].x, x2 = cols[m.to].x;
    if (x1 === x2) {
      return `
        <path d="M ${x1} ${m.y} q 40 -10 0 30" fill="none" stroke="${NAVY}" stroke-width="2" marker-end="url(#a)"/>
        <text x="${x1 + 55}" y="${m.y + 12}" font-family="${FONT}" font-size="13" fill="#333">${m.label}</text>
      `;
    }
    const isLeft = x2 < x1;
    return `
      <line x1="${x1}" y1="${m.y}" x2="${x2 + (isLeft ? 8 : -8)}" y2="${m.y}" stroke="${NAVY}" stroke-width="2" marker-end="url(#a)"/>
      <text x="${(x1 + x2) / 2}" y="${m.y - 8}" font-family="${FONT}" font-size="13" fill="#333" text-anchor="middle">${m.label}</text>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${NAVY}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W / 2}" y="40" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Request Lifecycle — leave-request submission</text>
  ${headers}
  ${arrowSvg}
</svg>`;
}

// ── Diagram 3: Module Map ───────────────────────────────────────────────────
function moduleMapSvg() {
  const W = 1200, H = 760;
  const center = { cx: W / 2, cy: H / 2, r: 110 };

  const modules = [
    { angle: -90,  label: "CRM",       sub: "Leads · Deals · Accounts" },
    { angle: -50,  label: "HR",        sub: "Employees · Attendance" },
    { angle: -10,  label: "Payroll",   sub: "Salary · OT · Deductions" },
    { angle:  30,  label: "Projects",  sub: "Sprints · Tickets" },
    { angle:  70,  label: "Support",   sub: "Helpdesk · CSAT" },
    { angle: 110,  label: "Auth &amp; Org", sub: "Sessions · Roles · MFA" },
    { angle: 150,  label: "Settings",  sub: "Profile · Billing" },
    { angle: 190,  label: "Notifications", sub: "In-app · Email · Push" },
    { angle: 230,  label: "Reports",   sub: "Dashboards · Exports" },
  ];

  const radius = 280;
  const nodes = modules.map(m => {
    const rad = (m.angle * Math.PI) / 180;
    const x = center.cx + Math.cos(rad) * radius;
    const y = center.cy + Math.sin(rad) * radius;
    return `
      <line x1="${center.cx}" y1="${center.cy}" x2="${x}" y2="${y}" stroke="${NAVY_LIGHT}" stroke-width="2"/>
      <ellipse cx="${x}" cy="${y}" rx="100" ry="44" fill="${NAVY_LIGHT}" stroke="${NAVY}" stroke-width="2"/>
      <text x="${x}" y="${y - 4}" font-family="${FONT}" font-size="18" font-weight="700" fill="${NAVY}" text-anchor="middle">${m.label}</text>
      <text x="${x}" y="${y + 18}" font-family="${FONT}" font-size="13" fill="#444" text-anchor="middle">${m.sub}</text>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W / 2}" y="40" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Vaivamm CRM — Top-level Modules</text>
  ${nodes}
  <circle cx="${center.cx}" cy="${center.cy}" r="${center.r}" fill="${GOLD_LIGHT}" stroke="${GOLD}" stroke-width="3"/>
  <text x="${center.cx}" y="${center.cy - 6}" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Vaivamm</text>
  <text x="${center.cx}" y="${center.cy + 22}" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Capital CRM</text>
</svg>`;
}

// ── Diagram 4: Payroll calculation flow ─────────────────────────────────────
function payrollFlowSvg() {
  const W = 1200, H = 920;
  const boxes = [
    { x: 100,  y: 60,  w: 320, h: 80, label: "Salary structures (1+ overlapping)", sub: "basic · hra% · special · effective dates", fill: NAVY_LIGHT, stroke: NAVY },
    { x: 480,  y: 60,  w: 320, h: 80, label: "Attendance rows for the month",      sub: "PRESENT · HALF_DAY · LATE",                  fill: NAVY_LIGHT, stroke: NAVY },
    { x: 860,  y: 60,  w: 240, h: 80, label: "HWR + Salary Loans",                 sub: "OT eligibility · advance recovery",            fill: NAVY_LIGHT, stroke: NAVY },

    { x: 100,  y: 220, w: 320, h: 80, label: "computeProratedSalary()",            sub: "weighted by days per segment",                 fill: GREEN_LIGHT, stroke: GREEN },
    { x: 480,  y: 220, w: 320, h: 80, label: "LOP + half-day calculator",          sub: "(monthly_ctc / cal_days) × days_lost",         fill: GREEN_LIGHT, stroke: GREEN },
    { x: 860,  y: 220, w: 240, h: 80, label: "OT amount",                          sub: "daily × multiplier(type)",                     fill: GREEN_LIGHT, stroke: GREEN },

    { x: 290,  y: 380, w: 620, h: 80, label: "Gross  =  basic + hra + special + bonus + OT",                       sub: "all rounded (roundInr)",                fill: GOLD_LIGHT, stroke: GOLD },

    { x: 100,  y: 540, w: 240, h: 80, label: "computeStatutory()",                 sub: "PF (12% basic capped)",                        fill: RED_LIGHT, stroke: RED },
    { x: 380,  y: 540, w: 240, h: 80, label: "computeStatutory()",                 sub: "ESI (0.75% gross if ≤ 21k)",                   fill: RED_LIGHT, stroke: RED },
    { x: 660,  y: 540, w: 240, h: 80, label: "PT + advance + structure_ded",       sub: "from salary_structures.deductions",            fill: RED_LIGHT, stroke: RED },
    { x: 940,  y: 540, w: 160, h: 80, label: "Other deductions",                   sub: "manual",                                       fill: RED_LIGHT, stroke: RED },

    { x: 290,  y: 700, w: 620, h: 80, label: "Total deductions  =  Σ above",       sub: "rounded; persisted itemized",                  fill: RED_LIGHT, stroke: RED },

    { x: 290,  y: 820, w: 620, h: 80, label: "Net salary  =  Gross  −  Total deductions", sub: "stored in payrolls.net_salary",        fill: GOLD_LIGHT, stroke: GOLD },
  ];

  const arrows = [
    "M 260 140 L 260 220",
    "M 640 140 L 640 220",
    "M 980 140 L 980 220",
    "M 260 300 L 600 380",
    "M 640 300 L 600 380",
    "M 980 300 L 600 380",
    "M 600 460 L 600 540",
    "M 220 620 L 600 700",
    "M 500 620 L 600 700",
    "M 780 620 L 600 700",
    "M 1020 620 L 600 700",
    "M 600 780 L 600 820",
  ];

  const drawBoxes = boxes.map(b => `
    <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10" fill="${b.fill}" stroke="${b.stroke}" stroke-width="2"/>
    <text x="${b.x + 16}" y="${b.y + 32}" font-family="${FONT}" font-size="17" font-weight="700" fill="#222">${b.label}</text>
    <text x="${b.x + 16}" y="${b.y + 56}" font-family="${FONT}" font-size="14" fill="${GRAY}">${b.sub}</text>
  `).join("");

  const drawArrows = arrows.map(a => `<path d="${a}" stroke="${NAVY}" stroke-width="2.5" fill="none" marker-end="url(#a)"/>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${NAVY}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W / 2}" y="35" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Payroll Calculation Flow</text>
  ${drawBoxes}
  ${drawArrows}
</svg>`;
}

// ── Diagram 5: Auth flow (state machine) ────────────────────────────────────
function authFlowSvg() {
  const W = 1200, H = 720;
  const states = [
    { x: 130,  y: 320, label: "Anonymous",      fill: GRAY_LIGHT, stroke: GRAY },
    { x: 380,  y: 320, label: "Credentials\nsubmitted",   fill: NAVY_LIGHT, stroke: NAVY },
    { x: 630,  y: 200, label: "MFA required",   fill: GOLD_LIGHT, stroke: GOLD },
    { x: 630,  y: 440, label: "Session issued", fill: GREEN_LIGHT, stroke: GREEN },
    { x: 920,  y: 200, label: "MFA verified",   fill: GREEN_LIGHT, stroke: GREEN },
    { x: 920,  y: 440, label: "App access",     fill: GREEN_LIGHT, stroke: GREEN },
    { x: 380,  y: 560, label: "Account locked", fill: RED_LIGHT, stroke: RED },
  ];

  const drawStates = states.map(s => `
    <ellipse cx="${s.x}" cy="${s.y}" rx="100" ry="48" fill="${s.fill}" stroke="${s.stroke}" stroke-width="2"/>
    ${s.label.split("\n").map((l, i, arr) => `<text x="${s.x}" y="${s.y - (arr.length - 1) * 9 + i * 18 + 5}" font-family="${FONT}" font-size="16" font-weight="700" fill="#222" text-anchor="middle">${l}</text>`).join("")}
  `).join("");

  const transitions = [
    { from: 0, to: 1, label: "POST /signin" },
    { from: 1, to: 2, label: "MFA enrolled" },
    { from: 1, to: 3, label: "no MFA" },
    { from: 1, to: 6, label: "5 wrong attempts" },
    { from: 2, to: 4, label: "TOTP correct" },
    { from: 4, to: 5, label: "session" },
    { from: 3, to: 5, label: "session" },
  ];

  const drawTransitions = transitions.map(t => {
    const s = states[t.from], e = states[t.to];
    return `
      <line x1="${s.x}" y1="${s.y}" x2="${e.x}" y2="${e.y}" stroke="${NAVY}" stroke-width="2" marker-end="url(#a)"/>
      <text x="${(s.x + e.x) / 2}" y="${(s.y + e.y) / 2 - 8}" font-family="${FONT}" font-size="13" fill="#333" text-anchor="middle">${t.label}</text>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${NAVY}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W / 2}" y="40" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Authentication State Machine</text>
  ${drawTransitions}
  ${drawStates}
</svg>`;
}

// ── Diagram 6: Leave approval state machine ─────────────────────────────────
function leaveApprovalSvg() {
  const W = 1200, H = 600;
  const states = [
    { x: 120, y: 300, label: "Submitted", fill: NAVY_LIGHT, stroke: NAVY },
    { x: 380, y: 300, label: "Pending\nManager", fill: GOLD_LIGHT, stroke: GOLD },
    { x: 640, y: 180, label: "Pending HR", fill: GOLD_LIGHT, stroke: GOLD },
    { x: 640, y: 420, label: "Rejected", fill: RED_LIGHT, stroke: RED },
    { x: 920, y: 180, label: "Approved", fill: GREEN_LIGHT, stroke: GREEN },
    { x: 920, y: 420, label: "Cancelled", fill: GRAY_LIGHT, stroke: GRAY },
  ];

  const drawStates = states.map(s => `
    <ellipse cx="${s.x}" cy="${s.y}" rx="88" ry="44" fill="${s.fill}" stroke="${s.stroke}" stroke-width="2"/>
    ${s.label.split("\n").map((l, i, arr) => `<text x="${s.x}" y="${s.y - (arr.length - 1) * 9 + i * 18 + 5}" font-family="${FONT}" font-size="16" font-weight="700" fill="#222" text-anchor="middle">${l}</text>`).join("")}
  `).join("");

  const transitions = [
    { from: 0, to: 1, label: "auto" },
    { from: 1, to: 2, label: "manager OK" },
    { from: 1, to: 3, label: "manager rejects" },
    { from: 2, to: 4, label: "HR approves" },
    { from: 2, to: 3, label: "HR rejects" },
    { from: 4, to: 5, label: "employee cancels" },
  ];

  const drawTransitions = transitions.map(t => {
    const s = states[t.from], e = states[t.to];
    return `
      <line x1="${s.x}" y1="${s.y}" x2="${e.x}" y2="${e.y}" stroke="${NAVY}" stroke-width="2" marker-end="url(#a)"/>
      <text x="${(s.x + e.x) / 2}" y="${(s.y + e.y) / 2 - 8}" font-family="${FONT}" font-size="13" fill="#333" text-anchor="middle">${t.label}</text>
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${NAVY}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W / 2}" y="40" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Leave Request — Approval State Machine</text>
  ${drawTransitions}
  ${drawStates}
</svg>`;
}

// ── Diagram 7: Schema namespace ER overview ─────────────────────────────────
function schemaOverviewSvg() {
  const W = 1300, H = 760;
  const groups = [
    { x: 80,   y: 80,  w: 360, h: 240, title: "auth", tables: ["users", "accounts", "sessions", "organizations", "organizationMembers", "userSessions"], fill: NAVY_LIGHT, stroke: NAVY },
    { x: 470,  y: 80,  w: 360, h: 240, title: "hr", tables: ["payrolls", "salaryStructures", "attendance", "leaveRequests", "leaveBalances", "appraisals", "performanceImprovementPlans", "+82 more"], fill: GREEN_LIGHT, stroke: GREEN },
    { x: 860,  y: 80,  w: 360, h: 240, title: "crm", tables: ["leads", "clientAccounts", "deals", "contacts", "supportTickets", "csatSurveys", "+60 more"], fill: GOLD_LIGHT, stroke: GOLD },

    { x: 80,   y: 360, w: 360, h: 220, title: "projects", tables: ["projects", "sprints", "tickets", "ticketComments", "ticketAttachments", "timesheets"], fill: NAVY_LIGHT, stroke: NAVY },
    { x: 470,  y: 360, w: 360, h: 220, title: "marketing", tables: ["landingPages", "leadCaptureForms", "+ shared with crm.marketing"], fill: GOLD_LIGHT, stroke: GOLD },
    { x: 860,  y: 360, w: 360, h: 220, title: "enums", tables: ["leadStatusEnum", "payrollStatusEnum", "leaveStatusEnum", "+30 more"], fill: GRAY_LIGHT, stroke: GRAY },
  ];

  const drawGroups = groups.map(g => {
    const rows = g.tables.map((t, i) => `
      <text x="${g.x + 20}" y="${g.y + 80 + i * 22}" font-family="Consolas, monospace" font-size="14" fill="#222">${t}</text>
    `).join("");
    return `
      <rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="10" fill="${g.fill}" stroke="${g.stroke}" stroke-width="2"/>
      <rect x="${g.x}" y="${g.y}" width="${g.w}" height="44" rx="10" fill="${g.stroke}"/>
      <text x="${g.x + 20}" y="${g.y + 30}" font-family="${FONT}" font-size="20" font-weight="700" fill="white">${g.title}</text>
      ${rows}
    `;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="white"/>
  <text x="${W / 2}" y="40" font-family="${FONT}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">Database Schema Namespaces</text>
  ${drawGroups}
  <text x="${W / 2}" y="${H - 30}" font-family="${FONT}" font-size="14" fill="${GRAY}" text-anchor="middle">~210 total tables · all scoped by org_id · soft delete via deleted_at where applicable</text>
</svg>`;
}

// ── API ──────────────────────────────────────────────────────────────────────
async function generateAll() {
  await svgToPng(layerDiagramSvg(), "diag-layers.png");
  await svgToPng(lifecycleDiagramSvg(), "diag-lifecycle.png");
  await svgToPng(moduleMapSvg(), "diag-modules.png");
  await svgToPng(payrollFlowSvg(), "diag-payroll-flow.png");
  await svgToPng(authFlowSvg(), "diag-auth-flow.png");
  await svgToPng(leaveApprovalSvg(), "diag-leave-flow.png");
  await svgToPng(schemaOverviewSvg(), "diag-schema-overview.png");
}

if (require.main === module) {
  generateAll().then(() => console.log("All diagrams written to docs/word-docs/_assets/"));
}

module.exports = { generateAll, ASSETS_DIR };
