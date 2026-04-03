"server-only";
import * as webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.NEXT_PUBLIC_APP_URL || "https://crm.vaivammcapital.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch(async (pushErr: unknown) => {
          // Remove expired/invalid subscriptions (410 Gone)
          if (pushErr instanceof webpush.WebPushError && pushErr.statusCode === 410) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.endpoint, sub.endpoint));
          }
        })
    )
  );
}
