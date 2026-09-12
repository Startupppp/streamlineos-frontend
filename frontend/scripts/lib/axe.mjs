import { createRequire } from "node:module";

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export function axeSourcePath() {
  const here = createRequire(import.meta.url);
  const fromJestAxe = createRequire(here.resolve("jest-axe/package.json"));
  return fromJestAxe.resolve("axe-core/axe.min.js");
}

export function axeExpression(tags = AXE_TAGS, timeoutMs = 20000) {
  return `(() => {
    if (typeof window.axe === "undefined")
      return Promise.resolve({ ran: false, reason: "axe-not-injected" });
    const run = window.axe
      .run(document, { runOnly: { type: "tag", values: ${JSON.stringify(tags)} } })
      .then((r) => ({
        ran: true,
        nodesChecked:
          r.passes.reduce((n, x) => n + x.nodes.length, 0) +
          r.violations.reduce((n, x) => n + x.nodes.length, 0),
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          html: v.nodes.slice(0, 2).map((n) => String(n.html).slice(0, 200)),
        })),
      }))
      .catch((e) => ({ ran: false, reason: String((e && e.message) || e) }));
    return Promise.race([
      run,
      new Promise((res) => setTimeout(() => res({ ran: false, reason: "axe-timeout" }), ${timeoutMs})),
    ]);
  })()`;
}

export function axeVerdict(result) {
  if (!result || result.ran !== true)
    return {
      ran: false,
      reason: (result && result.reason) || "no-result",
      nodesChecked: 0,
      violations: [],
    };
  return {
    ran: true,
    reason: null,
    nodesChecked: result.nodesChecked ?? 0,
    violations: result.violations ?? [],
  };
}

export function seriousViolations(violations) {
  return violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}
