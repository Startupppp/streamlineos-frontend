import { ZodError } from "zod";
import {
  templateRowContract,
  templateListContract,
  applyTemplateResultContract,
} from "./roadmap-schema";

const KNOWN_GOOD_TEMPLATE = {
  id: 1,
  orgId: "org-abc",
  name: "Sprint template",
  description: "A standard sprint with backlog, review, and retro phases.",
  category: "engineering",
  createdBy: "user-xyz",
  deletedAt: null,
  createdAt: "2026-01-15T09:00:00.000Z",
};

const KNOWN_GOOD_TICKET = {
  id: 10,
  templateId: 1,
  title: "Backlog grooming",
  description: null,
  type: "task",
  priority: "medium",
  estimatedHours: "2.0",
  order: 1,
  phase: "planning",
};

describe("templateRowContract — shape matches the backend template projection", () => {
  it("parses a minimal template with no tickets", () => {
    const result = templateRowContract.parse(KNOWN_GOOD_TEMPLATE);
    expect(result.id).toBe(1);
    expect(result.name).toBe("Sprint template");
    expect(result.deletedAt).toBeNull();
  });

  it("parses a template whose description is null", () => {
    const result = templateRowContract.parse({
      ...KNOWN_GOOD_TEMPLATE,
      description: null,
    });
    expect(result.description).toBeNull();
  });

  it("parses a template whose createdBy is null", () => {
    const result = templateRowContract.parse({
      ...KNOWN_GOOD_TEMPLATE,
      createdBy: null,
    });
    expect(result.createdBy).toBeNull();
  });

  it("parses a template with an embedded tickets array", () => {
    const result = templateRowContract.parse({
      ...KNOWN_GOOD_TEMPLATE,
      tickets: [KNOWN_GOOD_TICKET],
    });
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets![0].title).toBe("Backlog grooming");
  });

  it("parses a template ticket whose phase and description are null", () => {
    const result = templateRowContract.parse({
      ...KNOWN_GOOD_TEMPLATE,
      tickets: [
        { ...KNOWN_GOOD_TICKET, description: null, phase: null },
      ],
    });
    expect(result.tickets![0].phase).toBeNull();
    expect(result.tickets![0].description).toBeNull();
  });

  it("rejects a template missing the required name field", () => {
    const { name: _name, ...noName } = KNOWN_GOOD_TEMPLATE;
    expect(() => templateRowContract.parse(noName)).toThrow(ZodError);
  });

  it("rejects a template with a non-integer id", () => {
    expect(() =>
      templateRowContract.parse({ ...KNOWN_GOOD_TEMPLATE, id: 1.5 }),
    ).toThrow(ZodError);
  });
});

describe("templateListContract — idCursorPage envelope wrapping templateRowContract", () => {
  it("parses an empty page", () => {
    const result = templateListContract.parse({
      data: [],
      hasMore: false,
      nextCursor: null,
    });
    expect(result.data).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("parses a page with two templates and a nextCursor", () => {
    const result = templateListContract.parse({
      data: [
        KNOWN_GOOD_TEMPLATE,
        { ...KNOWN_GOOD_TEMPLATE, id: 2, name: "Bug triage template" },
      ],
      hasMore: true,
      nextCursor: 2,
    });
    expect(result.data).toHaveLength(2);
    expect(result.data[1].name).toBe("Bug triage template");
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(2);
  });

  it("parses a last page with null nextCursor", () => {
    const result = templateListContract.parse({
      data: [KNOWN_GOOD_TEMPLATE],
      hasMore: false,
      nextCursor: null,
    });
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("rejects a payload missing the hasMore field", () => {
    expect(() =>
      templateListContract.parse({ data: [], nextCursor: null }),
    ).toThrow(ZodError);
  });

  it("rejects a page containing a template with an invalid shape", () => {
    expect(() =>
      templateListContract.parse({
        data: [{ id: "not-a-number", name: "x" }],
        hasMore: false,
        nextCursor: null,
      }),
    ).toThrow(ZodError);
  });
});

describe("applyTemplateResultContract — result of applying a template to a project", () => {
  it("parses a successful apply result", () => {
    const result = applyTemplateResultContract.parse({
      projectId: 42,
      key: "SL",
      ticketsCreated: 8,
    });
    expect(result.projectId).toBe(42);
    expect(result.key).toBe("SL");
    expect(result.ticketsCreated).toBe(8);
  });

  it("rejects a result with a missing key field", () => {
    expect(() =>
      applyTemplateResultContract.parse({ projectId: 1, ticketsCreated: 3 }),
    ).toThrow(ZodError);
  });
});
