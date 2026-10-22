import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";
import {
  ABLY_CELL_ID,
  cellPrefixed,
  chatChannelName,
  chatPresenceChannelName,
  huddleChannelName,
  notificationsChannelName,
  supportChannelName,
} from "../ably-channels";


const MEASURED_NAMESPACE_FLOOR = 4;
const MEASURED_CALLSITE_FLOOR = 10;
const MEASURED_CHAT_CAPABILITY_FLOOR = 4;
const MEASURED_BUILDER_FLOOR = 5;

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

function backendCellPrefixed(cellId: string, channel: string): string {
  const prefixTemplate = readBackendTemplate(
    BACKEND_NAMESPACE,
    "cellChannelPrefix",
  );
  const prefixedTemplate = readBackendTemplate(BACKEND_NAMESPACE, "cellPrefixed");
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

const TEMPLATE_VALUES: Readonly<Record<string, string>> = {
  orgId: "org-1",
  clientId: "user-1",
  channelId: "7",
  userId: "user-1",
  ticketId: "42",
  id: "42",
};

function resolveTemplate(template: string): string {
  return template.replace(/\$\{([^}]+)\}/g, (_whole, expression: string) => {
    const value = TEMPLATE_VALUES[expression.trim()];
    if (value === undefined)
      throw new Error(
        `no substitution for \${${expression}} in backend template \`${template}\``,
      );
    return value;
  });
}

function backendMethodBody(source: string, methodName: string): string {
  const start = source.indexOf(`${methodName}(`);
  if (start === -1) throw new Error(`${methodName} not found in ably.service.ts`);
  const open = source.indexOf("{", source.indexOf(")", start));
  if (open === -1) throw new Error(`${methodName} has no body`);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`${methodName} body is unbalanced`);
}

