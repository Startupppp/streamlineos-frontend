export const PASS = "PASS";
export const FAIL = "FAIL";
export const NOT_RUN = "NOT-RUN";

export const STATES = [
  { key: "loading-and-empty", label: "Loading and empty" },
  { key: "error-and-retry", label: "Error and retry" },
  { key: "cross-tab-freshness", label: "Cross-tab freshness" },
  { key: "keyboard-and-accessibility", label: "Keyboard and accessibility" },
  { key: "responsive-layout", label: "Responsive layout" },
];

export function parseWidths(raw) {
  const widths = String(raw)
    .split(",")
    .map((w) => Number(w.trim()))
    .filter((w) => Number.isInteger(w) && w > 0);
  if (widths.length === 0) throw new Error(`--widths parsed to nothing from "${raw}"`);
  return widths;
}

export function isSignInUrl(url) {
  return /\/(signin|sign-in|login|auth)(\/|\?|$)/i.test(String(url ?? ""));
}

export function screenshotName(state, width, variant) {
  return `${state}-${width}px${variant ? `-${variant}` : ""}.png`;
}

export function overflowVerdict({ scrollWidth, innerWidth }) {
  if (!Number.isFinite(scrollWidth) || !Number.isFinite(innerWidth))
    return { overflows: false, by: 0, measured: false };
  const by = Math.round(scrollWidth - innerWidth);
  return { overflows: by > 1, by, measured: true };
}

export function cell(state, width, verdict, reason, extra = {}) {
  return { state, width, verdict, reason: reason ?? null, screenshots: [], ...extra };
}

export function notRunCell(state, width, reason) {
  return cell(state, width, NOT_RUN, reason);
}

export function cellFromChecks(state, width, checks, screenshots, axe) {
  const missingShot = screenshots.length === 0;
  if (missingShot)
    return {
      ...cell(state, width, NOT_RUN, "no screenshot was captured for this cell"),
      checks,
      axe: axe ?? null,
      screenshots,
    };
  const unreached = checks.filter((c) => c.verdict === NOT_RUN);
  const failed = checks.filter((c) => c.verdict === FAIL);
  let verdict = PASS;
  let reason = null;
  if (failed.length > 0) {
    verdict = FAIL;
    reason = failed.map((c) => `${c.name}: ${c.reason}`).join("; ");
  } else if (unreached.length > 0) {
    verdict = NOT_RUN;
    reason = unreached.map((c) => `${c.name}: ${c.reason}`).join("; ");
  } else if (axe && axe.ran !== true) {
    verdict = NOT_RUN;
    reason = `axe did not run (${axe.reason}) — this state is unmeasured, not clean`;
  }
  return { ...cell(state, width, verdict, reason), checks, axe: axe ?? null, screenshots };
}

export function check(name, verdict, reason) {
  return { name, verdict, reason: reason ?? null };
}

export function passed(name) {
  return check(name, PASS, null);
}

export function failed(name, reason) {
  return check(name, FAIL, reason);
}

export function unreached(name, reason) {
  return check(name, NOT_RUN, reason);
}

export function plannedCellCount(states, widths) {
  return states.length * widths.length;
}

export function matrixIncomplete(cells, planned) {
  return cells.length < planned;
}

export function summarise(cells) {
  const counts = { PASS: 0, FAIL: 0, "NOT-RUN": 0 };
  for (const c of cells) counts[c.verdict] = (counts[c.verdict] ?? 0) + 1;
  return counts;
}

export function matrixExitCode(cells, planned) {
  if (matrixIncomplete(cells, planned)) return 1;
  return cells.every((c) => c.verdict === PASS) ? 0 : 1;
}

export function renderMarkdownTable(cells, widths, states = STATES) {
  const byKey = new Map();
  for (const c of cells) byKey.set(`${c.state}:${c.width}`, c);
  const header = `| Acceptance state | ${widths.map((w) => `${w} px`).join(" | ")} |`;
  const divider = `| --- | ${widths.map(() => "---").join(" | ")} |`;
  const rows = states.map((s) => {
    const cols = widths.map((w) => {
      const found = byKey.get(`${s.key}:${w}`);
      if (!found) return NOT_RUN;
      const shots = found.screenshots ?? [];
      const links = shots.map((p) => `[shot](${p})`).join(" ");
      return links ? `${found.verdict} ${links}` : found.verdict;
    });
    return `| ${s.label} | ${cols.join(" | ")} |`;
  });
  return [header, divider, ...rows].join("\n");
}
