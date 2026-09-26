import { DB_ENUMS } from "@/contracts/db-enums.generated";
import {
  broadcastRowContract,
  notificationListContract,
  notificationPreferenceContract,
  notificationTemplateContract,
} from "./notifications-schema";

function notificationRow(category: string) {
  return {
    id: 1,
    orgId: "org_1",
    userId: "user_1",
    type: "INFO",
    priority: "NORMAL",
    category,
    sourceModule: null,
    title: "A journal was posted",
    message: null,
    link: null,
    isRead: false,
    pinned: false,
    channel: "IN_APP",
    archivedAt: null,
    snoozedUntil: null,
    createdAt: "2026-09-26T00:00:00.000Z",
    ticketContext: null,
  };
}

function templateRow(category: string) {
  return {
    id: 1,
    orgId: "org_1",
    templateKey: "accounting.journal.posted",
    name: "Journal posted",
    channel: "IN_APP",
    category,
    locale: "en",
    subject: null,
    body: "A journal was posted",
    variables: [],
    version: 1,
    isActive: true,
    approvalStatus: "NOT_REQUIRED",
    providerTemplateName: null,
    approvalCheckedAt: null,
    approvalRejectionReason: null,
    createdBy: "user_1",
    createdAt: "2026-09-26T00:00:00.000Z",
    updatedAt: "2026-09-26T00:00:00.000Z",
  };
}

function broadcastRow(category: string) {
  return {
    id: 1,
    orgId: "org_1",
    title: "Year end close",
    message: "Books close on Friday",
    type: "INFO",
    priority: "NORMAL",
    category,
    channels: ["IN_APP"],
    audience: { type: "all" },
    status: "DRAFT",
    scheduledAt: null,
    sentAt: null,
    recipientCount: 0,
    deliveredCount: 0,
    createdBy: "user_1",
    createdAt: "2026-09-26T00:00:00.000Z",
    updatedAt: "2026-09-26T00:00:00.000Z",
  };
}

/**
 * The reason each assertion exists is in its name, per the repo's no-comments rule.
 */
describe("notifications response contracts against the notification_category pgEnum", () => {
  it("parses an ACCOUNTING notification instead of throwing and taking the whole notification list down", () => {
    const parsed = notificationListContract.safeParse({
      data: [notificationRow("ACCOUNTING")],
      nextCursor: null,
      hasMore: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("parses an ACCOUNTING notification template, the second of three copies of the category list", () => {
    expect(notificationTemplateContract.safeParse(templateRow("ACCOUNTING")).success).toBe(true);
  });

  it("parses an ACCOUNTING broadcast, the third of three copies of the category list", () => {
    expect(broadcastRowContract.safeParse(broadcastRow("ACCOUNTING")).success).toBe(true);
  });

  it("still rejects a category the notification_category pgEnum does not declare, so widening did not become z.string()", () => {
    expect(notificationListContract.safeParse({
      data: [notificationRow("NOT_A_REAL_CATEGORY")],
      nextCursor: null,
      hasMore: false,
    }).success).toBe(false);
  });

  it.each(DB_ENUMS.notification_category)(
    "parses every member the pgEnum declares, including %s, on all three category copies",
    (category) => {
      expect(notificationListContract.safeParse({
        data: [notificationRow(category)],
        nextCursor: null,
        hasMore: false,
      }).success).toBe(true);
      expect(notificationTemplateContract.safeParse(templateRow(category)).success).toBe(true);
      expect(broadcastRowContract.safeParse(broadcastRow(category)).success).toBe(true);
    },
  );
});

describe("notification preference availableChannels against the notification_channel pgEnum", () => {
  const preference = (availableChannels: string[]) => ({
    id: 1,
    orgId: "org_1",
    userId: "user_1",
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    whatsappEnabled: false,
    inAppEnabled: true,
    soundEnabled: true,
    quietHoursStart: null,
    quietHoursEnd: null,
    quietHoursWeekends: false,
    allowCriticalOverride: true,
    digestMode: "disabled",
    categories: {},
    channelCategories: {},
    eventPreferences: {},
    modulePreferences: {},
    availableChannels,
  });

  it("accepts WEBHOOK, the sixth notification_channel member the hand-written five-member copy omitted", () => {
    expect(notificationPreferenceContract.safeParse(preference(["WEBHOOK"])).success).toBe(true);
  });

  it("accepts every notification_channel member at once", () => {
    expect(
      notificationPreferenceContract.safeParse(preference([...DB_ENUMS.notification_channel])).success,
    ).toBe(true);
  });

  it("still rejects a channel the pgEnum does not declare, so widening did not become z.string()", () => {
    expect(notificationPreferenceContract.safeParse(preference(["CARRIER_PIGEON"])).success).toBe(false);
  });
});
