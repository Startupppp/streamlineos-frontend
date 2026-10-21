import {
  KB_PAGE_ACTION_IDS,
  groupKbPageActions,
  resolveKbPageActions,
  type KbPageActionCapabilities,
  type KbPageActionSubject,
} from "./page-action-descriptors";

const NEUTRAL_SUBJECT: KbPageActionSubject = {
  isFavorite: false,
  isLocked: false,
  hasCover: false,
  isArchived: false,
};

const FULL_CAPABILITIES: KbPageActionCapabilities = {
  canCreate: true,
  canUpdate: true,
  canManage: true,
  canDelete: true,
  canExport: true,
  canManageTemplates: true,
  isEditable: true,
};

const NO_CAPABILITIES: KbPageActionCapabilities = {
  canCreate: false,
  canUpdate: false,
  canManage: false,
  canDelete: false,
  canExport: false,
  canManageTemplates: false,
  isEditable: false,
};

function idsFor(capabilities: KbPageActionCapabilities, opts?: { collection?: boolean }): string[] {
  return resolveKbPageActions(NEUTRAL_SUBJECT, capabilities, opts).map(
    (action) => action.id,
  );
}

describe("kb page action descriptors", () => {
  it("offers every non-collection action to an actor holding every permission", () => {
    expect(idsFor(FULL_CAPABILITIES)).toEqual([
      "comments", "history", "info", "backlinks", "favorite", "linkedRecords",
      "cover", "duplicate", "move", "lock", "saveTemplate", "export", "copyLink",
      "delete",
    ]);
  });

  it("includes share and archive in collection context for a fully-capable actor", () => {
    expect(idsFor(FULL_CAPABILITIES, { collection: true })).toContain("share");
    expect(idsFor(FULL_CAPABILITIES, { collection: true })).toContain("archive");
  });

  it("omits an action the actor cannot perform rather than offering one that fails", () => {
    expect(idsFor(NO_CAPABILITIES)).toEqual([
      "comments",
      "history",
      "info",
      "backlinks",
      "favorite",
      "linkedRecords",
      "copyLink",
    ]);
  });

  it("gates export on kb:pages:export, so a reader cannot serialize a page", () => {
    expect(idsFor(NO_CAPABILITIES)).not.toContain("export");

    const exportAction = resolveKbPageActions(
      NEUTRAL_SUBJECT,
      FULL_CAPABILITIES,
    ).find((action) => action.id === "export");

    expect(exportAction?.permission).toBe("kb:pages:export");
  });

  it("gates share on kb:pages:manage so only managers can delegate access from the collection menu", () => {
    expect(idsFor(NO_CAPABILITIES, { collection: true })).not.toContain("share");
    const shareAction = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES, { collection: true })
      .find((a) => a.id === "share");
    expect(shareAction?.permission).toBe("kb:pages:manage");
  });

  it("gates archive on kb:pages:update and hides it outside collection context", () => {
    expect(idsFor(NO_CAPABILITIES, { collection: true })).not.toContain("archive");
    expect(idsFor(FULL_CAPABILITIES)).not.toContain("archive");
    const archiveAction = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES, { collection: true })
      .find((a) => a.id === "archive");
    expect(archiveAction?.permission).toBe("kb:pages:update");
  });

  it("gates export independently of delete, so revoking one leaves the other", () => {
    const exportOnly = idsFor({ ...NO_CAPABILITIES, canExport: true });
    expect(exportOnly).toContain("export");
    expect(exportOnly).not.toContain("delete");

    const deleteOnly = idsFor({ ...NO_CAPABILITIES, canDelete: true });
    expect(deleteOnly).toContain("delete");
    expect(deleteOnly).not.toContain("export");
  });

  it("carries the backend permission key on every gated action", () => {
    const gated = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES)
      .filter((action) => action.permission !== null)
      .map((action) => [action.id, action.permission]);

    expect(gated).toEqual([
      ["cover", "kb:pages:update"],
      ["duplicate", "kb:pages:create"],
      ["move", "kb:pages:update"],
      ["lock", "kb:pages:manage"],
      ["saveTemplate", "kb:templates:manage"],
      ["export", "kb:pages:export"],
      ["delete", "kb:pages:delete"],
    ]);
  });

  it("states what a toggle will do, not what the page currently is", () => {
    const off = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES, { collection: true });
    const on = resolveKbPageActions(
      { isFavorite: true, isLocked: true, hasCover: true, isArchived: true },
      FULL_CAPABILITIES,
      { collection: true },
    );

    const labelOf = (actions: typeof off, id: string) =>
      actions.find((action) => action.id === id)?.label;

    expect(labelOf(off, "favorite")).toBe("Add to favorites");
    expect(labelOf(on, "favorite")).toBe("Remove from favorites");
    expect(labelOf(off, "lock")).toBe("Lock page");
    expect(labelOf(on, "lock")).toBe("Unlock page");
    expect(labelOf(off, "cover")).toBe("Add cover");
    expect(labelOf(on, "cover")).toBe("Change cover");
    expect(labelOf(off, "archive")).toBe("Archive");
    expect(labelOf(on, "archive")).toBe("Unarchive");
  });

  it("marks delete destructive and nothing else — archive is reversible so it is not destructive", () => {
    const destructive = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES, { collection: true })
      .filter((action) => action.destructive)
      .map((action) => action.id);

    expect(destructive).toEqual(["delete"]);
  });

  it("drops a group entirely when the actor holds none of its gated actions — copyLink being alwaysPermitted keeps organize alive", () => {
    const groups = groupKbPageActions(
      resolveKbPageActions(NEUTRAL_SUBJECT, NO_CAPABILITIES),
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.every((action) => action.group === "view")).toBe(true);
    expect(groups[1]?.every((action) => action.group === "organize")).toBe(true);
  });

  it("copyLink is always permitted regardless of capabilities so view-only users can share the URL (task H)", () => {
    expect(idsFor(NO_CAPABILITIES)).toContain("copyLink");
    expect(idsFor(FULL_CAPABILITIES)).toContain("copyLink");
  });

  it("copyLink carries no permission requirement so the resolver never gates it on a backend key (task H)", () => {
    const action = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES).find(
      (a) => a.id === "copyLink",
    );
    expect(action?.permission).toBeNull();
  });

  it("copyLink is in the organize group so it appears alongside duplicate and move (task H)", () => {
    const groups = groupKbPageActions(
      resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES),
    );
    const organizeGroup = groups.find((g) => g[0]?.group === "organize");
    expect(organizeGroup?.map((a) => a.id)).toContain("copyLink");
  });
});
