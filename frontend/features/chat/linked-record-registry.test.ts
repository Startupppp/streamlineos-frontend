import { getLinkedRecordMeta, LINKED_RECORD_META } from "./linked-record-meta";

describe("getLinkedRecordMeta — Build path (ticket)", () => {
  it("returns the ticket meta with subtitleMonospace true so the ticket key renders in monospace", () => {
    const meta = getLinkedRecordMeta("ticket");
    expect(meta.label).toBe("Ticket");
    expect(meta.subtitleMonospace).toBe(true);
  });

  it("returns the ticket meta with statusControl true so the inline status action is rendered", () => {
    const meta = getLinkedRecordMeta("ticket");
    expect(meta.statusControl).toBe(true);
  });
});

describe("getLinkedRecordMeta — non-Build type (employee)", () => {
  it("returns employee meta with subtitleMonospace false so the subtitle renders in regular weight", () => {
    const meta = getLinkedRecordMeta("employee");
    expect(meta.label).toBe("Person");
    expect(meta.subtitleMonospace).toBe(false);
  });

  it("returns employee meta with statusControl false so no inline status action is rendered", () => {
    const meta = getLinkedRecordMeta("employee");
    expect(meta.statusControl).toBe(false);
  });

  it("provides a parseRoute function for employee that extracts the employee ID from the hr route", () => {
    const meta = getLinkedRecordMeta("employee");
    expect(meta.parseRoute).toBeDefined();
    expect(meta.parseRoute?.("/hr/employees/u_abc123", new URLSearchParams())).toBe("u_abc123");
    expect(meta.parseRoute?.("/hr/employees/", new URLSearchParams())).toBeNull();
    expect(meta.parseRoute?.("/crm/deals/5", new URLSearchParams())).toBeNull();
  });
});

describe("getLinkedRecordMeta — unknown type fallback", () => {
  it("returns a fallback entry instead of throwing when the type is not registered", () => {
    expect(() => getLinkedRecordMeta("completely_unknown_type")).not.toThrow();
  });

  it("fallback has statusControl false so no status action is rendered for unknown types", () => {
    const meta = getLinkedRecordMeta("completely_unknown_type");
    expect(meta.statusControl).toBe(false);
  });

  it("fallback has subtitleMonospace false so subtitles of unknown types render normally", () => {
    const meta = getLinkedRecordMeta("completely_unknown_type");
    expect(meta.subtitleMonospace).toBe(false);
  });

  it("fallback has a defined icon so no null reference crash occurs during rendering", () => {
    const meta = getLinkedRecordMeta("completely_unknown_type");
    expect(meta.icon).toBeDefined();
  });
});

describe("LINKED_RECORD_META route parsers", () => {
  it("doc_page parseRoute extracts the page ID from the knowledge wiki route", () => {
    const meta = LINKED_RECORD_META.doc_page;
    expect(meta.parseRoute?.("/knowledge/wiki/doc/3", new URLSearchParams())).toBe("3");
    expect(meta.parseRoute?.("/knowledge/wiki/doc/", new URLSearchParams())).toBeNull();
  });

  it("calendar_event parseRoute extracts the event ID from the calendar search param", () => {
    const meta = LINKED_RECORD_META.calendar_event;
    const search = new URLSearchParams("event=9");
    expect(meta.parseRoute?.("/calendar", search)).toBe("9");
    expect(meta.parseRoute?.("/calendar", new URLSearchParams())).toBeNull();
    expect(meta.parseRoute?.("/calendar/other", new URLSearchParams("event=9"))).toBeNull();
  });

  it("support_ticket parseRoute extracts the ticket ID from the support inbox search param", () => {
    const meta = LINKED_RECORD_META.support_ticket;
    const search = new URLSearchParams("ticket=12");
    expect(meta.parseRoute?.("/support/inbox", search)).toBe("12");
    expect(meta.parseRoute?.("/support/inbox", new URLSearchParams())).toBeNull();
  });

  it("deal parseRoute extracts the deal ID from the crm deals route", () => {
    const meta = LINKED_RECORD_META.deal;
    expect(meta.parseRoute?.("/crm/deals/5", new URLSearchParams())).toBe("5");
    expect(meta.parseRoute?.("/crm/deals/", new URLSearchParams())).toBeNull();
  });

  it("cycle parseRoute matches nested build cycles path and not the project-only path", () => {
    const meta = LINKED_RECORD_META.cycle;
    expect(meta.parseRoute?.("/build/1/cycles/42", new URLSearchParams())).toBe("42");
    expect(meta.parseRoute?.("/build/1", new URLSearchParams())).toBeNull();
  });

  it("project parseRoute matches the top-level build project path only", () => {
    const meta = LINKED_RECORD_META.project;
    expect(meta.parseRoute?.("/build/7", new URLSearchParams())).toBe("7");
    expect(meta.parseRoute?.("/build/7/cycles/1", new URLSearchParams())).toBeNull();
  });
});
