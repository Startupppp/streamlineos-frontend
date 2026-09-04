#!/usr/bin/env node
/**
 * Every `check:*` script in package.json must be invoked by a real `run:` step of a real job in
 * `.github/workflows/`, or be listed here with a reason.
 *
 * Written 2026-09-03 after measuring that TEN gates across the two repositories existed in
 * package.json and were referenced by no workflow at all — among them
 * `check:permission-binding`, which had found 27 real permission/route mismatches on the day it
 * was written, and `check:tenant-isolation:run`, which is the gate that actually EXECUTES the
 * cross-tenant isolation suites.
 *
 * A gate that cannot run is indistinguishable from a gate that passes. That is the defect class
 * this release keeps finding — a budget whose SQL read a different table, a purge that verified
 * the wrong bucket, a ratchet whose workflow pointed at a directory that does not exist. This
 * closes the version of it that applies to gates themselves.
 *
 * An exception must carry a real reason. "Needs a live database" is one; "not yet" is not.
 *
 * ---------------------------------------------------------------------------------------------
 * 2026-09-03 — THE MATCHER NO LONGER SEARCHES TEXT. It parses.
 *
 * This gate used to decide "wired" by asking whether the concatenated raw YAML *contained* the
 * gate's name. In the backend copy that failed in three distinct ways:
 *
 *   1. A gate named only in a `#` COMMENT counted as wired — `check:query-projections` was in
 *      package.json, in no run step and in no exception list, while this gate reported
 *      "96 gates, all wired".
 *   2. A workflow file that DID NOT PARSE AT ALL still reported every gate in it as wired.
 *      `ci.yml` carried a step name containing ": " — a plain YAML scalar may not — so GitHub
 *      loaded nothing from the file and all 96 gates in it were dead.
 *   3. A gate whose only mention was its own `:self-test` counted as wired, because the gate
 *      name is a prefix of it. A self-test asserts the DETECTOR against planted defects; it
 *      never reads the repository. Two backend gates were live in exactly that state.
 *
 * All three are the same shape: the evidence was text near the thing, not the thing. So the
 * matcher now walks `jobs.<id>.steps[].run` of a parsed document and compares whole shell
 * tokens. A comment, a commented-out step, a step under `if: false`, a `name:` that merely
 * mentions the gate, and an unparseable file all fail — the last of them loudly, by file and
 * parse error, because that is how an entire CI file went dead unnoticed.
 *
 * ---------------------------------------------------------------------------------------------
 * 2026-09-03 (later the same day) — PARSING IS NOT ENOUGH EITHER. THE WORKFLOW MUST BE REACHABLE.
 *
 * Ported from the backend copy, which found the fourth instance of the class. `db-gates.yml`
 * parsed, named its gates in real `run:` steps, and that gate reported all of them wired — while
 * the file carried `on: { schedule, workflow_dispatch }` and nothing else, so no push and no pull
 * request had ever run one. Its entire Actions history was ONE scheduled run, and all three jobs
 * failed at the first database step, unread.
 *
 * `run:` membership is therefore necessary and not sufficient. A workflow contributes its steps
 * only when GitHub will start it WITHOUT a human: no `on:` at all, an empty one, only
 * `workflow_dispatch`/`repository_dispatch`, a `schedule:` with no cron, or a push/pull_request
 * `branches:` filter matching no branch this repository has, each make it UNREACHABLE and fail
 * this gate by name. A job pinned `if: false` (or `if: ${{ false }}`) is a DEAD JOB and its steps
 * leave the corpus. And an UNWIRED_BY_DESIGN reason that names a workflow is checked against that
 * workflow's `run:` steps, because a reason that is not true launders a dead gate as a choice.
 *
 * `frontend.yml` fires on push to `main` and on pull request, so it is reachable and this repo's
 * numbers are unchanged by the check. It is here so the property cannot regress silently.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

const FRONTEND = fileURLToPath(new URL("..", import.meta.url));
const REPO = dirname(FRONTEND);
const WORKFLOWS = join(REPO, ".github", "workflows");

/** Sub-commands that assert nothing on their own — they emit, list or self-test. */
const HELPER = /:(self-test|fix|emit|list|baseline|write|report)$/;

/** gate -> the reason it is deliberately not in a workflow. Must be specific. */
const UNWIRED_BY_DESIGN = Object.freeze({});

/**
 * gate -> the reason it is invoked ONLY from steps that cannot fail their job.
 *
 * Added 2026-09-03 (v2 ticket 30). Until now this gate answered one question — is the gate
 * NAMED by a run: step of a reachable job — and treated that as "wired". It is not the same
 * question. A step carrying `continue-on-error: true` runs, prints, and then reports success
 * whatever it found: GitHub records the job as passing and the red is a grey annotation nobody
 * reads. Measured at head across the two repositories: 18 gate steps carried that flag, and six
 * of them exit 2 (INCONCLUSIVE, prerequisite absent) and 1 (a real defect) INDISTINGUISHABLY,
 * so a genuine finding could never fail CI. A gate that cannot fail is exactly the defect class
 * this file exists to close, and it was invisible to the file itself.
 *
 * `continue-on-error` on the JOB counts too: it makes every step in it non-blocking.
 *
 * An entry must name a MEASURED reason and an owner, the same discipline as UNWIRED_BY_DESIGN.
 * "flaky" and "not yet" are not reasons. The correct fix for a prerequisite-blocked gate is
 * usually not this list: it is to let the step distinguish exit 2 (prerequisite absent, warn)
 * from exit 1 (real finding, fail), which keeps the bite and still tolerates a missing sibling
 * checkout.
 */
