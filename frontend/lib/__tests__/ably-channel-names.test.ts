import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";
import {
  ABLY_CELL_ID,
  cellPrefixed,
  chatChannelName,
  chatPresenceChannelName,
  huddleChannelName,
  huddleSignalChannelName,
  notificationsChannelName,
  supportChannelName,
} from "../ably-channels";

/**
 * One Ably channel namespace, mirrored across the two repositories.
 *
 * Backend commit 5ac74c398 moved every Ably channel behind a cell prefix:
 * `chat:${orgId}:${channelId}` became `cell:legacy-1:chat:${orgId}:${channelId}`
 * in both the capability the token grants AND the channel the server publishes
 * on. The frontend was never updated. Thirteen call sites still asked Ably for
 * the pre-5ac74c398 names, which the token does not authorise, so every chat,
 * huddle, notification and support subscription was refused with a 403 that
 * `safeSubscribe` swallows — no inbound message, edit, deletion, reaction or
 * typing indicator reached an open window, and nothing in the UI said so.
 *
 * Three things have to hold, and the first two are asserted from the backend
 * source rather than from a copy of it:
 *   FORMULA    the frontend's prefix is the backend's own `cellPrefixed`
 *              formula, evaluated at the backend's own default cell id.
 *   NAMESPACES every namespace the backend prefixes has a frontend builder,
 *              and that builder emits the prefix.
 *   NO LITERALS no frontend file hands `ably.channels.get()` a channel name
 *              built inline. A literal is how the drift got in and is the only
 *              way it can come back.
 *
 * ANTI-VACUITY. Every reader of foreign source carries a floor. A regex that
 * silently stops matching reports "no drift", and this repository has confirmed
 * instances of a gate passing over code it never read.
 */

const MEASURED_NAMESPACE_FLOOR = 5;
const MEASURED_CALLSITE_FLOOR = 10;

const BACKEND_NAMESPACE = backendPath(
  "src",
  "common",
  "cell-transport",
  "cell-channel-namespace.ts",
);
const BACKEND_PLACEMENT = backendPath("src", "common", "region", "placement.ts");
const BACKEND_ABLY_SERVICE = backendPath(
  "src",
  "modules",
  "realtime",
  "ably.service.ts",
);

function firstGroup(match: RegExpExecArray | null, what: string): string {
  const value = match?.[1];
  if (value === undefined) throw new Error(`${what} not found`);
  return value;
}

function readBackendTemplate(file: string, fnName: string): string {
  const source = fs.readFileSync(file, "utf8");
  const pattern = new RegExp(
    `export function ${fnName}\\([^)]*\\): string \\{\\s*return \`([^\`]+)\`;`,
  );
  return firstGroup(pattern.exec(source), `${fnName} template in ${file}`);
}

/** The backend's `cellPrefixed`, re-derived from the backend's own source text. */
function backendCellPrefixed(cellId: string, channel: string): string {
  const prefixTemplate = readBackendTemplate(
    BACKEND_NAMESPACE,
    "cellChannelPrefix",
  );
  const prefixedTemplate = readBackendTemplate(BACKEND_NAMESPACE, "cellPrefixed");
  // FORMULA anti-vacuity: both templates must still be interpolations, or the
  // substitutions below would "agree" with anything.
  expect(prefixTemplate).toContain("${cellId}");
  expect(prefixedTemplate).toContain("${cellChannelPrefix(cellId)}");
  expect(prefixedTemplate).toContain("${channel}");

  const prefix = prefixTemplate.replace("${cellId}", cellId);
  return prefixedTemplate
    .replace("${cellChannelPrefix(cellId)}", prefix)
    .replace("${channel}", channel);
}

function backendLegacyCellId(): string {
  const source = fs.readFileSync(BACKEND_PLACEMENT, "utf8");
  return firstGroup(
    /export const LEGACY_CELL_ID = "([^"]+)";/.exec(source),
    `LEGACY_CELL_ID in ${BACKEND_PLACEMENT}`,
  );
}

