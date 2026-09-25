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

function idsFor(capabilities: KbPageActionCapabilities): string[] {
  return resolveKbPageActions(NEUTRAL_SUBJECT, capabilities).map(
    (action) => action.id,
  );
}

describe("kb page action descriptors", () => {
  it("offers every action to an actor holding every permission", () => {
    expect(idsFor(FULL_CAPABILITIES)).toEqual([...KB_PAGE_ACTION_IDS]);
  });

  it("omits an action the actor cannot perform rather than offering one that fails", () => {
    expect(idsFor(NO_CAPABILITIES)).toEqual([
      "comments",
      "history",
      "info",
      "backlinks",
      "favorite",
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
    const off = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES);
    const on = resolveKbPageActions(
      { isFavorite: true, isLocked: true, hasCover: true },
      FULL_CAPABILITIES,
    );

    const labelOf = (actions: typeof off, id: string) =>
      actions.find((action) => action.id === id)?.label;

    expect(labelOf(off, "favorite")).toBe("Add to favorites");
    expect(labelOf(on, "favorite")).toBe("Remove from favorites");
    expect(labelOf(off, "lock")).toBe("Lock page");
    expect(labelOf(on, "lock")).toBe("Unlock page");
    expect(labelOf(off, "cover")).toBe("Add cover");
    expect(labelOf(on, "cover")).toBe("Change cover");
  });

  it("marks delete destructive and nothing else", () => {
    const destructive = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES)
      .filter((action) => action.destructive)
      .map((action) => action.id);

    expect(destructive).toEqual(["delete"]);
  });

  it("drops a group entirely when the actor holds none of its actions", () => {
    const groups = groupKbPageActions(
      resolveKbPageActions(NEUTRAL_SUBJECT, NO_CAPABILITIES),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.every((action) => action.group === "view")).toBe(true);
  });
});