/**
 * An entry is an OBJECT, not a sentence: `{ measuredAt, owner, reason }`.
 *
 * 2026-09-04 (v2 ticket 30). A prose-only entry rots invisibly, and both of the three below
 * had. `check:dead-code` claimed its one unclassified export was
 * `features/chat/chat-helpers.ts:resolveFileUrl` and named the chat lane as owner; at head the
 * gate reports `types/payroll/payout.ts:BatchFileResult` and chat's export is long resolved.
 * `check:route-bundle-budget` claimed 15 breaches with `/crm/leads` at 773117 bytes; at head it
 * is 9 breaches with `/crm/leads` at 559414. Nothing detected either: `falseReasons` walked
 * UNWIRED_BY_DESIGN only, and `staleNonBlocking` asked only whether the gate still exists, is
 * still non-blocking and is still invoked — never whether the stated defect is still real.
 *
 * Confirming a reason's NUMBERS requires running the gate, which this file cannot do. So the
 * honest static check is an expiry: `measuredAt` is when a human last ran the gate and restated
 * the entry at what it printed, and the entry FAILS once it is older than
 * MAX_REASON_AGE_DAYS. The only correct responses are to re-run the gate and restate the
 * numbers, or to delete the entry and the `continue-on-error` flag together. Bumping the date
 * without re-running is the same defect one level up.
 */
const MAX_REASON_AGE_DAYS = 90;

const NON_BLOCKING_BY_DESIGN = Object.freeze({
  // All three below were RE-MEASURED at head on 2026-09-04 (v2 ticket 30) and are RED for real
  // findings in another territory's source. A gate wired so that it always fails gets muted
  // within a week, which is worse than not wiring it -- so each stays reported, each names the
  // number that must reach zero, and none has had its baseline raised to absorb the failure.
  // The five other frontend gates that carried the flag were re-measured green or split by exit
  // code in the same change and are blocking now.
  "check:dead-code": Object.freeze({
    measuredAt: "2026-09-04",
    owner:
      "the payroll lane -- types/payroll/** is outside the gates territory, so ticket 30 may " +
      "not record the verdict itself",
    reason:
      "rc=1 at head, ONE unclassified export -- types/payroll/payout.ts:BatchFileResult, no " +
      "WIRE/KEEP verdict in EXPORT_VERDICTS. The RATCHET itself is clean (baseline files=0 " +
      "exports=0, current files=0 exports=0), so nothing was baselined away. The previously " +
      "recorded finding, features/chat/chat-helpers.ts:resolveFileUrl, is RESOLVED and this " +
      "entry named it for a day after it stopped being true. Delete this entry when the " +
      "unclassified count is zero.",
  }),
  "check:route-bundle-budget": Object.freeze({
    measuredAt: "2026-09-04",
    owner: "tickets 22/26 (route bundle work)",
    reason:
      "rc=1 at head, NINE measured breaches of declared ceilings (was 15 on 2026-09-03): " +
      "/chat measuredScriptBytes=897897 over 524288 and measuredTotalBytes=1065625 over " +
      "1048576, /build/my-work 562012, /crm/leads 559414, /support/inbox 558129, /settings " +
      "550502, /calendar 538619, /crm/inbox 529274, /parties 528750 -- all measuredScriptBytes " +
      "over 524288. These are measured bytes over declared budgets, not gate noise. Delete " +
      "this entry when the breach count is zero.",
  }),
  "check:web-vitals-budget": Object.freeze({
    measuredAt: "2026-09-04",
    owner:
      "the CRM lane for the error boundary; whoever re-runs `pnpm measure:web-vitals` for the " +
      "staleness",
    reason:
      "rc=1 at head. RE-MEASURED 2026-09-04: the gate still does not reach the budget " +
      "comparison, because the committed capture is REFUSED as evidence. contentAssertion " +
      "reports 16 unusable samples on /crm/leads and its own verdict reads \"capture is NOT " +
      "usable evidence\"; provenance is STALE -- the capture measured build " +
      "HLbxAqjmWOjuFHatusviu and .next/BUILD_ID on disk is 7Yy5Jkr9TTQ62Z-MCOSvH -- so every " +
      "number in it describes a build this checkout does not hold. The gate previously read " +
      "none of the five verdict blocks and published that error page's LCP as a budget met. " +
      "Note the hermetic half, `check:web-vitals-budget:self-test`, is a SEPARATE step and is " +
      "BLOCKING. Delete this entry when a fresh capture passes its own five verdicts.",
  }),
});

/** The prose of an entry, whichever registry shape it came from. */
export function reasonText(entry) {
  if (typeof entry === "string") return entry;
  if (entry !== null && typeof entry === "object" && typeof entry.reason === "string") return entry.reason;
  return "";
}

/**
 * Every way a NON_BLOCKING_BY_DESIGN entry can be untrustworthy on its face. Pure, so the
 * self-test asserts it against planted entries instead of against the live registry.
 */
