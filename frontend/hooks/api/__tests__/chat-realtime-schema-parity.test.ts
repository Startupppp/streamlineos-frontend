import fs from "node:fs";
import { z } from "zod";
import { backendPath } from "@/test-utils/backend-repo";
import {
  messagePayloadSchema,
  messageUpdatedPayloadSchema,
  messageEntitiesUpdatedPayloadSchema,
  messageDeletedPayloadSchema,
  reactionUpdatedPayloadSchema,
  memberReadPayloadSchema,
} from "@/hooks/api/chat-realtime-schema";

type JsonSchema = { properties?: Record<string, JsonSchema>; required?: string[]; anyOf?: JsonSchema[]; type?: string };

const SNAPSHOT = backendPath("src", "modules", "chat", "events", "chat-event-schemas.snapshot.json");

const FRONTEND: Record<string, z.ZodType> = {
  "message.created": messagePayloadSchema,
  "message.updated": messageUpdatedPayloadSchema,
  "message.entities-updated": messageEntitiesUpdatedPayloadSchema,
  "message.deleted": messageDeletedPayloadSchema,
  "reaction.updated": reactionUpdatedPayloadSchema,
  "member.read": memberReadPayloadSchema,
};

function nullable(schema: JsonSchema | undefined): boolean {
  if (!schema) return true;
  if (schema.type === "null") return true;
  return schema.anyOf?.some(nullable) ?? false;
}

function shape(schema: JsonSchema): Record<string, { required: boolean; nullable: boolean }> {
  const required = new Set(schema.required ?? []);
  return Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([key, value]) => [
      key,
      { required: required.has(key), nullable: nullable(value) },
    ]),
  );
}

describe("frontend realtime schemas accept everything the backend emits", () => {
  const backend = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8")) as Record<string, { schema: JsonSchema }>;

  it("covers every chat-scope event kind the backend snapshot publishes", () => {
    expect(Object.keys(backend).filter((kind) => kind.startsWith("message.") || kind.startsWith("reaction.") || kind.startsWith("member.")).sort()).toEqual(
      Object.keys(FRONTEND).sort(),
    );
  });

  it.each(Object.keys(FRONTEND))("%s", (kind) => {
    const server = shape(backend[kind]!.schema);
    const client = shape(z.toJSONSchema(FRONTEND[kind]!, { io: "input", unrepresentable: "any" }) as JsonSchema);
    for (const [field, rule] of Object.entries(server)) {
      if (!client[field]) continue;
      if (!rule.required) expect({ field, required: client[field].required }).toEqual({ field, required: false });
      if (rule.nullable) expect({ field, nullable: client[field].nullable }).toEqual({ field, nullable: true });
    }
    for (const [field, rule] of Object.entries(client)) {
      if (rule.required) expect({ field, sentByServer: field in server }).toEqual({ field, sentByServer: true });
    }
  });
});
