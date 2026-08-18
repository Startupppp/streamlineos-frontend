import { queryKeys } from "./query-keys";

describe("query key registry facade", () => {
  it("preserves representative domain key shapes after modularization", () => {
    expect(queryKeys.hr.termination(12)).toEqual([
      "streamlineos",
      "hr",
      "termination",
      12,
    ]);
    expect(queryKeys.leads.detail(21)).toEqual([
      "streamlineos",
      "leads",
      "detail",
      21,
    ]);
    expect(queryKeys.projects.ticket(34)).toEqual([
      "streamlineos",
      "projects",
      "tickets",
      "detail",
      34,
    ]);
    expect(queryKeys.notifications.template(55)).toEqual([
      "streamlineos",
      "notifications",
      "template",
      55,
    ]);
    expect(queryKeys.inventory.purchaseOrder(89)).toEqual([
      "streamlineos",
      "inventory",
      "purchaseOrder",
      89,
    ]);
    expect(queryKeys.users.detail("user-144")).toEqual([
      "streamlineos",
      "users",
      "detail",
      "user-144",
    ]);
    expect(queryKeys.payroll.templatePreview(233, "1200000")).toEqual([
      "streamlineos",
      "payroll",
      "template",
      233,
      "preview",
      "1200000",
    ]);
    expect(queryKeys.ownership.incomingTransfers()).toEqual([
      "streamlineos",
      "ownership",
      "transfers",
      "incoming",
    ]);
  });
});