export function auditNonBlockingRegistry(registry, now, maxAgeDays = MAX_REASON_AGE_DAYS) {
  const problems = [];
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (const [gate, entry] of Object.entries(registry)) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      problems.push(
        `${gate} — its entry is ${Array.isArray(entry) ? "an array" : typeof entry}, not ` +
          "{ measuredAt, owner, reason }. A bare sentence carries no date, so nothing can tell " +
          "whether it is still true.",
      );
      continue;
    }
    const { measuredAt, owner, reason } = entry;
    if (typeof owner !== "string" || owner.trim() === "")
      problems.push(`${gate} — its entry names no owner. "6 remain with named owners" is the whole contract.`);
    if (typeof reason !== "string" || reason.trim() === "")
      problems.push(`${gate} — its entry states no reason.`);
    if (typeof measuredAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(measuredAt)) {
      problems.push(`${gate} — measuredAt is ${JSON.stringify(measuredAt)}, not an ISO YYYY-MM-DD date.`);
      continue;
    }
    const measured = new Date(`${measuredAt}T00:00:00Z`);
    if (Number.isNaN(measured.getTime())) {
      problems.push(`${gate} — measuredAt "${measuredAt}" is not a real date.`);
      continue;
    }
    const ageDays = Math.floor((today.getTime() - measured.getTime()) / 86400000);
    if (ageDays < 0) {
      problems.push(`${gate} — measuredAt "${measuredAt}" is in the future, so it records no measurement.`);
      continue;
    }
    if (ageDays > maxAgeDays)
      problems.push(
        `${gate} — its reason was last measured on ${measuredAt}, ${ageDays} days ago (limit ` +
          `${maxAgeDays}). Re-run the gate and restate the entry at the numbers it prints, or ` +
          "delete the entry and the `continue-on-error` flag together. Bumping the date without " +
          "re-running is the defect one level up.",
      );
  }
  return problems.sort();
}

/**
 * A reason that names a workflow file makes a factual claim about that file. Applies to BOTH
 * registries: an entry saying "runs in db-gates.yml" when db-gates.yml has never heard of the
 * gate launders a dead gate as a choice, whichever list it sits in.
 *
 * A named workflow satisfies the claim if any run: step there invokes the gate OR one of its
 * sub-commands (`check:alert-ack` is legitimately described by "ci.yml names the self-test
 * only"). What it may not do is name a file that has never heard of the gate at all.
 */
export function findFalseReasons(registry, tokensByFile) {
  const out = [];
  for (const [gate, entry] of Object.entries(registry)) {
    const reason = reasonText(entry);
    for (const named of new Set(reason.match(/[A-Za-z0-9._-]+\.ya?ml/g) ?? [])) {
      const tokens = tokensByFile.get(named);
      if (tokens === undefined) {
        out.push(`${gate} — its reason names ${named}, which is not a workflow file here`);
        continue;
      }
      const mentioned = [...tokens].some((t) => t === gate || t.startsWith(`${gate}:`));
      if (!mentioned)
        out.push(`${gate} — its reason points at ${named}, and no run: step there names the gate in any form`);
    }
  }
  return out;
}


/**
 * Anti-vacuity floors. A matcher that suddenly resolves nothing must FAIL, not congratulate
 * itself on zero unwired gates. Re-measured 2026-09-03 with the reachability check in place:
 * 34 gates, 6 jobs, 47 run steps in the single workflow file, all 1 reachable. The floors sit
 * roughly 25% below each, so a legitimate deletion does not trip them but a matcher that stops
 * resolving does — including the new way of resolving nothing, which is the workflow being
 * ruled unreachable.
 */
const MIN_GATES = 30;
const MIN_JOBS = 4;
const MIN_RUN_STEPS = 35;

/**
 * Events GitHub starts on its own. `workflow_dispatch` and `repository_dispatch` are
 * deliberately absent: they need a human (or an external caller) to press the button, and a
 * gate nobody presses is not a gate. `workflow_call` is absent for the same reason at one
 * remove — the caller decides, and the caller is checked on its own terms.
 */
const AUTOMATIC_EVENTS = new Set([
  "push",
  "pull_request",
  "pull_request_target",
  "schedule",
  "merge_group",
  "release",
  "issue_comment",
  "issues",
  "check_run",
  "check_suite",
  "create",
  "delete",
  "deployment",
  "deployment_status",
  "fork",
  "label",
  "milestone",
  "page_build",
  "project",
  "project_card",
  "project_column",
  "public",
  "pull_request_review",
  "pull_request_review_comment",
  "registry_package",
  "status",
  "watch",
  "workflow_run",
]);

/** Events whose `branches:` / `branches-ignore:` filter decides whether they can ever fire. */
const BRANCH_FILTERED = new Set(["push", "pull_request", "pull_request_target"]);

/**
 * This repository's branch names, used to answer "can this `branches:` filter ever match?".
 * The default branch is always in the set; git supplies the rest when it can. A filter that
 * matches nothing here is reported, so the set erring wide is the safe direction.
 */
