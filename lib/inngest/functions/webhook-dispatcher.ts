import { inngest } from "../client";
import { db } from "@/lib/db";
import { webhookEndpoints, webhookLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createHmac } from "crypto";

export const webhookDispatcher = inngest.createFunction(
  { id: "webhook-dispatcher", name: "Dispatch Webhook Events", triggers: { event: "webhook/dispatch" } },
  async ({ event, step }) => {
    const { orgId, eventName, payload } = event.data as {
      orgId: string;
      eventName: string;
      payload: Record<string, unknown>;
    };

    const endpoints = await step.run("fetch-endpoints", async () => {
      return db.query.webhookEndpoints.findMany({
        where: and(
          eq(webhookEndpoints.orgId, orgId),
          eq(webhookEndpoints.isActive, true)
        ),
      });
    });

    const active = endpoints.filter((ep) => {
      const events = ep.events as string[];
      return events.length === 0 || events.includes(eventName) || events.includes("*");
    });

    await Promise.allSettled(
      active.map((ep) =>
        step.run(`deliver-${ep.id}`, async () => {
          const body = JSON.stringify({
            event: eventName,
            data: payload,
            timestamp: new Date().toISOString(),
          });
          const signature = createHmac("sha256", ep.secret).update(body).digest("hex");

          let statusCode: number | null = null;
          let responseBody: string | null = null;
          let success = false;

          try {
            const res = await fetch(ep.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Vaivamm-Signature": `sha256=${signature}`,
                "X-Webhook-Event": eventName,
              },
              body,
              signal: AbortSignal.timeout(10_000),
            });
            statusCode = res.status;
            responseBody = await res.text().catch(() => null);
            success = res.ok;
          } catch (deliveryErr) {
            responseBody =
              deliveryErr instanceof Error ? deliveryErr.message : "Request failed";
          }

          await db.insert(webhookLogs).values({
            endpointId: ep.id,
            orgId,
            event: eventName,
            payload,
            statusCode,
            responseBody: responseBody?.slice(0, 2000) ?? null,
            success,
          });

          if (!success) throw new Error(`Webhook delivery failed: ${statusCode}`);
        })
      )
    );

    return { dispatched: active.length };
  }
);
