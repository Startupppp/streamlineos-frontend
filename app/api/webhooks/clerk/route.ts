import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "../../../../lib/db";
import { users } from "../../../../lib/db/schema";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Handle the event
  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const {
      id,
      email_addresses,
      first_name,
      last_name,
      phone_numbers,
      public_metadata,
    } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return new Response("Error: No email address", { status: 400 });
    }

    const role = (public_metadata as { role?: string })?.role || "MEMBER";

    await db
      .insert(users)
      .values({
        id: id,
        email: email,
        firstName: first_name,
        lastName: last_name,
        role: role as "MEMBER" | "ADMIN" | "OWNER" | "CLIENT",
        phone: phone_numbers[0]?.phone_number,
        metadata: public_metadata as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: email,
          firstName: first_name,
          lastName: last_name,
          role: role as "MEMBER" | "ADMIN" | "OWNER" | "CLIENT",
          phone: phone_numbers[0]?.phone_number,
          updatedAt: new Date(),
        },
      });
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      // Ideally we might soft delete or archive, but for now strict delete or ignore logic
      // to avoid breaking FK constraints on logs.
      // For a CRM, we usually keep the user record.
      // Let's NOT delete for now to preserve history.
      console.log(`User ${id} deleted in Clerk. Keeping DB record for audit.`);
    }
  }

  return new Response("", { status: 200 });
}
