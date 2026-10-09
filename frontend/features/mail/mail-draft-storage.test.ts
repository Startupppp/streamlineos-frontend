import {
  clearMailDraft,
  mailDraftKey,
  readMailDraft,
  writeMailDraft,
} from "./mail-draft-storage";
import type { MailComposeMode } from "./mail-compose-schema";

const COMPOSE: MailComposeMode = { type: "compose" };
const REPLY: MailComposeMode = {
  type: "reply",
  messageId: "msg-42",
  threadId: "thread-1",
  toEmail: "someone@example.com",
  subject: "Re: plan",
  accountId: 7,
};

beforeEach(() => window.localStorage.clear());

describe("draft keys separate compose from each reply", () => {
  it("gives compose a single stable key", () => {
    expect(mailDraftKey(COMPOSE)).toBe(mailDraftKey({ type: "compose" }));
  });

  it("isolates compose recovery across mailbox accounts", () => {
    expect(mailDraftKey(COMPOSE, 7)).not.toBe(mailDraftKey(COMPOSE, 8));
  });

  it("keys a reply by the message it answers, so two replies never collide", () => {
    const other: MailComposeMode = { ...REPLY, messageId: "msg-99" };
    expect(mailDraftKey(REPLY)).not.toBe(mailDraftKey(other));
    expect(mailDraftKey(REPLY)).not.toBe(mailDraftKey(COMPOSE));
  });
});

describe("a draft survives the round trip", () => {
  it("preserves recipients and sending account, including a recipient-only draft", () => {
    const draft = { bodyHtml: "", accountId: 7, to: ["to@example.com"], cc: ["cc@example.com"], bcc: ["private@example.com"] };
    writeMailDraft(mailDraftKey(COMPOSE), draft);
    expect(readMailDraft(mailDraftKey(COMPOSE))).toEqual(draft);
  });

  it("does not share a reply draft between accounts with the same message ID", () => {
    expect(mailDraftKey(REPLY)).not.toBe(mailDraftKey({ ...REPLY, accountId: 8 }));
  });

  it("restores body and subject byte-identically", () => {
    const key = mailDraftKey(COMPOSE);
    const body = '<p>Hello &amp; welcome — "quoted", éàü</p>';
    writeMailDraft(key, { bodyHtml: body, subject: "Q3 plan" });

    expect(readMailDraft(key)).toEqual({ bodyHtml: body, subject: "Q3 plan" });
  });

  it("restores a reply draft with no subject", () => {
    const key = mailDraftKey(REPLY);
    writeMailDraft(key, { bodyHtml: "<p>Sounds good</p>" });

    expect(readMailDraft(key)).toEqual({ bodyHtml: "<p>Sounds good</p>" });
  });

  it("returns null when nothing was ever saved", () => {
    expect(readMailDraft(mailDraftKey(COMPOSE))).toBeNull();
  });
});

describe("the store never resurrects or corrupts a draft", () => {
  it("removes the entry when the draft is emptied, rather than storing a blank", () => {
    const key = mailDraftKey(COMPOSE);
    writeMailDraft(key, { bodyHtml: "<p>typing</p>" });
    writeMailDraft(key, { bodyHtml: "" });

    expect(window.localStorage.getItem(key)).toBeNull();
    expect(readMailDraft(key)).toBeNull();
  });

  it("clearMailDraft removes it", () => {
    const key = mailDraftKey(COMPOSE);
    writeMailDraft(key, { bodyHtml: "<p>gone</p>" });
    clearMailDraft(key);

    expect(readMailDraft(key)).toBeNull();
  });

  it("BITE: unparseable stored JSON reads as no draft, never as a crash", () => {
    const key = mailDraftKey(COMPOSE);
    window.localStorage.setItem(key, "{not json");

    expect(() => readMailDraft(key)).not.toThrow();
    expect(readMailDraft(key)).toBeNull();
  });

  it("BITE: a stored shape without a string body reads as no draft", () => {
    const key = mailDraftKey(COMPOSE);
    window.localStorage.setItem(key, JSON.stringify({ bodyHtml: 42 }));

    expect(readMailDraft(key)).toBeNull();
  });

  it("BITE: a throwing localStorage degrades to no draft instead of breaking compose", () => {
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("SecurityError");
      });
    const setSpy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    expect(readMailDraft(mailDraftKey(COMPOSE))).toBeNull();
    expect(() =>
      writeMailDraft(mailDraftKey(COMPOSE), { bodyHtml: "<p>x</p>" }),
    ).not.toThrow();

    spy.mockRestore();
    setSpy.mockRestore();
  });
});
