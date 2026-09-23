import {
  parseGrouping,
  groupInboxItems,
  GROUPING_OPTIONS,
  type InboxGrouping,
} from "./inbox-grouping";
import type { UnifiedInboxItem } from "@/types/inbox";

function makeNotification(id: number, sourceModule = "build"): UnifiedInboxItem {
  return {
    kind: "notification",
    id,
    subject: `Subject ${id}`,
    body: "body",
    notifType: "INFO",
    priority: "NORMAL",
    category: "SYSTEM",
    sourceModule,
    actor: null,
    isRead: false,
    pinned: false,
    deepLink: null,
    eventKey: null,
    dedupKey: `notification:${id}`,
    timestamp: new Date().toISOString(),
  };
}

function makeMail(id: string, threadId: string | null = null, sourceModule = "mail"): UnifiedInboxItem {
  return {
    kind: "mail",
    id,
    subject: `Mail ${id}`,
    snippet: "preview",
    hasAttachments: false,
    threadId,
    accountId: 1,
    sourceModule,
    actor: null,
    isRead: false,
    deepLink: null,
    dedupKey: `mail:${id}`,
    timestamp: new Date().toISOString(),
  };
}

function makeApproval(id: number, projectId: number | null = null): UnifiedInboxItem {
  return {
    kind: "build_approval",
    id,
    subject: `Approval ${id}`,
    status: "pending",
    approvalKind: "build",
    projectId,
    ticketId: null,
    dueAt: null,
    sourceModule: "build",
    actor: null,
    isRead: false,
    deepLink: null,
    dedupKey: `build_approval:${id}`,
    timestamp: new Date().toISOString(),
  };
}

describe("parseGrouping", () => {
  it("returns none for null", () => {
    expect(parseGrouping(null)).toBe("none");
  });

  it("returns none for an unknown grouping slug", () => {
    expect(parseGrouping("project")).toBe("none");
    expect(parseGrouping("customer")).toBe("none");
    expect(parseGrouping("random")).toBe("none");
  });

  it.each(["none", "kind", "module", "thread"] as InboxGrouping[])(
    "accepts the valid grouping slug %s",
    (slug) => {
      expect(parseGrouping(slug)).toBe(slug);
    },
  );
});

describe("GROUPING_OPTIONS", () => {
  it("includes none, kind, module, and thread", () => {
    const values = GROUPING_OPTIONS.map((o) => o.value);
    expect(values).toContain("none");
    expect(values).toContain("kind");
    expect(values).toContain("module");
    expect(values).toContain("thread");
  });

  it("does not include unsupported dimensions (project, customer, employee, ticket, document, workflow)", () => {
    const values = GROUPING_OPTIONS.map((o) => o.value);
    expect(values).not.toContain("project");
    expect(values).not.toContain("customer");
    expect(values).not.toContain("employee");
    expect(values).not.toContain("ticket");
    expect(values).not.toContain("document");
    expect(values).not.toContain("workflow");
  });
});

describe("groupInboxItems — grouping=none", () => {
  it("returns an empty array when grouping is none", () => {
    const items = [makeNotification(1), makeMail("m1")];
    expect(groupInboxItems(items, "none")).toEqual([]);
  });
});

describe("groupInboxItems — grouping=kind", () => {
  it("groups items by their kind field", () => {
    const items: UnifiedInboxItem[] = [
      makeNotification(1),
      makeNotification(2),
      makeMail("m1"),
      makeApproval(10),
    ];
    const groups = groupInboxItems(items, "kind");
    const keys = groups.map((g) => g.key);
    expect(keys).toContain("notification");
    expect(keys).toContain("mail");
    expect(keys).toContain("build_approval");
  });

  it("places both notification items into the same group", () => {
    const items = [makeNotification(1), makeNotification(2), makeMail("m1")];
    const groups = groupInboxItems(items, "kind");
    const notifGroup = groups.find((g) => g.key === "notification");
    expect(notifGroup?.items).toHaveLength(2);
  });

  it("assigns human-readable labels to kind groups", () => {
    const items = [makeNotification(1), makeMail("m1"), makeApproval(2)];
    const groups = groupInboxItems(items, "kind");
    const labels = groups.map((g) => g.label);
    expect(labels).toContain("Notifications");
    expect(labels).toContain("Mail");
    expect(labels).toContain("Approvals");
  });
});

describe("groupInboxItems — grouping=module", () => {
  it("groups items by sourceModule", () => {
    const items: UnifiedInboxItem[] = [
      makeNotification(1, "hr"),
      makeNotification(2, "build"),
      makeNotification(3, "hr"),
    ];
    const groups = groupInboxItems(items, "module");
    const hrGroup = groups.find((g) => g.key === "hr");
    const buildGroup = groups.find((g) => g.key === "build");
    expect(hrGroup?.items).toHaveLength(2);
    expect(buildGroup?.items).toHaveLength(1);
  });

  it("formats module labels from snake_case to Title Case", () => {
    const items = [makeNotification(1, "build_approval")];
    const groups = groupInboxItems(items, "module");
    expect(groups[0]?.label).toBe("Build Approval");
  });
});

describe("groupInboxItems — grouping=thread", () => {
  it("places mail items with the same threadId into the same group", () => {
    const items: UnifiedInboxItem[] = [
      makeMail("m1", "thread-abc"),
      makeMail("m2", "thread-abc"),
      makeMail("m3", "thread-xyz"),
    ];
    const groups = groupInboxItems(items, "thread");
    const abcGroup = groups.find((g) => g.key === "thread:thread-abc");
    expect(abcGroup?.items).toHaveLength(2);
  });

  it("places mail items with null threadId into a kind bucket", () => {
    const items: UnifiedInboxItem[] = [
      makeMail("m1", null),
      makeMail("m2", "thread-abc"),
    ];
    const groups = groupInboxItems(items, "thread");
    const kindGroup = groups.find((g) => g.key === "kind:mail");
    expect(kindGroup?.items).toHaveLength(1);
  });

  it("places non-mail items into a kind bucket when grouping by thread", () => {
    const items: UnifiedInboxItem[] = [
      makeNotification(1),
      makeMail("m1", "thread-abc"),
    ];
    const groups = groupInboxItems(items, "thread");
    const notifGroup = groups.find((g) => g.key === "kind:notification");
    expect(notifGroup?.items).toHaveLength(1);
  });

  it("preserves insertion order of groups", () => {
    const items: UnifiedInboxItem[] = [
      makeNotification(1),
      makeMail("m1", "thread-abc"),
    ];
    const groups = groupInboxItems(items, "thread");
    expect(groups[0]?.key).toBe("kind:notification");
    expect(groups[1]?.key).toBe("thread:thread-abc");
  });
});

describe("groupInboxItems — URL-addressable grouping round-trip", () => {
  it("parseGrouping correctly recovers each supported grouping from a string", () => {
    const supported: InboxGrouping[] = ["kind", "module", "thread", "none"];
    for (const g of supported) {
      expect(parseGrouping(g)).toBe(g);
    }
  });
});