/** Every channel namespace the backend routes through `cellPrefixed`. */
function backendPrefixedNamespaces(): string[] {
  const source = fs.readFileSync(BACKEND_ABLY_SERVICE, "utf8");
  const found = new Set<string>();
  for (const match of source.matchAll(
    /cellPrefixed\(\s*this\.cellId,\s*`([^`]+)`/g,
  )) {
    const template = match[1];
    if (template === undefined) continue;
    const namespace = template.split(":")[0];
    if (namespace !== undefined && namespace.length > 0) found.add(namespace);
  }
  return [...found].sort();
}

const FE_ROOT = path.join(__dirname, "..", "..");
const SCANNED_DIRS = ["app", "components", "features", "hooks", "lib"];
const SKIP_DIRS = new Set(["node_modules", ".next", "__tests__"]);

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) continue;
    out.push(path.join(dir, entry.name));
  }
}

interface CallSite {
  readonly file: string;
  readonly argument: string;
}

function channelsGetCallSites(): CallSite[] {
  const files: string[] = [];
  for (const dir of SCANNED_DIRS) walk(path.join(FE_ROOT, dir), files);

  const sites: CallSite[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/channels\.get\(\s*([^)\n]*)\)/g)) {
      const argument = match[1];
      if (argument === undefined) continue;
      sites.push({ file: path.relative(FE_ROOT, file), argument: argument.trim() });
    }
  }
  return sites;
}

describe("Ably channel names — cell prefix contract with the backend", () => {
  it("FORMULA: the frontend prefix is the backend's own formula at its default cell id", () => {
    const legacyCellId = backendLegacyCellId();

    // `CELL_ID` is optional on the backend (env.validation.ts:46) and falls back
    // to LEGACY_CELL_ID, so an unconfigured deployment of both halves has to agree.
    expect(ABLY_CELL_ID).toBe(legacyCellId);

    for (const inner of [
      "chat:org-1:7",
      "huddle:org-1:7",
      "notifications:org-1:user-1",
      "support:org-1:42",
    ]) {
      expect(cellPrefixed(inner)).toBe(backendCellPrefixed(legacyCellId, inner));
      // and it is genuinely a prefix, not a no-op that would agree trivially
      expect(cellPrefixed(inner)).not.toBe(inner);
    }
  });

  it("NAMESPACES: every namespace the backend prefixes has a prefixing frontend builder", () => {
    const legacyCellId = backendLegacyCellId();
    const namespaces = backendPrefixedNamespaces();
    expect(namespaces.length).toBeGreaterThanOrEqual(MEASURED_NAMESPACE_FLOOR);

    const builders = new Map<string, { built: string; inner: string }>([
      ["chat", { built: chatChannelName("org-1", 7), inner: "chat:org-1:7" }],
      ["huddle", { built: huddleChannelName("org-1", 7), inner: "huddle:org-1:7" }],
      [
        "huddle-signal",
        {
          built: huddleSignalChannelName("org-1", 7, "user-1"),
          inner: "huddle-signal:org-1:7:user-1",
        },
      ],
      [
        "notifications",
        {
          built: notificationsChannelName("org-1", "user-1"),
          inner: "notifications:org-1:user-1",
        },
      ],
      [
        "support",
        { built: supportChannelName("org-1", 42), inner: "support:org-1:42" },
      ],
    ]);

    for (const namespace of namespaces) {
      const entry = builders.get(namespace);
      if (entry === undefined)
        throw new Error(
          `the backend prefixes the "${namespace}" namespace but the frontend has no builder for it`,
        );
      expect(entry.built).toBe(backendCellPrefixed(legacyCellId, entry.inner));
    }

    // The presence channel shares the `chat` namespace and must be prefixed too.
    expect(chatPresenceChannelName("org-1")).toBe(
      backendCellPrefixed(legacyCellId, "chat:org-1:presence"),
    );
  });

  it("NO LITERALS: no frontend file builds an Ably channel name inline", () => {
    const sites = channelsGetCallSites();
    expect(sites.length).toBeGreaterThanOrEqual(MEASURED_CALLSITE_FLOOR);

    const inline = sites.filter((site) => site.argument.startsWith("`"));
    expect(
      inline.map((site) => `${site.file}: channels.get(${site.argument})`),
    ).toEqual([]);
  });
});
