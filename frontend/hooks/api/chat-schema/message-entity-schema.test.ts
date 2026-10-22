import { chatMessageMetadataContract } from "./message-schema";

const card = (type: string, id: string) => ({
  type,
  id,
  title: `${type} ${id}`,
  subtitle: null,
  status: null,
  href: `/x/${id}`,
});

describe("message metadata entities follow the backend linkable types", () => {
  it("decodes every type the backend registers an adapter for, resolved or not", () => {
    const types = [
      "ticket",
      "task",
      "project",
      "cycle",
      "release",
      "incident",
      "client",
      "deal",
      "lead",
      "employee",
      "doc_page",
      "calendar_event",
      "support_ticket",
    ];
    const parsed = chatMessageMetadataContract.parse({
      entities: types.map((type, index) =>
        index % 2 === 0 ? { type, id: String(index), card: card(type, String(index)) } : { type, id: String(index), card: null },
      ),
    });
    expect(parsed?.entities?.map((e) => e.type)).toEqual(types);
    expect(parsed?.entities?.[1].card).toBeNull();
    expect(parsed?.entities?.[0].card?.title).toBe("ticket 0");
  });

  it("strips sender-written ticket snapshot fields, so only the reader's resolved card can name a record", () => {
    const parsed = chatMessageMetadataContract.parse({
      entities: [{ type: "ticket", id: "5", projectId: 2, projectKey: "AP", ticketNumber: 12, title: "Fake title", status: "DONE" }],
    });
    expect(parsed?.entities).toEqual([{ type: "ticket", id: "5" }]);
  });

  it("drops a stored entity of a type no adapter claims instead of failing the whole message", () => {
    const parsed = chatMessageMetadataContract.parse({
      entities: [
        { type: "comment", id: "c1", card: null },
        { type: "employee", id: "user_1", card: card("employee", "user_1") },
      ],
      forwardCount: 2,
    });
    expect(parsed?.entities?.map((e) => e.type)).toEqual(["employee"]);
    expect(parsed?.forwardCount).toBe(2);
  });

  it("drops one entity whose card breaks the contract, so a single bad reference cannot blank the conversation", () => {
    const parsed = chatMessageMetadataContract.parse({
      entities: [{ type: "lead", id: "1", card: { type: "lead", id: "1" } }],
    });
    expect(parsed?.entities).toEqual([]);
  });
});
