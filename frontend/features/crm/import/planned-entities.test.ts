import {
  PLANNED_ENTITIES,
  needsSubjectType,
  plannedEntity,
  type PlannedEntity,
} from "./planned-entities";

describe("planned import entities", () => {
  it("offers the four the server can plan", () => {
    expect(PLANNED_ENTITIES.map((entity) => entity.id)).toEqual([
      "party",
      "subject",
      "pipeline",
      "activity",
    ]);
  });

  /**
   * The control is hidden for the same reason the request would be refused.
   *
   * The server checks one of these on top of `crm:imports:manage`, so a key
   * here that does not match the one it checks either shows a control that
   * always fails or hides one that would have worked.
   */
  it("names the key the server checks for each one", () => {
    expect(PLANNED_ENTITIES.map((entity) => entity.permission)).toEqual([
      "party:parties:create",
      "party:subjects:manage",
      "crm:deals:create",
      "crm:activities:manage",
    ]);
  });

  it("gives every entity words a person holding a file would recognise", () => {
    for (const entity of PLANNED_ENTITIES) {
      expect(entity.label.length).toBeGreaterThan(0);
      expect(entity.hint.length).toBeGreaterThan(0);
    }
  });

  it.each(PLANNED_ENTITIES.map((entity) => entity.id))("resolves %s to itself", (id) => {
    expect(plannedEntity(id).id).toBe(id);
  });

  /** Only a subject import has to ask which declaration the file is. */
  it("asks for a subject type only where there is one to ask about", () => {
    const asked = PLANNED_ENTITIES.filter((entity) => needsSubjectType(entity.id));
    expect(asked.map((entity) => entity.id)).toEqual(["subject"]);
  });

  it("falls back rather than returning undefined for an unknown id", () => {
    expect(plannedEntity("nonsense" as PlannedEntity).id).toBe("party");
  });
});
