import { DB_ENUMS, type DbEnumMember } from "@/contracts/db-enums.generated";
import { NOTIFICATION_CATEGORY_CONFIG } from "@/lib/notification-types";
import {
  NOTIFICATION_CATEGORY_VALUES,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationType,
  type BroadcastStatus,
} from "./notifications";

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;

describe("the notification enums in types/notifications.ts stay in step with the generated pgEnum authority, because notifications-schema.ts already decodes against DB_ENUMS and a narrower hand-copy rejects rows the API legitimately returns", () => {
  it("NOTIFICATION_CATEGORY_VALUES is the notification_category member list, in order", () => {
    expect([...NOTIFICATION_CATEGORY_VALUES]).toEqual([
      ...DB_ENUMS.notification_category,
    ]);
  });

  it("admits ACCOUNTING, the member whose absence made the lazy notification-list contract unassignable", () => {
    expect([...NOTIFICATION_CATEGORY_VALUES]).toContain("ACCOUNTING");
  });

  it("names no category Postgres would reject", () => {
    const allowed = new Set<string>(DB_ENUMS.notification_category);
    expect(
      NOTIFICATION_CATEGORY_VALUES.filter((value) => !allowed.has(value)),
    ).toEqual([]);
  });

  it("gives every pgEnum category a label, icon and colour pair, so a new member cannot reach the tray as an undefined config", () => {
    const missing = DB_ENUMS.notification_category.filter(
      (category) => NOTIFICATION_CATEGORY_CONFIG[category] === undefined,
    );
    expect(missing).toEqual([]);
  });

  it("renders ACCOUNTING on the one unused category token, keeping green and amber the only doubled pairs", () => {
    expect(NOTIFICATION_CATEGORY_CONFIG.ACCOUNTING).toEqual(
      expect.objectContaining({
        label: "Accounting",
        color: "text-category-slate-ink",
        bg: "bg-category-slate-surface",
      }),
    );
  });

  it("keeps every notification type alias mutually assignable with its pgEnum, which tsc enforces through type-check:specs", () => {
    const parity = {
      notification_category: true satisfies MutuallyAssignable<
        NotificationCategory,
        DbEnumMember<"notification_category">
      >,
      notification_type: true satisfies MutuallyAssignable<
        NotificationType,
        DbEnumMember<"notification_type">
      >,
      notification_priority: true satisfies MutuallyAssignable<
        NotificationPriority,
        DbEnumMember<"notification_priority">
      >,
      notification_channel: true satisfies MutuallyAssignable<
        NotificationChannel,
        DbEnumMember<"notification_channel">
      >,
      broadcast_status: true satisfies MutuallyAssignable<
        BroadcastStatus,
        DbEnumMember<"broadcast_status">
      >,
    };
    expect(Object.values(parity).every(Boolean)).toBe(true);
  });
});
