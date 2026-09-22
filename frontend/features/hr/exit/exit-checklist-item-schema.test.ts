import type { ExitChecklistItem } from "@/hooks/api/hr/exit";
import {
  exitChecklistItemFormDefaults,
  exitChecklistItemFormSchema,
  exitChecklistItemUpdateFromForm,
} from "./exit-checklist-item-schema";

const item: ExitChecklistItem = {
  id: 5,
  itemKey: "asset_return",
  kind: "asset_return",
  title: "Company assets returned and recorded",
  status: "PENDING",
  dueDate: "2026-10-31",
  owner: { type: "queue", permission: "hr:assets:manage", label: "Assets queue" },
  completedAt: null,
  completedBy: null,
  evidence: null,
  notes: null,
  updatedAt: "2026-09-21T00:00:00.000Z",
  viewerCanUpdate: true,
};

describe("the checklist item form", () => {
  it("refuses to close an item without evidence, the way the API does", () => {
    const result = exitChecklistItemFormSchema.safeParse({ ...exitChecklistItemFormDefaults(item), status: "DONE" });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join("."))).toEqual(["evidence"]);
  });

  it("requires a person when the owner choice is a person", () => {
    const result = exitChecklistItemFormSchema.safeParse({ ...exitChecklistItemFormDefaults(item), owner: "person" });

    expect(result.success).toBe(false);
  });

  it("sends only what changed, and always carries the evidence when closing", () => {
    const values = exitChecklistItemFormSchema.parse({ ...exitChecklistItemFormDefaults(item), status: "DONE", evidence: "Laptop AS-19 returned" });

    expect(exitChecklistItemUpdateFromForm(item, values, false)).toEqual({ status: "DONE", evidence: "Laptop AS-19 returned" });
  });

  it("re-sends existing evidence when re-closing, so the API's closing rule is satisfied", () => {
    const closed: ExitChecklistItem = { ...item, status: "PENDING", evidence: "Already written" };
    const values = exitChecklistItemFormSchema.parse({ ...exitChecklistItemFormDefaults(closed), status: "WAIVED" });

    expect(exitChecklistItemUpdateFromForm(closed, values, false)).toEqual({ status: "WAIVED", evidence: "Already written" });
  });

  it("drops owner and due-date changes for a viewer who cannot reassign", () => {
    const values = exitChecklistItemFormSchema.parse({ ...exitChecklistItemFormDefaults(item), dueDate: "2026-11-15", owner: "hr:exit:manage" });

    expect(exitChecklistItemUpdateFromForm(item, values, false)).toEqual({});
    expect(exitChecklistItemUpdateFromForm(item, values, true)).toEqual({ dueDate: "2026-11-15", ownerQueue: "hr:exit:manage" });
  });

  it("maps a chosen person to ownerUserId and never sends a queue beside it", () => {
    const values = exitChecklistItemFormSchema.parse({ ...exitChecklistItemFormDefaults(item), owner: "person", ownerUserId: "user-44" });

    expect(exitChecklistItemUpdateFromForm(item, values, true)).toEqual({ ownerUserId: "user-44" });
  });
});