export function knownBranchNames(repo) {
  const names = new Set(["main"]);
  for (const v of [process.env.GITHUB_REF_NAME, process.env.GITHUB_BASE_REF, process.env.GITHUB_HEAD_REF])
    if (typeof v === "string" && v) names.add(v);
  try {
    const out = execFileSync(
      "git",
      ["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"],
      { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    for (const raw of out.split("\n")) {
      const name = raw.trim();
      if (!name || name.endsWith("/HEAD")) continue;
      names.add(name);
      const slash = name.indexOf("/");
      if (slash > 0) names.add(name.slice(slash + 1));
    }
  } catch {
    // No git, or no refs. The default branch alone still answers the common filters.
  }
  return names;
}

/** GitHub filter-pattern match: `**` crosses `/`, `*` and `?` do not. */
export function matchesFilterPattern(pattern, name) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        re += ".*";
        i++;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`).test(name);
}

/** True when a `branches:` / `branches-ignore:` list lets at least one known branch through. */
export function branchFilterCanMatch(list, knownBranches, isIgnore) {
  if (list === undefined || list === null) return true;
  const patterns = (Array.isArray(list) ? list : [list]).filter((p) => typeof p === "string");
  if (patterns.length === 0) return false;
  for (const branch of knownBranches) {
    let allowed = isIgnore;
    for (const pattern of patterns) {
      const negated = pattern.startsWith("!");
      const body = negated ? pattern.slice(1) : pattern;
      if (!matchesFilterPattern(body, branch)) continue;
      allowed = isIgnore ? negated : !negated;
    }
    if (allowed) return true;
  }
  return false;
}

/** Can this one event ever start the workflow by itself? Returns null when it can. */
export function eventCannotFire(event, config, knownBranches) {
  if (!AUTOMATIC_EVENTS.has(event)) return `${event} needs a human or an external caller`;
  // `schedule:` is the one event whose bare form fires nothing: it is a list of crons, so an
  // absent or empty list is a trigger that can never come round. Checked before the null guard
  // below, which is otherwise correct — `pull_request:` with no body fires on every PR.
  if (event === "schedule") return "schedule carries no cron entry";
  if (config === null || config === undefined) return null;
  if (typeof config !== "object" || Array.isArray(config)) return null;

  if (Array.isArray(config.types) && config.types.length === 0)
    return `${event} declares an empty types: list`;

  if (BRANCH_FILTERED.has(event)) {
    if (!branchFilterCanMatch(config.branches, knownBranches, false))
      return `${event} branches: ${JSON.stringify(config.branches)} matches no branch in this repository`;
    if (!branchFilterCanMatch(config["branches-ignore"], knownBranches, true))
      return `${event} branches-ignore: ${JSON.stringify(config["branches-ignore"])} excludes every branch in this repository`;
  }
  return null;
}

/**
 * Why, or whether, GitHub will ever start this workflow without a human.
 * Returns `{ fires: true }` or `{ fires: false, reason }`.
 */
export function workflowReachability(wf, knownBranches) {
  const triggers = wf.on !== undefined ? wf.on : wf.true;
  if (triggers === null || triggers === undefined)
    return { fires: false, reason: "declares no `on:` triggers, so GitHub never starts it" };

  let entries;
  if (typeof triggers === "string") entries = [[triggers, null]];
  else if (Array.isArray(triggers)) entries = triggers.map((e) => [String(e), null]);
  else if (typeof triggers === "object") entries = Object.entries(triggers);
  else return { fires: false, reason: `\`on:\` is ${typeof triggers}, which declares no trigger` };

  if (entries.length === 0)
    return { fires: false, reason: "declares an empty `on:` block, so GitHub never starts it" };

  const blocked = [];
  for (const [event, config] of entries) {
    const scheduleWithCron =
      event === "schedule" &&
      Array.isArray(config) &&
      config.some((e) => e !== null && typeof e === "object" && typeof e.cron === "string" && e.cron.trim());
    if (scheduleWithCron) return { fires: true };
    const why = eventCannotFire(event, config, knownBranches);
    if (why === null) return { fires: true };
    blocked.push(why);
  }
  return {
    fires: false,
    reason: `no trigger can fire automatically — ${blocked.join("; ")}`,
  };
}

/**
 * A job or step pinned off. `if: false` parses as a boolean; `if: ${{ false }}` does not, and
 * that spelling is how a step stays in the file while never executing.
 */
export function isAlwaysFalse(value) {
  if (value === false) return true;
  if (typeof value !== "string") return false;
  const inner = value
    .trim()
    .replace(/^\$\{\{/, "")
    .replace(/\}\}$/, "")
    .trim()
    .toLowerCase();
  return inner === "false";
}

/**
 * Step names whose plain scalar contains ": ". Kept only to EXPLAIN a parse failure — the
 * parser is the authority on whether a file loads, and this rule can only recognise the one
 * malformation that has already bitten us.
 */
export function unquotedColonInName(file, text) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    const m = /^\s*(?:-\s+)?name:\s+(.*)$/.exec(line);
    if (!m) return;
    const value = m[1].replace(/\s+#.*$/, "").trim();
    if (!value || value.startsWith('"') || value.startsWith("'") || value.startsWith("|") || value.startsWith(">"))
      return;
    if (/:\s/.test(value)) out.push({ file, line: i + 1, text: line.trim() });
  });
  return out;
}

/**
 * Does this `continue-on-error:` value stop the step from failing its job?
 *
 * `true` and the string "true" plainly do. An EXPRESSION (`${{ github.event_name == 'push' }}`)
 * is answered conservatively as YES, because this gate must not certify a step as blocking on
 * the strength of a condition it cannot evaluate — the safe direction here is to demand a
 * registered reason, not to assume the step bites.
 */
export function isContinueOnError(value) {
  if (value === undefined || value === null || value === false) return false;
  if (value === true) return true;
  if (typeof value !== "string") return false;
  const inner = value.trim().replace(/^\$\{\{/, "").replace(/\}\}$/, "").trim().toLowerCase();
  return inner !== "false";
}

