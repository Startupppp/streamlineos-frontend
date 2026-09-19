import {
  checklistItemContract,
  checklistListContract,
  checklistRowContract,
} from "@/hooks/api/build/build-tickets-subresource-schema";

const ITEM = {
  id: 11,
  orgId: "org-1",
  checklistId: 4,
  text: "Write the migration",
  isCompleted: false,
  assigneeId: null,
  dueDate: null,
  order: 2,
  createdAt: "2026-09-15T10:00:00.000Z",
};

const CHECKLIST = {
  id: 4,
  orgId: "org-1",
  projectId: 3,
  ticketId: 7,
  title: "Release checklist",
  position: 0,
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:00:00.000Z",
  items: [ITEM],
};

describe("checklist contracts match what the endpoints answer", () => {
  it("parses a created checklist item", () => {
    expect(checklistItemContract.parse(ITEM).text).toBe("Write the migration");
  });

  it("parses an assigned item with a due date", () => {
    const parsed = checklistItemContract.parse({
      ...ITEM,
      assigneeId: "user-1",
      dueDate: "2026-09-30",
    });

    expect(parsed.assigneeId).toBe("user-1");
    expect(parsed.dueDate).toBe("2026-09-30");
  });

  it("parses a checklist created with no items yet", () => {
    const { items: _items, ...withoutItems } = CHECKLIST;
    const parsed = checklistRowContract.parse(withoutItems);

    expect(parsed.items).toEqual([]);
  });

  it("parses the checklist list with its items", () => {
    const parsed = checklistListContract.parse([CHECKLIST]);

    expect(parsed[0].items.map((i) => i.text)).toEqual(["Write the migration"]);
  });
});
