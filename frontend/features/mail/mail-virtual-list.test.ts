import { buildFlatItems } from "./mail-virtual-list";
import type { MailMessageSummary } from "@/types/mail";

const message = { id: "m1", accountId: 1 } as MailMessageSummary;

it("omits a group's messages while preserving its collapsible heading", () => {
  const items = buildFlatItems([{ key: "today", label: "Today & yesterday", messages: [message] }], new Set(["today"]));
  expect(items).toEqual([{ kind: "header", key: "today", label: "Today & yesterday", count: 1, collapsed: true }]);
});