/** Whole shell tokens of a `run:` block — `a && b`, `a | b`, `a; b`, newlines, all split. */
export function shellTokens(run) {
  return run
    .split(/[\s;|&()]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Walk parsed workflows and return every executable `run:` step, plus every reason a file
 * could not be walked. A file that does not parse yields an error, never an empty success.
 */
export function collectRunSteps(files, knownBranches = new Set(["main"])) {
  const runs = [];
  const declaredRuns = [];
  const errors = [];
  const jobIds = [];
  const unreachable = [];
  const deadJobs = [];

  for (const { file, text } of files) {
    const doc = parseDocument(text, { prettyErrors: true });
    if (doc.errors.length > 0) {
      const first = doc.errors[0];
      const at = first.linePos?.[0] ? `${first.linePos[0].line}:${first.linePos[0].col}` : "?";
      errors.push({
        file,
        message: `${at} — ${first.message.split("\n")[0]}`,
        hints: unquotedColonInName(file, text),
      });
      continue;
    }

    let wf;
    try {
      wf = doc.toJS();
    } catch (err) {
      errors.push({ file, message: err instanceof Error ? err.message : String(err), hints: [] });
      continue;
    }

    if (wf === null || typeof wf !== "object" || Array.isArray(wf)) {
      errors.push({ file, message: "parses, but not as a mapping — it defines no workflow.", hints: [] });
      continue;
    }
    if (wf.jobs === null || typeof wf.jobs !== "object" || Array.isArray(wf.jobs)) {
      errors.push({ file, message: "parses, but has no `jobs:` mapping — nothing in it can run.", hints: [] });
      continue;
    }

    const reach = workflowReachability(wf, knownBranches);

    // Recorded for every parsed file, reachable or not: it is the evidence an exception's
    // stated reason is checked against, and a claim about a dead file must still be testable.
    for (const [jobId, job] of Object.entries(wf.jobs)) {
      if (job === null || typeof job !== "object" || Array.isArray(job)) continue;
      if (!Array.isArray(job.steps)) continue;
      for (const step of job.steps) {
        if (step === null || typeof step !== "object" || Array.isArray(step)) continue;
        if (typeof step.run === "string") declaredRuns.push({ file, job: jobId, run: step.run });
      }
    }

    if (!reach.fires) {
      unreachable.push({ file, reason: reach.reason });
      continue;
    }

    for (const [jobId, job] of Object.entries(wf.jobs)) {
      if (job !== null && typeof job === "object" && !Array.isArray(job) && isAlwaysFalse(job.if)) {
        deadJobs.push({ file, job: jobId });
        continue;
      }
      jobIds.push(`${file}:${jobId}`);
      if (job === null || typeof job !== "object" || Array.isArray(job)) continue;
      // A `uses:` job calls a reusable workflow and has no steps of its own; that is not an error.
      if (!Array.isArray(job.steps)) continue;
      for (const step of job.steps) {
        if (step === null || typeof step !== "object" || Array.isArray(step)) continue;
        if (typeof step.run !== "string") continue;
        // `if: false` is a step pinned off. It is in the file and it never executes.
        if (isAlwaysFalse(step.if)) continue;
        // A step that cannot fail its job is not a gate, however well it is wired. The job's
        // own flag makes every step under it non-blocking, so both levels are consulted.
        const nonBlocking =
          isContinueOnError(step["continue-on-error"]) || isContinueOnError(job["continue-on-error"]);
        runs.push({
          file,
          job: jobId,
          name: typeof step.name === "string" ? step.name : "(unnamed)",
          run: step.run,
          nonBlocking,
        });
      }
    }
  }

  return { runs, declaredRuns, errors, jobIds, unreachable, deadJobs };
}

function main() {
  const scripts = JSON.parse(readFileSync(join(FRONTEND, "package.json"), "utf8")).scripts ?? {};
  const gates = Object.keys(scripts).filter((n) => n.startsWith("check:") && !HELPER.test(n));

  const files = readdirSync(WORKFLOWS)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => ({ file: f, text: readFileSync(join(WORKFLOWS, f), "utf8") }));

  const knownBranches = knownBranchNames(REPO);
  const { runs, declaredRuns, errors, jobIds, unreachable, deadJobs } = collectRunSteps(
    files,
    knownBranches,
  );

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`  UNPARSEABLE WORKFLOW: .github/workflows/${e.file} — ${e.message}`);
      console.error("    GitHub loads nothing from this file, so every gate it names is DEAD.");
      for (const h of e.hints)
        console.error(`    hint ${h.file}:${h.line} — a step name containing ": " must be quoted.\n      ${h.text}`);
    }
    console.error(`\ncheck-gate-wiring: ${errors.length} workflow file(s) do not parse.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error("check-gate-wiring: read no workflow files — the scan is broken, not the repo.");
    process.exit(1);
  }
  if (gates.length < MIN_GATES) {
    console.error(`check-gate-wiring: resolved only ${gates.length} gates (floor ${MIN_GATES}) — the scan is broken, not the repo.`);
    process.exit(1);
  }
  if (jobIds.length < MIN_JOBS) {
    console.error(`check-gate-wiring: resolved only ${jobIds.length} jobs (floor ${MIN_JOBS}) — the scan is broken, not the repo.`);
    process.exit(1);
  }
  if (runs.length < MIN_RUN_STEPS) {
    console.error(`check-gate-wiring: resolved only ${runs.length} run steps (floor ${MIN_RUN_STEPS}) — the scan is broken, not the repo.`);
    process.exit(1);
  }

  const invoked = new Set();
  const blocking = new Set();
  for (const step of runs)
    for (const token of shellTokens(step.run)) {
      invoked.add(token);
      if (!step.nonBlocking) blocking.add(token);
    }

  // Whole tokens per file, across every parsed workflow including the unreachable ones. An
  // exception that names a workflow is checked against this, not against prose.
  const tokensByFile = new Map();
  for (const step of declaredRuns) {
    let set = tokensByFile.get(step.file);
    if (!set) tokensByFile.set(step.file, (set = new Set()));
    for (const token of shellTokens(step.run)) set.add(token);
  }

  const unwired = gates.filter((g) => !invoked.has(g) && !(g in UNWIRED_BY_DESIGN));

  // Wired, reachable, and unable to fail. Every invocation of the gate sits in a step (or a job)
  // carrying `continue-on-error`, so CI runs it and then reports success regardless.
  const nonBlocking = gates.filter(
    (g) => invoked.has(g) && !blocking.has(g) && !(g in UNWIRED_BY_DESIGN) && !(g in NON_BLOCKING_BY_DESIGN),
  );
  const staleNonBlocking = Object.keys(NON_BLOCKING_BY_DESIGN).filter(
    (g) => !gates.includes(g) || blocking.has(g) || !invoked.has(g),
  );
  const staleExceptions = Object.keys(UNWIRED_BY_DESIGN).filter(
    (g) => !gates.includes(g) || invoked.has(g),
  );

  // A reason that says "runs in <file>.yml" is a factual claim. Both entries this check was
  // written for — `check:declaration-column-drift` and `check:declaration-constraint-drift` —
  // claimed db-gates.yml ran them and db-gates.yml never named either. A reason that is not
  // true is worse than no exception: it launders a dead gate as a choice.
  //
  // 2026-09-04 (v2 ticket 30): this walked UNWIRED_BY_DESIGN only, so the three
  // NON_BLOCKING_BY_DESIGN reasons — the ones that mute a gate that CAN fail — were the only
  // exception prose in the file nothing checked at all. It walks both now.
  const falseReasons = [
    ...findFalseReasons(UNWIRED_BY_DESIGN, tokensByFile),
    ...findFalseReasons(NON_BLOCKING_BY_DESIGN, tokensByFile),
  ];

  // And the part no static check can reach: whether the NUMBERS in a non-blocking reason are
  // still what the gate prints. Enforced as an expiry on `measuredAt`.
  const rottedReasons = auditNonBlockingRegistry(NON_BLOCKING_BY_DESIGN, new Date());

  for (const w of unreachable)
    console.error(
      `  UNREACHABLE WORKFLOW: .github/workflows/${w.file} — ${w.reason}.\n` +
        "    Every gate named only here is dead, whatever the file says.",
    );
  for (const j of deadJobs)
    console.error(
      `  DEAD JOB: .github/workflows/${j.file}:${j.job} — pinned \`if: false\`, so it never runs.`,
    );
  for (const f of falseReasons) console.error(`  FALSE EXCEPTION REASON: ${f}.`);
  for (const f of rottedReasons) console.error(`  UNVERIFIABLE NON-BLOCKING REASON: ${f}`);
  for (const g of staleExceptions)
    console.error(`  STALE EXCEPTION: ${g} — it is wired now, or no longer exists. Remove the entry.`);
  for (const g of unwired)
    console.error(`  UNWIRED: ${g} — no run: step of any reachable job invokes it, so it can never run.`);
  for (const g of nonBlocking)
    console.error(
      `  CANNOT FAIL: ${g} — every step invoking it carries \`continue-on-error\`, so CI reports ` +
        "success whatever it finds. Remove the flag, or split exit 2 (prerequisite absent) from " +
        "exit 1 (real finding), or register it in NON_BLOCKING_BY_DESIGN with a measured reason.",
    );
  for (const g of staleNonBlocking)
    console.error(
      `  STALE NON-BLOCKING EXCEPTION: ${g} — it is blocking now, unwired, or no longer exists. Remove the entry.`,
    );

  if (
    unwired.length ||
    nonBlocking.length ||
    staleNonBlocking.length ||
    staleExceptions.length ||
    unreachable.length ||
    deadJobs.length ||
    falseReasons.length ||
    rottedReasons.length
  ) {
    console.error(
      `\ncheck-gate-wiring: ${unwired.length} unwired, ${nonBlocking.length} cannot-fail, ` +
        `${staleNonBlocking.length} stale non-blocking, ${staleExceptions.length} stale, ` +
        `${falseReasons.length} false reason(s), ${rottedReasons.length} unverifiable ` +
        `non-blocking reason(s), ${unreachable.length} unreachable workflow(s), ` +
        `${deadJobs.length} dead job(s) ` +
        `(searched ${runs.length} run steps across ${jobIds.length} jobs in ${files.length} workflow files).\n` +
        `Wire it into a run: step of a workflow GitHub starts on its own, or add it to ` +
        `UNWIRED_BY_DESIGN with a reason that is true.`,
    );
    process.exit(1);
  }
  const blockingGates = gates.filter((g) => blocking.has(g)).length;
  console.log(
    `check-gate-wiring: ${gates.length} gates, ${blockingGates} of them able to FAIL the job ` +
      `(${Object.keys(NON_BLOCKING_BY_DESIGN).length} registered non-blocking), ` +
      `all invoked by a run: step of a reachable job ` +
      `(${runs.length} run steps across ${jobIds.length} jobs in ${files.length} workflow files, ` +
      `all ${files.length} reachable, ${Object.keys(UNWIRED_BY_DESIGN).length} deliberate exceptions).`,
  );
}