function backendChannelHelperTemplate(source: string, methodName: string): string {
  const body = backendMethodBody(source, methodName);
  return firstGroup(
    /return\s+cellPrefixed\(\s*this\.cellId,\s*`([^`]+)`\s*\)/.exec(body),
    `${methodName} channel template`,
  );
}

interface CapabilityGrant {
  readonly key: string;
  readonly ops: readonly string[];
}

function backendChatCapability(): CapabilityGrant[] {
  const source = fs.readFileSync(BACKEND_ABLY_SERVICE, "utf8");
  const body = backendMethodBody(source, "createChatTokenRequest");
  const legacyCellId = backendLegacyCellId();
  const grants: CapabilityGrant[] = [];

  const entry =
    /\[\s*(?:cellPrefixed\(\s*this\.cellId,\s*`([^`]+)`\s*\)|this\.(\w+)\([^)]*\))\s*\]\s*(?::|=)\s*\[([^\]]*)\]/g;

  for (const match of body.matchAll(entry)) {
    const inlineTemplate = match[1];
    const helperName = match[2];
    const rawOps = match[3] ?? "";
    const template =
      inlineTemplate ??
      (helperName === undefined
        ? undefined
        : backendChannelHelperTemplate(source, helperName));
    if (template === undefined) continue;
    grants.push({
      key: backendCellPrefixed(legacyCellId, resolveTemplate(template)),
      ops: rawOps
        .split(",")
        .map((op) => op.trim().replace(/^["'`]|["'`]$/g, ""))
        .filter((op) => op.length > 0),
    });
  }
  return grants;
}

function backendSupportCapabilityKeys(): string[] {
  const source = fs.readFileSync(BACKEND_ABLY_SERVICE, "utf8");
  const body = backendMethodBody(source, "createSupportTokenRequest");
  const legacyCellId = backendLegacyCellId();
  const keys: string[] = [];
  for (const match of body.matchAll(
    /cellPrefixed\(\s*this\.cellId,\s*`([^`]+)`\s*\)/g,
  )) {
    const template = match[1];
    if (template === undefined) continue;
    keys.push(backendCellPrefixed(legacyCellId, resolveTemplate(template)));
  }
  return keys;
}

function capabilityCovers(key: string, name: string): boolean {
  if (!key.includes("*")) return key === name;
  const pattern = key
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^:]+");
  return new RegExp(`^${pattern}$`).test(name);
}

function grantFor(
  grants: readonly CapabilityGrant[],
  name: string,
): CapabilityGrant | undefined {
  return grants.find((grant) => capabilityCovers(grant.key, name));
}

function frontendBuilderNames(): string[] {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "ably-channels.ts"),
    "utf8",
  );
  return [...source.matchAll(/export function (\w*ChannelName)\s*\(/g)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined);
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

    expect(ABLY_CELL_ID).toBe(legacyCellId);

    for (const inner of [
      "chat:org-1:7",
      "huddle:org-1:7",
      "notifications:org-1:user-1",
      "support:org-1:42",
    ]) {
      expect(cellPrefixed(inner)).toBe(backendCellPrefixed(legacyCellId, inner));
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

    expect(chatPresenceChannelName("org-1")).toBe(
      backendCellPrefixed(legacyCellId, "chat:org-1:presence"),
    );
  });

  describe("GRANTED: every name the frontend builds is a key the token capability contains", () => {
    it("reads a non-empty capability map out of the backend's own source", () => {
      const chat = backendChatCapability();
      const support = backendSupportCapabilityKeys();

      expect(chat.length).toBeGreaterThanOrEqual(MEASURED_CHAT_CAPABILITY_FLOOR);
      expect(support.length).toBeGreaterThan(0);
      for (const grant of chat) {
        expect(grant.key.startsWith(`cell:${ABLY_CELL_ID}:`)).toBe(true);
        expect(grant.ops.length).toBeGreaterThan(0);
      }
    });

    it("grants every chat-token channel the frontend subscribes to", () => {
      const grants = backendChatCapability();

      const subscribed: ReadonlyArray<readonly [string, string]> = [
        ["chatChannelName", chatChannelName("org-1", 7)],
        ["chatPresenceChannelName", chatPresenceChannelName("org-1")],
        ["huddleChannelName", huddleChannelName("org-1", 7)],
        ["notificationsChannelName", notificationsChannelName("org-1", "user-1")],
      ];

      const ungranted = subscribed
        .filter(([, name]) => grantFor(grants, name) === undefined)
        .map(
          ([builder, name]) =>
            `${builder}() builds "${name}", which no key of createChatTokenRequest's capability map covers`,
        );
      expect(ungranted).toEqual([]);

      for (const [, name] of subscribed)
        expect(grantFor(grants, name)?.ops).toContain("subscribe");
    });

    it("grants the presence operation on the channel the presence hook enters", () => {
      const grants = backendChatCapability();
      const presence = grantFor(grants, chatPresenceChannelName("org-1"));

      expect(presence?.ops).toContain("presence");
      expect(presence?.ops).toContain("subscribe");
    });

    it("grants the support channel the support presence hook uses", () => {
      const keys = backendSupportCapabilityKeys();
      const name = supportChannelName("org-1", 42);
      expect(keys.some((key) => capabilityCovers(key, name))).toBe(true);
    });

    it("covers every exported channel builder, so a new one cannot skip the check", () => {
      const builders = frontendBuilderNames();
      expect(builders.length).toBeGreaterThanOrEqual(MEASURED_BUILDER_FLOOR);
      expect(builders.sort()).toEqual([
        "chatChannelName",
        "chatPresenceChannelName",
        "huddleChannelName",
        "notificationsChannelName",
        "supportChannelName",
      ]);
    });

    it("does not report an unbuilt name as granted", () => {
      const grants = backendChatCapability();
      expect(
        grantFor(grants, cellPrefixed("chat:org-1:presence-shadow")),
      ).toBeUndefined();
      expect(grantFor(grants, cellPrefixed("chat:org-2:presence"))).toBeUndefined();
      expect(
        grantFor(grants, cellPrefixed("notifications:org-1:user-2")),
      ).toBeUndefined();
    });
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