/**
 * Self-test. Added 2026-09-03 (v2 ticket 30).
 *
 * This gate had none — the gate that decides whether every other gate can run was itself
 * unproven, which is the recursion this file's own header spends forty lines warning about.
 * Every case below plants a defect in a synthetic workflow document and asserts the SPECIFIC
 * verdict, never merely a non-zero exit.
 */
export function runSelfTest() {
  const failures = [];
  let passed = 0;
  const assert = (label, condition) => {
    if (condition) passed++;
    else failures.push(label);
  };

  const wf = (body) => [{ file: "t.yml", text: body }];
  const REACHABLE = "on:\n  push:\n    branches: [main]\n";
  const known = new Set(["main"]);

  // --- the corpus is collected at all ---
  const basic = collectRunSteps(
    wf(`${REACHABLE}jobs:\n  a:\n    steps:\n      - run: pnpm run check:one\n`),
    known,
  );
  assert("a reachable job's run step is collected", basic.runs.length === 1);
  assert("the collected step is not marked non-blocking by default", basic.runs[0].nonBlocking === false);
  assert("no spurious parse error on a well-formed file", basic.errors.length === 0);

  // --- continue-on-error, the rule this self-test was written for ---
  const stepFlag = collectRunSteps(
    wf(`${REACHABLE}jobs:\n  a:\n    steps:\n      - run: pnpm run check:one\n        continue-on-error: true\n`),
    known,
  );
  assert("a step-level continue-on-error marks the step non-blocking", stepFlag.runs[0].nonBlocking === true);

  const jobFlag = collectRunSteps(
    wf(`${REACHABLE}jobs:\n  a:\n    continue-on-error: true\n    steps:\n      - run: pnpm run check:one\n      - run: pnpm run check:two\n`),
    known,
  );
  assert(
    "a JOB-level continue-on-error marks EVERY step under it non-blocking",
    jobFlag.runs.length === 2 && jobFlag.runs.every((r) => r.nonBlocking === true),
  );

  const falseFlag = collectRunSteps(
    wf(`${REACHABLE}jobs:\n  a:\n    steps:\n      - run: pnpm run check:one\n        continue-on-error: false\n`),
    known,
  );
  assert("an explicit continue-on-error: false stays BLOCKING", falseFlag.runs[0].nonBlocking === false);

  assert("continue-on-error absent is blocking", isContinueOnError(undefined) === false);
  assert("continue-on-error: false is blocking", isContinueOnError(false) === false);
  assert('continue-on-error: "false" is blocking', isContinueOnError("false") === false);
  assert('an expression ${{ false }} is blocking', isContinueOnError("${{ false }}") === false);
  assert("continue-on-error: true is non-blocking", isContinueOnError(true) === true);
  assert(
    "an EXPRESSION this gate cannot evaluate is answered conservatively as non-blocking",
    isContinueOnError("${{ github.event_name == 'push' }}") === true,
  );

  // --- the three historical defects named in this file's header ---
  const comment = collectRunSteps(
    wf(`${REACHABLE}jobs:\n  a:\n    steps:\n      # pnpm run check:ghost\n      - run: pnpm run check:one\n`),
    known,
  );
  const commentTokens = new Set(comment.runs.flatMap((r) => shellTokens(r.run)));
  assert("a gate named only in a COMMENT is not counted as wired", commentTokens.has("check:ghost") === false);

  const unparseable = collectRunSteps(wf(`${REACHABLE}jobs:\n  a:\n    steps:\n      - name: A step: with a colon\n        run: pnpm run check:one\n`), known);
  assert("an unparseable workflow is an ERROR, never an empty success", unparseable.errors.length === 1);
  assert("an unparseable workflow contributes no run steps", unparseable.runs.length === 0);

  const selfTestOnly = collectRunSteps(
    wf(`${REACHABLE}jobs:\n  a:\n    steps:\n      - run: pnpm run check:one:self-test\n`),
    known,
  );
  const stTokens = new Set(selfTestOnly.runs.flatMap((r) => shellTokens(r.run)));
  assert(
    "a gate whose ONLY invocation is its own :self-test is not counted as wired",
    stTokens.has("check:one:self-test") === true && stTokens.has("check:one") === false,
  );

  // --- reachability and dead jobs ---
  const dispatchOnly = collectRunSteps(
    wf("on:\n  workflow_dispatch:\njobs:\n  a:\n    steps:\n      - run: pnpm run check:one\n"),
    known,
  );
  assert("a workflow_dispatch-only workflow is UNREACHABLE", dispatchOnly.unreachable.length === 1);
  assert("an unreachable workflow contributes no run steps", dispatchOnly.runs.length === 0);
  assert(
    "an unreachable workflow's steps are still recorded for exception-checking",
    dispatchOnly.declaredRuns.length === 1,
  );

  const cronless = collectRunSteps(
    wf("on:\n  schedule:\njobs:\n  a:\n    steps:\n      - run: pnpm run check:one\n"),
    known,
  );
  assert("a schedule with no cron is UNREACHABLE", cronless.unreachable.length === 1);

  const withCron = collectRunSteps(
    wf('on:\n  schedule:\n    - cron: "0 3 * * *"\njobs:\n  a:\n    steps:\n      - run: pnpm run check:one\n'),
    known,
  );
  assert("a schedule WITH a cron is reachable", withCron.runs.length === 1);

  const deadJob = collectRunSteps(
    wf(`${REACHABLE}jobs:\n  a:\n    if: \${{ false }}\n    steps:\n      - run: pnpm run check:one\n`),
    known,
  );
  assert("a job pinned if: false is a DEAD JOB", deadJob.deadJobs.length === 1);
  assert("a dead job contributes no run steps", deadJob.runs.length === 0);

  const deadStep = collectRunSteps(
    wf(`${REACHABLE}jobs:\n  a:\n    steps:\n      - if: false\n        run: pnpm run check:one\n      - run: pnpm run check:two\n`),
    known,
  );
  assert("a step pinned if: false leaves the corpus", deadStep.runs.length === 1);

  const noBranch = collectRunSteps(
    wf("on:\n  push:\n    branches: [does-not-exist]\njobs:\n  a:\n    steps:\n      - run: pnpm run check:one\n"),
    known,
  );
  assert("a branches: filter matching no branch is UNREACHABLE", noBranch.unreachable.length === 1);

  // --- token splitting ---
  assert(
    "a && chain splits into whole tokens",
    (() => {
      const t = shellTokens("pnpm run check:a:self-test && pnpm run check:a");
      return t.includes("check:a") && t.includes("check:a:self-test");
    })(),
  );
  assert(
    "a gate name that is a PREFIX of another does not match it",
    shellTokens("pnpm run check:one-more").includes("check:one") === false,
  );

  // --- a non-blocking reason that has quietly stopped being true ---
  // 2026-09-04 (v2 ticket 30). Two of the three live entries had rotted — wrong file, wrong
  // owner, wrong breach count — and every check in this file passed over them, because
  // `staleNonBlocking` asks only whether the gate still exists and is still muted.
  const NOW = new Date("2026-09-04T00:00:00Z");
  const freshEntry = {
    "check:x": { measuredAt: "2026-08-20", owner: "the x lane", reason: "rc=1, 9 breaches" },
  };
  assert(
    "a dated, owned, freshly measured entry passes the audit",
    auditNonBlockingRegistry(freshEntry, NOW, 90).length === 0,
  );

  const staleEntry = {
    "check:x": { measuredAt: "2026-01-01", owner: "the x lane", reason: "rc=1, 9 breaches" },
  };
  const staleProblems = auditNonBlockingRegistry(staleEntry, NOW, 90);
  assert("an entry measured longer ago than the limit is reported", staleProblems.length === 1);
  assert(
    "the stale report names the gate, the date and the age, not just 'stale'",
    (staleProblems[0] ?? "").includes("check:x") &&
      (staleProblems[0] ?? "").includes("2026-01-01") &&
      (staleProblems[0] ?? "").includes("246 days ago"),
  );
  assert(
    "an entry exactly at the limit is still accepted, so the boundary is not off by one",
    auditNonBlockingRegistry({ "check:x": { measuredAt: "2026-06-06", owner: "o", reason: "r" } }, NOW, 90).length === 0,
  );
  assert(
    "one day past the limit is reported",
    auditNonBlockingRegistry({ "check:x": { measuredAt: "2026-06-05", owner: "o", reason: "r" } }, NOW, 90).length === 1,
  );

  // The shape that rotted: prose with no date at all.
  assert(
    "a bare-string entry is rejected — a sentence carries no date, so nothing can age it out",
    auditNonBlockingRegistry({ "check:x": "rc=1 at head, 15 breaches" }, NOW, 90).length === 1,
  );
  assert(
    "an entry with no owner is rejected",
    auditNonBlockingRegistry({ "check:x": { measuredAt: "2026-08-20", reason: "r" } }, NOW, 90).some((m) =>
      m.includes("names no owner"),
    ),
  );
  assert(
    "an entry with no reason is rejected",
    auditNonBlockingRegistry({ "check:x": { measuredAt: "2026-08-20", owner: "o" } }, NOW, 90).some((m) =>
      m.includes("states no reason"),
    ),
  );
  assert(
    "a measuredAt that is not an ISO date is rejected",
    auditNonBlockingRegistry({ "check:x": { measuredAt: "last week", owner: "o", reason: "r" } }, NOW, 90).length === 1,
  );
  assert(
    "a measuredAt in the FUTURE is rejected — it records no measurement",
    auditNonBlockingRegistry({ "check:x": { measuredAt: "2027-01-01", owner: "o", reason: "r" } }, NOW, 90).some((m) =>
      m.includes("in the future"),
    ),
  );

  // --- an exception reason that names a workflow, in EITHER registry ---
  const tokens = new Map([
    ["a.yml", new Set(["check:one"])],
    ["b.yml", new Set(["check:two"])],
  ]);
  assert(
    "a NON_BLOCKING reason pointing at a workflow that never names the gate is a false reason",
    findFalseReasons({ "check:one": { measuredAt: "2026-09-04", owner: "o", reason: "muted in b.yml" } }, tokens)
      .length === 1,
  );
  assert(
    "a NON_BLOCKING reason pointing at a workflow that DOES name the gate is accepted",
    findFalseReasons({ "check:one": { measuredAt: "2026-09-04", owner: "o", reason: "muted in a.yml" } }, tokens)
      .length === 0,
  );
  assert(
    "a reason naming a workflow file that does not exist here is a false reason",
    findFalseReasons({ "check:one": { measuredAt: "2026-09-04", owner: "o", reason: "runs in ghost.yml" } }, tokens)
      .length === 1,
  );
  assert(
    "findFalseReasons still reads a bare-string UNWIRED_BY_DESIGN reason",
    findFalseReasons({ "check:one": "muted in b.yml" }, tokens).length === 1,
  );
  assert("reasonText reads a string entry", reasonText("plain") === "plain");
  assert("reasonText reads an object entry", reasonText({ reason: "obj" }) === "obj");

  // --- control: every entry SHIPPED in this file is dated, owned and inside the window ---
  assert(
    "the live NON_BLOCKING_BY_DESIGN registry passes its own audit today",
    auditNonBlockingRegistry(NON_BLOCKING_BY_DESIGN, new Date()).length === 0,
  );

  // --- control: the real repository still passes, so a self-test cannot go green
  //     on fixtures while the live corpus is broken ---
  assert(
    "the real workflow corpus parses with no errors",
    (() => {
      const real = readdirSync(WORKFLOWS)
        .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
        .map((f) => ({ file: f, text: readFileSync(join(WORKFLOWS, f), "utf8") }));
      if (real.length === 0) return false;
      return collectRunSteps(real, knownBranchNames(REPO)).errors.length === 0;
    })(),
  );

  if (failures.length > 0) {
    for (const f of failures) console.error(`  FAIL: ${f}`);
    console.error(`check-gate-wiring self-tests: ${failures.length} failed, ${passed} passed`);
    process.exit(1);
  }
  console.log(`check-gate-wiring self-tests: ${passed} passed`);
  process.exit(0);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  if (process.argv.includes("--self-test")) runSelfTest();
  main();
}
