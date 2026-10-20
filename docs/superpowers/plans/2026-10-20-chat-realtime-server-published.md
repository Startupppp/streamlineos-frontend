# Chat Program + Phase 1 (Server-Published Realtime) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sequence every Chat fix (architecture report candidates 1-8, verified defects, reset-plan CHAT-001..017), and fully specify Phase 1: every chat realtime event is published by the server through one chat events module, and clients only subscribe.

**Architecture:** A new `ChatEvents` module (`emit` = after-commit best effort, `deliver` = now, throws) validates each event against a per-kind zod schema and hands it to a `ChatEventSink` seam with two adapters: Ably (prod) and in-memory (tests). Typing moves to Ably presence. Client tokens lose `publish` and `history`.

**Tech Stack:** NestJS + Drizzle + zod 4 (backend, own git repo at `backend/`), Next.js + TanStack Query + ably-js + zod 4 (frontend), Jest on both sides.

**Spec:** `docs/adr/0001-chat-realtime-is-server-published.md`, `CONTEXT.md`, `docs/specs/chat/2026-10-20-product-chat-reset-plan.md`, architecture report `%TEMP%/architecture-review-20261020-225550.html`.

## Global Constraints

- Pushing `main` deploys to production (frontend: Vercel, backend: Railway). Never push without the user's go-ahead.
- `backend/` is a separate git repository. Commit backend files from `backend/`, frontend files from the root repo.
- Stage only your own files by path; the tree has unrelated peer edits (Knowledge/Wiki work). Never `git add -A`, never stash, never reset.
- Never run DB-backed specs or migrations: `.env` points at PRODUCTION. Phase 1 needs no migration.
- Backend typecheck needs `node --max-old-space-size=8192`. Run at most one `tsc` at a time.
- No code comments in new code. Export only what another module imports. No single-button components.
- Ably wire event names stay unchanged in Phase 1 (`message`, `message:updated`, `message:deleted`, `reaction:updated`, `huddle:*`, `notification:*`), so old and new clients interoperate across deploys.

---

# Part 0: Program roadmap

Each phase is its own plan. Only Phase 1 is detailed here; phases marked **grill first** need decisions before planning.

| Phase | Scope | Report | Reset plan | Defects closed |
|---|---|---|---|---|
| **1. Server-published realtime** (this plan) | ChatEvents module, presence typing, token permissions, huddle chat panel removed, system-message txn, huddle invite validation | C2 | CHAT-014 (+016/017 for its scope) | Ably publish over-grant; `sendSystemMessage` raw txn; huddle invite targets unchecked; spoofable typing name; realtime `senderId` sent as `""` |
| 2. Huddles on Meet/Teams | Provider selection via primary Composio connection, `meeting_provider` migration, deep huddle module, provider-aware UI | C5 | CHAT-002, 003, 004, 005, 015 | huddle kick unconfirmed |
| 3. One message contract | Send returns list shape; FE `Message = z.infer`; realtime/huddle/notification FE schemas composed from it; delete `chat-types.ts` | C3 | (enables 006, 016) | send response missing attachments/reactions/sender; optimistic message missing `reactions` |
| 4. Chat linked to every module (**grill first**) | Closed linked-record vocabulary from entity adapters; adapters for HR, Docs, Calendar, Support; FE renderer registry; embeddable record conversation | C8 | (plan "canonical links" must-have) | free-text `entity_type`; hardcoded Build-ticket pills/previews |
| 5. Chat location | URL as only source of channel/message/dialog; push not replace; fetch-until-found deep links; single dialog owner | C1 | CHAT-006, 007, 008 | URL read once; stale `?message`; dual New DM/Group dialogs; deep link to older message no-op |
| 6. Focused Chat UI | Reply/React/More; ConfirmDialog on delete/archive/leave/remove/kick/unpin; composer labels; infinite older-history; details/overflow model; inline shallow modules | C7 | CHAT-009, 010, 011, 012, 013 | hover-only delete; `window.confirm`; manual "Load older"; single-button modules |
| 7. Data-layer depth | One channel-access module; chat cache module (keys + patching); file regroup by concept | C4, C6 | — | edit vs delete race; thread replies missing `channelId`; presence join missing `org_id`; dead cursor NULL branches; `useThreadReplies` missing `INLINE_READ_ERROR`; orphan `chat.search` key; POST inside `useQuery` for invite link |
| 0. Product contract doc | `docs/specs/chat/00-chat-product-contract.md` | — | CHAT-001 | — |

Phase order: 1 → 2 → 3 → (grill 4) → 5 → 6 → 7. Phase 0 can run any time before Phase 2 ships.

## Phase 1 rollout: three deploys

The agreed order was frontend first, then backend. Chat channel tokens do not grant `presence` today, so presence-based typing would be refused. Three deploys keep every step safe:

1. **Deploy A (backend, additive):** Tasks 1-2. Events module exists, unused; chat tokens gain `presence`.
2. **Deploy B (frontend):** Tasks 3-5.
3. **Deploy C (backend, switch-over):** Tasks 6-10.

---

# Part 1: Phase 1 tasks

## File map

Backend (`backend/src/modules/...`):
- Create `chat/events/chat-event-schemas.ts`: per-kind zod schemas, wire map, `ChatEvent` type.
- Create `chat/events/chat-event-sink.ts`: `ChatEventSink` interface, token, `InMemoryChatEventSink`.
- Create `chat/events/ably-chat-event-sink.ts`: Ably adapter.
- Create `chat/events/chat-events.ts`: `ChatEvents` (`emit`, `deliver`).
- Create `chat/events/chat-event-schemas.snapshot.json`: generated JSON Schema, read by the frontend parity test.
- Create specs: `chat/events/chat-events.spec.ts`, `chat/events/chat-event-schemas.spec.ts`, `chat/events/ably-chat-event-sink.spec.ts`, `chat/chat-no-direct-ably.spec.ts`.
- Modify `realtime/ably.service.ts`, `realtime/ably.service.spec.ts`, `realtime/dto/realtime.schemas.ts`, `chat/chat.module.ts`, `chat/chat-messages.service.ts`, `chat/chat-message-moderation.service.ts`, `chat/chat-reactions.service.ts`, `chat/chat-message-fanout.service.ts`, `chat/chat-notifications.service.ts`, `chat/chat-huddles.service.ts`, `chat/chat-huddle-lifecycle.ts`, `chat/chat-huddle-start.ts`, `chat/chat-channels.controller.ts`.
- Delete `chat/chat-typing.service.ts`, `chat/chat-typing.service.spec.ts`, `chat/chat-typing.isolation.spec.ts`.

Frontend (`frontend/`):
- Modify `hooks/api/chat-realtime.ts`, `hooks/api/chat-realtime-schema.ts`, `features/chat/use-message-panel-data.ts`, `features/chat/huddle-panel.tsx`, `lib/ably-safe-subscribe.ts` (only if `typing` is listed there).
- Create `hooks/api/__tests__/chat-realtime-presence-typing.test.tsx`, `hooks/api/__tests__/chat-realtime-schema-parity.test.ts`.
- Modify `hooks/api/__tests__/chat-realtime-sender-spoof.test.tsx`.
- Delete `features/chat/huddle-chat-panel.tsx`.

---

### Task 1: Chat events module (Deploy A)

**Files:**
- Create: `backend/src/modules/chat/events/chat-event-schemas.ts`
- Create: `backend/src/modules/chat/events/chat-event-sink.ts`
- Create: `backend/src/modules/chat/events/ably-chat-event-sink.ts`
- Create: `backend/src/modules/chat/events/chat-events.ts`
- Create: `backend/src/modules/chat/events/chat-event-schemas.snapshot.json`
- Modify: `backend/src/modules/realtime/ably.service.ts` (add three methods)
- Modify: `backend/src/modules/realtime/dto/realtime.schemas.ts:40` (`senderId` nullable)
- Modify: `backend/src/modules/chat/chat.module.ts:64` (providers)
- Test: `backend/src/modules/chat/events/chat-events.spec.ts`, `chat-event-schemas.spec.ts`, `ably-chat-event-sink.spec.ts`

**Interfaces:**
- Produces: `ChatEvents.emit(event: ChatEvent): void`, `ChatEvents.deliver(event: ChatEvent): Promise<void>`, `ChatEvent`, `ChatEventKind`, `chatEventSchemas`, `CHAT_EVENT_WIRE`, `CHAT_EVENT_SINK`, `ChatEventSink`, `InMemoryChatEventSink`, `AblyService.publish(channel, name, data)`, `AblyService.huddleChannelName(orgId, channelId)`, `AblyService.userChannelName(orgId, userId)`.

- [ ] **Step 1: Write the failing `ChatEvents` spec**

`backend/src/modules/chat/events/chat-events.spec.ts`:

```ts
import { ChatEvents } from "./chat-events";
import { InMemoryChatEventSink } from "./chat-event-sink";
import type { ChatEvent } from "./chat-event-schemas";

jest.mock("../../../common/tenant/tenant-context", () => ({
  registerAfterCommit: jest.fn(() => false),
}));

const { registerAfterCommit } = jest.requireMock("../../../common/tenant/tenant-context") as {
  registerAfterCommit: jest.Mock;
};

const deleted: ChatEvent = {
  kind: "message.deleted",
  orgId: "org-1",
  channelId: 7,
  payload: { id: 42, channelId: 7 },
};

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("ChatEvents", () => {
  beforeEach(() => registerAfterCommit.mockReset().mockReturnValue(false));

  it("publishes immediately when there is no open transaction", async () => {
    const sink = new InMemoryChatEventSink();
    new ChatEvents(sink).emit(deleted);
    await flush();
    expect(sink.published).toEqual([deleted]);
  });

  it("defers to after-commit when a transaction is open", async () => {
    const hooks: Array<() => unknown> = [];
    registerAfterCommit.mockImplementation((fn: () => unknown) => {
      hooks.push(fn);
      return true;
    });
    const sink = new InMemoryChatEventSink();
    new ChatEvents(sink).emit(deleted);
    await flush();
    expect(sink.published).toEqual([]);
    await hooks[0]?.();
    expect(sink.published).toEqual([deleted]);
  });

  it("drops an invalid payload on emit without throwing", async () => {
    const sink = new InMemoryChatEventSink();
    const bad = { ...deleted, payload: { id: "x", channelId: 7 } } as unknown as ChatEvent;
    expect(() => new ChatEvents(sink).emit(bad)).not.toThrow();
    await flush();
    expect(sink.published).toEqual([]);
  });

  it("deliver throws on an invalid payload", async () => {
    const sink = new InMemoryChatEventSink();
    const bad = { ...deleted, payload: { id: "x", channelId: 7 } } as unknown as ChatEvent;
    await expect(new ChatEvents(sink).deliver(bad)).rejects.toThrow();
  });

  it("deliver throws when the sink skipped the publish", async () => {
    const sink = new InMemoryChatEventSink("skipped");
    await expect(new ChatEvents(sink).deliver(deleted)).rejects.toThrow("Ably is not configured");
  });

  it("emit swallows a sink failure", async () => {
    const sink = { publish: jest.fn().mockRejectedValue(new Error("ably down")) };
    new ChatEvents(sink).emit(deleted);
    await flush();
    expect(sink.publish).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd backend && npx jest src/modules/chat/events/chat-events.spec.ts`
Expected: FAIL, `Cannot find module './chat-events'`.

- [ ] **Step 3: Write the schemas**

`backend/src/modules/realtime/dto/realtime.schemas.ts` line 40: change `senderId: z.string(),` to `senderId: z.string().nullable(),`.

`backend/src/modules/chat/events/chat-event-schemas.ts`:

```ts
import { z } from "zod";
import { chatMessagePayloadSchema } from "../../realtime/dto/realtime.schemas";

const id = z.number().int();
const huddleMember = z.object({ huddleId: id, channelId: id, userId: z.string() });
const notification = {
  channelId: id,
  messageId: id,
  senderId: z.string().nullable(),
  senderName: z.string().nullable(),
  idempotencyKey: z.string().optional(),
};

export const chatEventSchemas = {
  "message.created": chatMessagePayloadSchema,
  "message.updated": z.object({
    id,
    channelId: id,
    content: z.string().nullable(),
    isEdited: z.literal(true),
    updatedAt: z.string(),
  }),
  "message.entities-updated": z.object({
    id,
    channelId: id,
    entities: z.array(z.object({ type: z.string(), id: z.string() })),
  }),
  "message.deleted": z.object({ id, channelId: id }),
  "reaction.updated": z.object({
    messageId: id,
    channelId: id,
    reactions: z.record(z.string(), z.array(z.string())),
  }),
  "huddle.started": z.object({ huddleId: id, channelId: id, startedBy: z.string() }),
  "huddle.ended": z.object({ huddleId: id, channelId: id }),
  "huddle.user-joined": huddleMember,
  "huddle.user-left": huddleMember,
  "huddle.host-transferred": z.object({
    huddleId: id,
    hostTransferred: z.literal(true),
    newHostMembershipId: id,
  }),
  "huddle.participant-kicked": z.object({ huddleId: id, userId: z.string(), kicked: z.literal(true) }),
  "user.huddle-kicked": z.object({ huddleId: id, channelId: id }),
  "user.huddle-invite": z.object({ huddleId: id, channelId: id, fromUserId: z.string() }),
  "user.message-notification": z.object({ ...notification, channelType: z.string().nullable() }),
  "user.mention-notification": z.object(notification),
} as const;

export type ChatEventKind = keyof typeof chatEventSchemas;

type Scope = "chat" | "huddle" | "user";

export const CHAT_EVENT_WIRE = {
  "message.created": { scope: "chat", name: "message" },
  "message.updated": { scope: "chat", name: "message:updated" },
  "message.entities-updated": { scope: "chat", name: "message:updated" },
  "message.deleted": { scope: "chat", name: "message:deleted" },
  "reaction.updated": { scope: "chat", name: "reaction:updated" },
  "huddle.started": { scope: "huddle", name: "huddle:started" },
  "huddle.ended": { scope: "huddle", name: "huddle:ended" },
  "huddle.user-joined": { scope: "huddle", name: "huddle:user_joined" },
  "huddle.user-left": { scope: "huddle", name: "huddle:user_left" },
  "huddle.host-transferred": { scope: "huddle", name: "huddle:state_updated" },
  "huddle.participant-kicked": { scope: "huddle", name: "huddle:state_updated" },
  "user.huddle-kicked": { scope: "user", name: "huddle:kicked" },
  "user.huddle-invite": { scope: "user", name: "notification:huddle_invite" },
  "user.message-notification": { scope: "user", name: "notification:message" },
  "user.mention-notification": { scope: "user", name: "notification:mention" },
} as const satisfies Record<ChatEventKind, { scope: Scope; name: string }>;

type Target<K extends ChatEventKind> = (typeof CHAT_EVENT_WIRE)[K]["scope"] extends "user"
  ? { userId: string }
  : { channelId: number };

export type ChatEvent = {
  [K in ChatEventKind]: { kind: K; orgId: string; payload: z.input<(typeof chatEventSchemas)[K]> } & Target<K>;
}[ChatEventKind];
```

- [ ] **Step 4: Write the sink seam and in-memory adapter**

`backend/src/modules/chat/events/chat-event-sink.ts`:

```ts
import type { ChatEvent } from "./chat-event-schemas";

export type ChatEventDelivery = "published" | "skipped";

export interface ChatEventSink {
  publish(event: ChatEvent): Promise<ChatEventDelivery>;
}

export const CHAT_EVENT_SINK = Symbol("CHAT_EVENT_SINK");

export class InMemoryChatEventSink implements ChatEventSink {
  readonly published: ChatEvent[] = [];

  constructor(private readonly outcome: ChatEventDelivery = "published") {}

  async publish(event: ChatEvent): Promise<ChatEventDelivery> {
    if (this.outcome === "published") this.published.push(event);
    return this.outcome;
  }

  ofKind<K extends ChatEvent["kind"]>(kind: K): Extract<ChatEvent, { kind: K }>[] {
    return this.published.filter((event): event is Extract<ChatEvent, { kind: K }> => event.kind === kind);
  }
}
```

- [ ] **Step 5: Write `ChatEvents`**

`backend/src/modules/chat/events/chat-events.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { logger } from "../../../common/logger/logger.service";
import { registerAfterCommit } from "../../../common/tenant/tenant-context";
import { chatEventSchemas, type ChatEvent } from "./chat-event-schemas";
import { CHAT_EVENT_SINK, type ChatEventSink } from "./chat-event-sink";

@Injectable()
export class ChatEvents {
  constructor(@Inject(CHAT_EVENT_SINK) private readonly sink: ChatEventSink) {}

  emit(event: ChatEvent): void {
    const send = (): Promise<void> =>
      this.publish(event, false).catch((error: unknown) => {
        logger.error("chat event publish failed", {
          kind: event.kind,
          orgId: event.orgId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    if (!registerAfterCommit(send)) void send();
  }

  async deliver(event: ChatEvent): Promise<void> {
    await this.publish(event, true);
  }

  private async publish(event: ChatEvent, required: boolean): Promise<void> {
    const payload = chatEventSchemas[event.kind].parse(event.payload);
    const outcome = await this.sink.publish({ ...event, payload } as ChatEvent);
    if (required && outcome === "skipped") throw new Error("Ably is not configured");
  }
}
```

- [ ] **Step 6: Run the `ChatEvents` spec**

Run: `cd backend && npx jest src/modules/chat/events/chat-events.spec.ts`
Expected: PASS (6 tests). If `registerAfterCommit`'s parameter type rejects `() => Promise<void>`, read its signature in `backend/src/common/tenant/tenant-context.ts` and match it. Do not cast.

- [ ] **Step 7: Write the failing Ably adapter spec**

`backend/src/modules/chat/events/ably-chat-event-sink.spec.ts`:

```ts
import { AblyChatEventSink } from "./ably-chat-event-sink";
import type { AblyService } from "../../realtime/ably.service";

function ablyStub(configured: boolean) {
  return {
    configured,
    channelName: (orgId: string, channelId: number) => `chat:${orgId}:${channelId}`,
    huddleChannelName: (orgId: string, channelId: number) => `huddle:${orgId}:${channelId}`,
    userChannelName: (orgId: string, userId: string) => `notifications:${orgId}:${userId}`,
    publish: jest.fn().mockResolvedValue(undefined),
  };
}

describe("AblyChatEventSink", () => {
  it("routes chat, huddle and user events to their channel with the legacy wire name", async () => {
    const ably = ablyStub(true);
    const sink = new AblyChatEventSink(ably as unknown as AblyService);
    await sink.publish({ kind: "message.deleted", orgId: "o", channelId: 7, payload: { id: 1, channelId: 7 } });
    await sink.publish({ kind: "huddle.ended", orgId: "o", channelId: 7, payload: { huddleId: 3, channelId: 7 } });
    await sink.publish({
      kind: "user.huddle-invite",
      orgId: "o",
      userId: "u-2",
      payload: { huddleId: 3, channelId: 7, fromUserId: "u-1" },
    });
    expect(ably.publish.mock.calls).toEqual([
      ["chat:o:7", "message:deleted", { id: 1, channelId: 7 }],
      ["huddle:o:7", "huddle:ended", { huddleId: 3, channelId: 7 }],
      ["notifications:o:u-2", "notification:huddle_invite", { huddleId: 3, channelId: 7, fromUserId: "u-1" }],
    ]);
  });

  it("skips without publishing when Ably is not configured", async () => {
    const ably = ablyStub(false);
    const sink = new AblyChatEventSink(ably as unknown as AblyService);
    await expect(
      sink.publish({ kind: "message.deleted", orgId: "o", channelId: 7, payload: { id: 1, channelId: 7 } }),
    ).resolves.toBe("skipped");
    expect(ably.publish).not.toHaveBeenCalled();
  });
});
```

Run: `cd backend && npx jest src/modules/chat/events/ably-chat-event-sink.spec.ts`
Expected: FAIL, module not found.

- [ ] **Step 8: Add the AblyService methods and the adapter**

In `backend/src/modules/realtime/ably.service.ts`, add after `presenceChannelName`:

```ts
  huddleChannelName(orgId: string, channelId: number): string {
    return cellPrefixed(this.cellId, `huddle:${orgId}:${channelId}`);
  }

  userChannelName(orgId: string, userId: string): string {
    return cellPrefixed(this.cellId, `notifications:${orgId}:${userId}`);
  }

  async publish(channel: string, name: string, data: unknown): Promise<void> {
    await this.rest().channels.get(channel).publish(name, data);
  }
```

`backend/src/modules/chat/events/ably-chat-event-sink.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { AblyService } from "../../realtime/ably.service";
import { CHAT_EVENT_WIRE, type ChatEvent } from "./chat-event-schemas";
import type { ChatEventDelivery, ChatEventSink } from "./chat-event-sink";

@Injectable()
export class AblyChatEventSink implements ChatEventSink {
  constructor(private readonly ably: AblyService) {}

  async publish(event: ChatEvent): Promise<ChatEventDelivery> {
    if (!this.ably.configured) return "skipped";
    await this.ably.publish(this.channelFor(event), CHAT_EVENT_WIRE[event.kind].name, event.payload);
    return "published";
  }

  private channelFor(event: ChatEvent): string {
    if ("userId" in event) return this.ably.userChannelName(event.orgId, event.userId);
    return CHAT_EVENT_WIRE[event.kind].scope === "huddle"
      ? this.ably.huddleChannelName(event.orgId, event.channelId)
      : this.ably.channelName(event.orgId, event.channelId);
  }
}
```

Run: `cd backend && npx jest src/modules/chat/events/ably-chat-event-sink.spec.ts`
Expected: PASS.

- [ ] **Step 9: Register providers**

In `backend/src/modules/chat/chat.module.ts`, import `ChatEvents`, `AblyChatEventSink`, `CHAT_EVENT_SINK` and add to `providers`:

```ts
    ChatEvents,
    { provide: CHAT_EVENT_SINK, useClass: AblyChatEventSink },
```

- [ ] **Step 10: Write the schema snapshot spec**

`backend/src/modules/chat/events/chat-event-schemas.spec.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CHAT_EVENT_WIRE, chatEventSchemas, type ChatEventKind } from "./chat-event-schemas";

const SNAPSHOT = path.join(__dirname, "chat-event-schemas.snapshot.json");

function generate(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const kind of Object.keys(chatEventSchemas) as ChatEventKind[]) {
    out[kind] = {
      wire: CHAT_EVENT_WIRE[kind],
      schema: z.toJSONSchema(chatEventSchemas[kind], { io: "input", unrepresentable: "any" }),
    };
  }
  return out;
}

describe("chat event schema snapshot", () => {
  it("matches the committed snapshot the frontend parity test reads", () => {
    const generated = JSON.stringify(generate(), null, 2) + "\n";
    if (process.env.UPDATE_CHAT_EVENT_SNAPSHOT === "1") fs.writeFileSync(SNAPSHOT, generated);
    expect(fs.readFileSync(SNAPSHOT, "utf8")).toBe(generated);
  });

  it("allows a null senderId on message.created", () => {
    expect(chatEventSchemas["message.created"].shape.senderId.safeParse(null).success).toBe(true);
  });
});
```

- [ ] **Step 11: Generate the snapshot, then verify it**

Run: `cd backend && UPDATE_CHAT_EVENT_SNAPSHOT=1 npx jest src/modules/chat/events/chat-event-schemas.spec.ts`
Then: `cd backend && npx jest src/modules/chat/events`
Expected: PASS, and `chat-event-schemas.snapshot.json` exists with 15 keys.

- [ ] **Step 12: Commit (backend repo)**

```bash
cd backend
git add src/modules/chat/events src/modules/realtime/ably.service.ts src/modules/realtime/dto/realtime.schemas.ts src/modules/chat/chat.module.ts
git commit -m "feat(chat): chat events module with per-kind schemas and Ably/in-memory sinks"
```

The `senderId` nullability change in `realtime.schemas.ts` widens the type, so callers still compile. The fanout keeps sending `""` until Task 7.

---

### Task 2: Grant presence on chat channels, additive (Deploy A)

**Files:**
- Modify: `backend/src/modules/realtime/ably.service.ts:69-77`
- Test: `backend/src/modules/realtime/ably.service.spec.ts:41-43`

- [ ] **Step 1: Update the spec expectation**

In `ably.service.spec.ts`, change lines 41-42 to:

```ts
    expect(capability["cell:legacy-1:chat:org-1:7"]).toEqual(["subscribe", "publish", "presence", "history"]);
    expect(capability["cell:legacy-1:chat:org-1:9"]).toEqual(["subscribe", "publish", "presence", "history"]);
```

Run: `cd backend && npx jest src/modules/realtime/ably.service.spec.ts`
Expected: FAIL on those two lines.

- [ ] **Step 2: Add `presence`**

In `createChatTokenRequest`, the chat channel entry becomes `["subscribe", "publish", "presence", "history"]`.

Run: `cd backend && npx jest src/modules/realtime/ably.service.spec.ts`
Expected: PASS.

- [ ] **Step 3: Typecheck and commit (backend repo)**

Run: `cd backend && node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`
Expected: no errors.

```bash
cd backend
git add src/modules/realtime/ably.service.ts src/modules/realtime/ably.service.spec.ts
git commit -m "feat(realtime): grant presence on chat channels for presence-based typing"
```

**Deploy A gate:** ask the user before pushing `backend` `main`. After Railway reports success, confirm the deploy is serving (Railway `success` can precede `failure`).

---

### Task 3: Typing over Ably presence (Deploy B)

**Files:**
- Modify: `frontend/hooks/api/chat-realtime.ts`
- Modify: `frontend/hooks/api/chat-realtime-schema.ts:73-76` (delete `typingPayloadSchema`)
- Modify: `frontend/features/chat/use-message-panel-data.ts:90,118`
- Test: `frontend/hooks/api/__tests__/chat-realtime-presence-typing.test.tsx`

**Interfaces:**
- Produces: `useChatRealtime(channelId)` returns `{ isConnected: boolean; typingUserIds: string[]; publishTyping: () => void }`.

- [ ] **Step 1: Write the failing test**

`frontend/hooks/api/__tests__/chat-realtime-presence-typing.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatRealtime } from "@/hooks/api/chat-realtime";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada" } },
    status: "authenticated",
  }),
}));
jest.mock("ably/react", () => ({ useAbly: jest.fn() }));
jest.mock("@/lib/ably", () => ({ reauthorizeAblyClients: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/features/chat/use-ably-connection", () => ({
  useAblyConnection: () => ({ isConnected: true, reconnectCount: 0 }),
}));

const { useAbly } = jest.requireMock("ably/react") as { useAbly: jest.Mock };

type PresenceListener = (member: { clientId: string; action: string; data: unknown }) => void;

function makeAbly() {
  let presenceListener: PresenceListener | null = null;
  const channel = {
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn(),
    publish: jest.fn().mockResolvedValue(undefined),
    presence: {
      subscribe: jest.fn((listener: PresenceListener) => {
        presenceListener = listener;
        return Promise.resolve();
      }),
      unsubscribe: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
    },
  };
  return {
    channel,
    emitPresence: (member: Parameters<PresenceListener>[0]) => presenceListener?.(member),
    client: { channels: { get: jest.fn().mockReturnValue(channel) }, connection: { state: "connected", on: jest.fn(), off: jest.fn() } },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useChatRealtime typing over presence", () => {
  it("never publishes a typing message, and marks itself typing through presence", async () => {
    const ably = makeAbly();
    useAbly.mockReturnValue(ably.client);
    const { result } = renderHook(() => useChatRealtime(7), { wrapper });
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    act(() => result.current.publishTyping());
    expect(ably.channel.publish).not.toHaveBeenCalled();
    expect(ably.channel.presence.update).toHaveBeenCalledWith({ typing: true });
  });

  it("reports other members typing by their Ably clientId, ignoring data claims", async () => {
    const ably = makeAbly();
    useAbly.mockReturnValue(ably.client);
    const { result } = renderHook(() => useChatRealtime(7), { wrapper });
    await waitFor(() => expect(ably.channel.presence.subscribe).toHaveBeenCalled());
    act(() => ably.emitPresence({ clientId: "user-2", action: "update", data: { typing: true, userId: "user-9" } }));
    expect(result.current.typingUserIds).toEqual(["user-2"]);
    act(() => ably.emitPresence({ clientId: "user-1", action: "update", data: { typing: true } }));
    expect(result.current.typingUserIds).toEqual(["user-2"]);
    act(() => ably.emitPresence({ clientId: "user-2", action: "leave", data: null }));
    expect(result.current.typingUserIds).toEqual([]);
  });
});
```

Run: `cd frontend && npx jest hooks/api/__tests__/chat-realtime-presence-typing.test.tsx`
Expected: FAIL (`presence.update` not called; `typingUserIds` undefined).

- [ ] **Step 2: Implement presence typing in `chat-realtime.ts`**

Make these changes:
1. `CHAT_EVENTS` becomes `["message", "message:updated", "message:deleted", "reaction:updated"] as const`.
2. Replace `isTrustedChatFrame` with:
   ```ts
   export function isTrustedChatFrame(event: ChatEvent, clientId: string | undefined): boolean {
     return !isForgedServerFrame(event, clientId);
   }
   ```
   In `guarded`, drop the `declared` extraction and call `isTrustedChatFrame(event, msg.clientId ?? undefined)`.
3. Delete `typingHandler`, its `typing` entry in `handlers`, `typingPayloadSchema` import, `TypingIndicator` import, and the `TypingIndicator` state.
4. Replace the typing state, timers and `publishTyping` with:

```ts
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;
    const channel = ably.channels.get(chatChannelName(orgId, channelId));
    const timers = typingTimers.current;
    const stop = (userId: string): void => {
      const timer = timers.get(userId);
      if (timer) clearTimeout(timer);
      timers.delete(userId);
      setTypingUserIds((prev) => prev.filter((id) => id !== userId));
    };
    const listener = (member: PresenceMessage): void => {
      const userId = member.clientId;
      if (!userId || userId === currentUserId) return;
      const typing =
        member.action !== "leave" &&
        member.action !== "absent" &&
        typeof member.data === "object" &&
        member.data !== null &&
        "typing" in member.data &&
        member.data.typing === true;
      if (!typing) return stop(userId);
      setTypingUserIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      const existing = timers.get(userId);
      if (existing) clearTimeout(existing);
      timers.set(userId, setTimeout(() => stop(userId), TYPING_TIMEOUT_MS));
    };
    void channel.presence.subscribe(listener).catch(() => {});
    return () => {
      channel.presence.unsubscribe(listener);
      void channel.presence.leave().catch(() => {});
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      setTypingUserIds([]);
    };
  }, [ably, channelId, orgId, currentUserId]);

  const publishTyping = useCallback(() => {
    if (!orgId || !channelId || channelId <= 0 || !currentUserId || !isConnected) return;
    void ably.channels
      .get(chatChannelName(orgId, channelId))
      .presence.update({ typing: true })
      .catch(() => {});
  }, [ably, channelId, orgId, currentUserId, isConnected]);

  return { isConnected, typingUserIds, publishTyping };
```

Import `PresenceMessage` from `"ably"` alongside `InboundMessage`. Update the return type annotation to `typingUserIds: string[]`. Remove the old typing-timer cleanup effect.

- [ ] **Step 3: Map ids to names in the panel**

In `frontend/features/chat/use-message-panel-data.ts`, line 90 destructures `typingUsers`. Change to `typingUserIds`, and before line 118 build names from the channel members already loaded in this hook:

```ts
  const typingUsers = useMemo(
    () =>
      typingUserIds.map((userId) => ({
        userId,
        name: channel?.members?.find((member) => member.userId === userId)?.name ?? "Someone",
      })),
    [typingUserIds, channel?.members],
  );
```

Read the `channel.members` element type in `frontend/types/chat.ts` first. If the id field is not `userId` or the name field is nullable, use the real field names and `?? "Someone"`. `useMemo` must come before line 118's `useChatTypingText(typingUsers)`.

- [ ] **Step 4: Delete `typingPayloadSchema`**

Remove lines 73-76 of `frontend/hooks/api/chat-realtime-schema.ts`. Then grep `frontend` for `typingPayloadSchema` and for `"typing"` in `lib/ably-safe-subscribe.ts`, and remove any remaining reference.

- [ ] **Step 5: Fix the spoof test for the new signature**

In `frontend/hooks/api/__tests__/chat-realtime-sender-spoof.test.tsx`, update every `isTrustedChatFrame(event, clientId, declared)` call to `isTrustedChatFrame(event, clientId)`. Delete cases that asserted typing-specific behaviour. Update the header doc block: tokens grant `subscribe` + `presence`, and typing is presence.

- [ ] **Step 6: Run the chat realtime tests**

Run: `cd frontend && npx jest hooks/api/__tests__ features/chat`
Expected: PASS. Fix any test still reading `typingUsers` from `useChatRealtime`.

- [ ] **Step 7: Commit (root repo)**

```bash
git add frontend/hooks/api/chat-realtime.ts frontend/hooks/api/chat-realtime-schema.ts frontend/features/chat/use-message-panel-data.ts frontend/hooks/api/__tests__/chat-realtime-presence-typing.test.tsx frontend/hooks/api/__tests__/chat-realtime-sender-spoof.test.tsx
git commit -m "feat(chat): typing indicator over Ably presence instead of client publish"
```

---

### Task 4: Remove the in-app huddle chat (Deploy B)

**Files:**
- Delete: `frontend/features/chat/huddle-chat-panel.tsx`
- Modify: `frontend/features/chat/huddle-panel.tsx:12,30,61-67,145-152,185-192`

- [ ] **Step 1: Write the failing assertion**

Add to the existing huddle panel test if one exists (`grep -rl "HuddlePanel" frontend --include=*.test.tsx`), otherwise create `frontend/features/chat/huddle-panel-no-chat.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

describe("huddle has no in-app chat", () => {
  it("does not ship the client-published huddle chat panel", () => {
    expect(fs.existsSync(path.join(__dirname, "huddle-chat-panel.tsx"))).toBe(false);
    const panel = fs.readFileSync(path.join(__dirname, "huddle-panel.tsx"), "utf8");
    expect(panel).not.toMatch(/HuddleChat|huddle:chat/);
  });
});
```

Run: `cd frontend && npx jest features/chat/huddle-panel-no-chat.test.ts`
Expected: FAIL.

- [ ] **Step 2: Remove the panel**

Delete `huddle-chat-panel.tsx`. In `huddle-panel.tsx`, remove the `HuddleChatPanel` import, the `showHuddleChat` state, `handleToggleHuddleChat`, `handleCloseHuddleChat`, the toggle button (around line 145-152) and the `{showHuddleChat && …}` block. Remove imports that become unused.

- [ ] **Step 3: Run tests, lint, commit**

Run: `cd frontend && npx jest features/chat && npx eslint features/chat/huddle-panel.tsx`
Expected: PASS, no lint errors.

```bash
git add frontend/features/chat/huddle-chat-panel.tsx frontend/features/chat/huddle-panel.tsx frontend/features/chat/huddle-panel-no-chat.test.ts
git commit -m "feat(chat): remove client-published huddle chat; Meet/Teams own meeting chat"
```

---

### Task 5: Frontend realtime parity with backend schemas (Deploy B)

**Files:**
- Modify: `frontend/hooks/api/chat-realtime-schema.ts:30` (`senderId` nullable)
- Modify: `frontend/hooks/api/chat-realtime.ts` (`payloadToMessage` sender)
- Test: `frontend/hooks/api/__tests__/chat-realtime-schema-parity.test.ts`

- [ ] **Step 1: Write the failing parity test**

`frontend/hooks/api/__tests__/chat-realtime-schema-parity.test.ts`:

```ts
import fs from "node:fs";
import { z } from "zod";
import { backendPath } from "@/test-utils/backend-repo";
import {
  messagePayloadSchema,
  messageUpdatedPayloadSchema,
  messageEntitiesUpdatedPayloadSchema,
  messageDeletedPayloadSchema,
  reactionUpdatedPayloadSchema,
} from "@/hooks/api/chat-realtime-schema";

type JsonSchema = { properties?: Record<string, JsonSchema>; required?: string[]; anyOf?: JsonSchema[]; type?: string };

const SNAPSHOT = backendPath("src", "modules", "chat", "events", "chat-event-schemas.snapshot.json");

const FRONTEND: Record<string, z.ZodType> = {
  "message.created": messagePayloadSchema,
  "message.updated": messageUpdatedPayloadSchema,
  "message.entities-updated": messageEntitiesUpdatedPayloadSchema,
  "message.deleted": messageDeletedPayloadSchema,
  "reaction.updated": reactionUpdatedPayloadSchema,
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
```

Run: `cd frontend && npx jest hooks/api/__tests__/chat-realtime-schema-parity.test.ts`
Expected: FAIL on `message.created` field `senderId` (nullable). Requires Task 1 merged in the sibling backend checkout.

- [ ] **Step 2: Make `senderId` nullable and map it**

`chat-realtime-schema.ts` line 30: `senderId: z.string().nullable(),`.

In `chat-realtime.ts` `payloadToMessage`, `senderId: payload.senderId` already matches `Message.senderId: string | null`. Set `sender: { id: payload.senderId, name: payload.senderName ?? null, image: payload.senderImage ?? null }`; `Message.sender.id` is `string | null` (`types/chat.ts:171`).

- [ ] **Step 3: Run tests and the frontend typecheck**

Run: `cd frontend && npx jest hooks/api/__tests__ && npx tsc --noEmit -p tsconfig.json`
Expected: PASS, no type errors.

- [ ] **Step 4: Commit (root repo)**

```bash
git add frontend/hooks/api/chat-realtime-schema.ts frontend/hooks/api/chat-realtime.ts frontend/hooks/api/__tests__/chat-realtime-schema-parity.test.ts
git commit -m "test(chat): realtime schema parity with backend chat event snapshot"
```

**Deploy B gate:** run `cd frontend && npx jest features/chat hooks/api && npx eslint features/chat hooks/api`. Ask the user before pushing `main`. Read Vercel's deployment `description` to confirm it built.

---

### Task 6: Message moderation, reactions and linked-record attach emit through ChatEvents (Deploy C)

**Files:**
- Modify: `backend/src/modules/chat/chat-message-moderation.service.ts:78-84,117-120`
- Modify: `backend/src/modules/chat/chat-reactions.service.ts:74-78,102-106`
- Modify: `backend/src/modules/chat/chat-messages.service.ts:416-422` (`attachEntity`)
- Test: the existing specs for these services

- [ ] **Step 1: Point the specs at the in-memory sink**

In each existing spec that constructs these services (find with `grep -ln "ChatMessageModerationService\|ChatReactionsService\|attachEntity" backend/src/modules/chat/*.spec.ts`), replace the `AblyService` mock with:

```ts
const events = new InMemoryChatEventSink();
const chatEvents = new ChatEvents(events);
```

Pass `chatEvents` to the constructor. Assert on the event, for example for edit:

```ts
expect(events.ofKind("message.updated")).toEqual([
  expect.objectContaining({ orgId: "org-1", channelId: 7, payload: expect.objectContaining({ id: 42, isEdited: true }) }),
]);
```

For delete: `events.ofKind("message.deleted")`. For reactions: `events.ofKind("reaction.updated")` with `payload.reactions`. For attach: `events.ofKind("message.entities-updated")`.

Run those specs. Expected: FAIL, because the constructors still take `AblyService`.

- [ ] **Step 2: Swap the dependency and calls**

In each service, replace the `AblyService` constructor parameter with `private readonly events: ChatEvents`. Replace each publish:

```ts
this.events.emit({
  kind: "message.updated",
  orgId,
  channelId: message.channelId,
  payload: { id: messageId, channelId: message.channelId, content: content.trim(), isEdited: true, updatedAt: updatedAt.toISOString() },
});
```

```ts
this.events.emit({ kind: "message.deleted", orgId, channelId: message.channelId, payload: { id: messageId, channelId: message.channelId } });
```

```ts
this.events.emit({ kind: "reaction.updated", orgId, channelId, payload: { messageId, channelId, reactions } });
```

`attachEntity` (replace the `publish` closure and `registerAfterCommit` line; `emit` already defers to after-commit):

```ts
this.events.emit({ kind: "message.entities-updated", orgId, channelId, payload: { id: messageId, channelId, entities: [entity] } });
```

- [ ] **Step 3: Run specs and commit (backend repo)**

Run: `cd backend && npx jest src/modules/chat/chat-message-moderation src/modules/chat/chat-reactions src/modules/chat/chat-messages.service.spec.ts`
Expected: PASS.

```bash
cd backend
git add src/modules/chat/chat-message-moderation.service.ts src/modules/chat/chat-reactions.service.ts src/modules/chat/chat-messages.service.ts src/modules/chat/*.spec.ts
git commit -m "refactor(chat): edits, deletes, reactions and entity attach emit chat events"
```

Stage only the spec files you edited, not the `*.spec.ts` glob, if other specs are dirty.

---

### Task 7: System messages in the tenant transaction; durable sends through `deliver` (Deploy C)

**Files:**
- Modify: `backend/src/modules/chat/chat-messages.service.ts:425-505` (`sendSystemMessage`)
- Modify: `backend/src/modules/chat/chat-message-fanout.service.ts:64-85`
- Modify: `backend/src/modules/chat/chat-notifications.service.ts:113-143,212-242`
- Test: `backend/src/modules/chat/chat-messages.service.spec.ts`, `chat-message-fanout-interface.spec.ts`, `chat-notifications.service.spec.ts`

- [ ] **Step 1: Write the failing system-message test**

In `chat-messages.service.spec.ts`, add a case using the spec's existing DB stub conventions:

```ts
it("writes a system message inside the tenant transaction and emits message.created after commit", async () => {
  await service.sendSystemMessage(7, "user-1", "org-1", "Ada joined", { kind: "member_joined" });
  expect(runInTenantTransaction).toHaveBeenCalledWith(expect.anything(), expect.any(Function), { orgId: "org-1" });
  expect(events.ofKind("message.created")).toEqual([
    expect.objectContaining({
      orgId: "org-1",
      channelId: 7,
      payload: expect.objectContaining({ messageType: "system", senderId: "user-1" }),
    }),
  ]);
});
```

If the spec does not already mock `run-in-tenant-transaction`, add `jest.mock("../../common/tenant/run-in-tenant-transaction", …)` mirroring how the spec stubs `this.db.transaction`. Keep the existing tx stub and route it through the mocked `runInTenantTransaction`.

Run it. Expected: FAIL.

- [ ] **Step 2: Rewrite `sendSystemMessage`**

Change `this.db.transaction(async (tx) => {` to `runInTenantTransaction(this.db, async (tx) => {` and close with `}, { orgId });`. Inside the transaction, after the insert, emit (it registers after-commit):

```ts
      this.events.emit({
        kind: "message.created",
        orgId,
        channelId,
        payload: {
          id: created.id,
          channelId: created.channelId,
          senderId,
          senderName: senderRow?.name ?? null,
          senderImage: null,
          content: created.content,
          createdAt: created.createdAt,
          replyToId: created.replyToId,
          metadata: strippedReferenceMetadata(metadata),
          messageType: "system",
          attachments: [],
        },
      });
```

Delete the `void this.ably.publishChatMessage(...)` block after the transaction, then the now-unused destructured `message`/`senderName` return. Add `private readonly events: ChatEvents` to the constructor; remove `AblyService` if nothing else uses it.

The outbox backstop is deliberately not added for system messages. The existing fanout consumer also sends web push and inbox notifications, which join/leave messages must not trigger. Reconnect refetch covers a lost publish.

- [ ] **Step 3: Route durable fanout through `deliver`**

In `ChatMessageFanoutService`, replace the `AblyService` dependency with `ChatEvents`, and `send` with:

```ts
    const send = () =>
      this.events.deliver({
        kind: "message.created",
        orgId,
        channelId,
        payload: {
          id: message.id,
          channelId: message.channelId,
          senderId: input.senderUserId,
          senderName,
          senderImage,
          content: message.content,
          createdAt: message.createdAt,
          replyToId: message.replyToId,
          metadata: strippedMetadata,
          messageType: message.messageType,
          attachments,
          clientKey: message.clientKey ?? null,
          idempotencyKey: context?.idempotencyKey ?? messageFanoutIdempotencyKey(input),
        },
      });
```

`senderId` is now `input.senderUserId` (nullable), not `?? ""`. In `chat-notifications.service.ts`, replace the four `this.ably.publishToUser(...)` calls:

```ts
this.events.deliver({
  kind: "user.message-notification",
  orgId,
  userId,
  payload: {
    channelId,
    messageId: message.id,
    senderId: message.senderUserId ?? null,
    senderName: message.senderName,
    channelType,
    idempotencyKey: `${idempotencyKey}:${userId}`,
  },
})
```

Use the same shape without `channelType` and with `kind: "user.mention-notification"` for mentions. Drop `idempotencyKey` in the non-ledger branches. `deliver` throws, so the ledger and `boundedMap` failure reporting keep working.

- [ ] **Step 4: Update fanout/notification specs to the in-memory sink, run, commit**

Replace `publishChatMessage`/`publishToUser` mock assertions with `events.ofKind("message.created")`, `events.ofKind("user.message-notification")` and `events.ofKind("user.mention-notification")`. For "Ably not configured must throw" cases, construct `new ChatEvents(new InMemoryChatEventSink("skipped"))`.

Run: `cd backend && npx jest src/modules/chat/chat-messages.service.spec.ts src/modules/chat/chat-message-fanout-interface.spec.ts src/modules/chat/chat-notifications.service.spec.ts src/modules/chat/chat-fanout-outbox.consumer.spec.ts`
Expected: PASS.

```bash
cd backend
git add src/modules/chat/chat-messages.service.ts src/modules/chat/chat-message-fanout.service.ts src/modules/chat/chat-notifications.service.ts src/modules/chat/chat-messages.service.spec.ts src/modules/chat/chat-message-fanout-interface.spec.ts src/modules/chat/chat-notifications.service.spec.ts
git commit -m "fix(chat): system messages in tenant txn; durable sends and notifications via chat events"
```

---

### Task 8: Huddle events through ChatEvents; invites limited to channel members (Deploy C)

**Files:**
- Modify: `backend/src/modules/chat/chat-huddles.service.ts:95-176`
- Modify: `backend/src/modules/chat/chat-huddle-lifecycle.ts:115-150`
- Modify: `backend/src/modules/chat/chat-huddle-start.ts:150-157` and its `deps` type
- Test: `backend/src/modules/chat/chat-huddles.service.spec.ts`

- [ ] **Step 1: Write the failing invite tests**

In `chat-huddles.service.spec.ts`, using its existing setup and an in-memory sink:

```ts
it("rejects the whole invite with 422 when any target is not a channel member", async () => {
  await expect(service.inviteToHuddle(3, "user-1", "org-1", ["user-2", "outsider"])).rejects.toMatchObject({
    status: 422,
    response: expect.objectContaining({ invalidUserIds: ["outsider"] }),
  });
  expect(events.ofKind("user.huddle-invite")).toEqual([]);
});

it("invites channel members through chat events", async () => {
  await service.inviteToHuddle(3, "user-1", "org-1", ["user-2"]);
  expect(events.ofKind("user.huddle-invite")).toEqual([
    { kind: "user.huddle-invite", orgId: "org-1", userId: "user-2", payload: { huddleId: 3, channelId: 7, fromUserId: "user-1" } },
  ]);
});
```

Seed `user-2` as an active member of channel 7 and `outsider` as not, following how the spec seeds `assertMember`.

Run: `cd backend && npx jest src/modules/chat/chat-huddles.service.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Validate invite targets**

In `inviteToHuddle`, after `assertHuddleInviteCapacity`:

```ts
    const memberIds = await this.channelMemberUserIds(orgId, huddle.channelId, targetUserIds);
    const invalidUserIds = targetUserIds.filter((userId) => !memberIds.has(userId));
    if (invalidUserIds.length > 0)
      throw new UnprocessableEntityException({ message: "Invitees must be channel members", invalidUserIds });
    for (const userId of targetUserIds)
      this.events.emit({
        kind: "user.huddle-invite",
        orgId,
        userId,
        payload: { huddleId, channelId: huddle.channelId, fromUserId },
      });
```

Add the private helper:

```ts
  private async channelMemberUserIds(orgId: string, channelId: number, userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const rows = await this.db
      .select({ userId: organizationMembers.userId })
      .from(chatChannelMembers)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.id, chatChannelMembers.membershipId),
          eq(organizationMembers.orgId, chatChannelMembers.orgId),
        ),
      )
      .where(
        and(
          eq(chatChannelMembers.orgId, orgId),
          eq(chatChannelMembers.channelId, channelId),
          eq(organizationMembers.status, "active"),
          inArray(organizationMembers.userId, userIds),
        ),
      );
    return new Set(rows.map((row) => row.userId));
  }
```

Check the column names against `backend/src/db/schema/chat/chat-channel-tables.ts` (member FK column) and the `organizationMembers` schema (status enum value for active). Match `assertChannelMember`'s definition of "active member" in `chat-channel-authorization.ts`. If it uses a different predicate, copy it, because Phase 7 unifies these. Import `UnprocessableEntityException` from `@nestjs/common`. Confirm the controller's DTO caps `targetUserIds` at `HUDDLE_INVITE_MAX_TARGETS`.

- [ ] **Step 3: Replace the remaining huddle publishes**

| Site | Replacement |
|---|---|
| `chat-huddles.service.ts` `joinHuddle` | `this.events.emit({ kind: "huddle.user-joined", orgId, channelId: huddle.channelId, payload: { huddleId, userId, channelId: huddle.channelId } })` |
| `leaveHuddle` | `kind: "huddle.user-left"`, same payload |
| `kickParticipant` state update | `this.events.emit({ kind: "huddle.participant-kicked", orgId, channelId: huddle.channelId, payload: { huddleId, userId: targetUserId, kicked: true } })` |
| `kickParticipant` user notice | `this.events.emit({ kind: "user.huddle-kicked", orgId, userId: targetUserId, payload: { huddleId, channelId: huddle.channelId } })`, and delete the `.catch` logger block |
| `chat-huddle-lifecycle.ts` `transferHuddleHost` | `events.emit({ kind: "huddle.host-transferred", orgId, channelId: huddle.channelId, payload: { huddleId: huddle.id, hostTransferred: true, newHostMembershipId } })` |
| `endHuddle` | `events.emit({ kind: "huddle.ended", orgId, channelId: huddle.channelId, payload: { huddleId: huddle.id, channelId: huddle.channelId } })` |
| `chat-huddle-start.ts` | `deps.events.emit({ kind: "huddle.started", orgId, channelId, payload: { huddleId: huddle.id, channelId, startedBy: userId } })` |

Change the `ably: AblyService` parameter of `transferHuddleHost`/`endHuddle` to `events: ChatEvents`, and the `ably` field in `chat-huddle-start.ts`'s `deps` type to `events: ChatEvents`. Update every caller (`grep -n "endHuddle\|transferHuddleHost\|ably:" backend/src/modules/chat/chat-huddle*.ts`). If `chat-huddle-signals.service.ts` or other huddle files still reference `this.ably.publish*`, convert them the same way.

- [ ] **Step 4: Run huddle specs and commit (backend repo)**

Run: `cd backend && npx jest src/modules/chat/chat-huddle`
Expected: PASS. Update other huddle specs from Ably mocks to `events.ofKind(...)` as in Task 6.

```bash
cd backend
git add src/modules/chat/chat-huddles.service.ts src/modules/chat/chat-huddle-lifecycle.ts src/modules/chat/chat-huddle-start.ts src/modules/chat/chat-huddles.service.spec.ts
git commit -m "fix(chat): huddle events via chat events; invites limited to channel members (422)"
```

Add any other huddle files and specs you edited to `git add` by path.

---

### Task 9: Subscribe-only tokens; delete the dead typing endpoints (Deploy C)

**Files:**
- Modify: `backend/src/modules/realtime/ably.service.ts` (capability; delete `publishChatMessage`, `publishChatEvent`, `publishHuddleEvent`, and `publishToUser` if unused outside chat)
- Modify: `backend/src/modules/realtime/ably.service.spec.ts:41-43,73`
- Modify: `backend/src/modules/chat/chat-channels.controller.ts:25,72,421-448`
- Modify: `backend/src/modules/chat/chat.module.ts:29,78`
- Delete: `backend/src/modules/chat/chat-typing.service.ts`, `chat-typing.service.spec.ts`, `chat-typing.isolation.spec.ts`

- [ ] **Step 1: Update capability expectations**

In `ably.service.spec.ts`:

```ts
    expect(capability["cell:legacy-1:chat:org-1:7"]).toEqual(["subscribe", "presence"]);
    expect(capability["cell:legacy-1:chat:org-1:9"]).toEqual(["subscribe", "presence"]);
    expect(capability["cell:legacy-1:huddle:org-1:7"]).toEqual(["subscribe"]);
```

Apply the same change at line 73. Add:

```ts
  it("never grants publish or history on any chat-token channel", () => {
    const { capability } = capabilityFor(service, () => service.createChatTokenRequest("user-1", "org-1", [7, 9]));
    for (const ops of Object.values(capability)) {
      expect(ops).not.toContain("publish");
      expect(ops).not.toContain("history");
    }
  });
```

Match the existing `capabilityFor` call style in the file for the third argument. Run: `cd backend && npx jest src/modules/realtime/ably.service.spec.ts`. Expected: FAIL.

- [ ] **Step 2: Shrink the capability**

Chat channel: `["subscribe", "presence"]`. Huddle channel: `["subscribe"]`. Run the spec. Expected: PASS.

- [ ] **Step 3: Delete the old publish methods**

Run `grep -rn "publishChatMessage\|publishChatEvent\|publishHuddleEvent\|publishToUser" backend/src --include=*.ts`. Delete each method from `AblyService` that has no remaining non-spec caller. Keep `publishToUser` if a non-chat module (support, notifications) uses it. Delete spec cases that only exercised deleted methods.

- [ ] **Step 4: Delete the typing endpoints**

Remove the two `typing` handlers (lines ~421-448), the `ChatTypingService` import and the constructor parameter from `chat-channels.controller.ts`. Remove `ChatTypingService` from `chat.module.ts`. Delete the three typing files. Run `cd frontend && grep -rn "/typing" --include=*.ts --include=*.tsx hooks features lib` and expect no hits. Regenerate the OpenAPI output (`cd backend && pnpm openapi:gen`, which needs no DB) and commit its diff alongside.

- [ ] **Step 5: Commit (backend repo)**

```bash
cd backend
git add src/modules/realtime/ably.service.ts src/modules/realtime/ably.service.spec.ts src/modules/chat/chat-channels.controller.ts src/modules/chat/chat.module.ts src/modules/chat/chat-typing.service.ts src/modules/chat/chat-typing.service.spec.ts src/modules/chat/chat-typing.isolation.spec.ts
git commit -m "fix(realtime): subscribe-only chat/huddle tokens; delete unused typing endpoints"
```

Add the regenerated OpenAPI file(s) by path.

---

### Task 10: Guard the seam and verify (Deploy C)

**Files:**
- Create: `backend/src/modules/chat/chat-no-direct-ably.spec.ts`

- [ ] **Step 1: Write the guard spec**

```ts
import fs from "node:fs";
import path from "node:path";

const CHAT_DIR = __dirname;
const ALLOWED = new Set([
  path.join(CHAT_DIR, "events", "ably-chat-event-sink.ts"),
  path.join(CHAT_DIR, "chat-realtime.controller.ts"),
]);

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return entry.name.endsWith(".ts") && !entry.name.includes(".spec.") ? [full] : [];
  });
}

describe("chat realtime seam", () => {
  it("only the Ably sink and the token controller import AblyService", () => {
    const offenders = sources(CHAT_DIR).filter(
      (file) => !ALLOWED.has(file) && /from "\.\.\/(\.\.\/)?realtime\/ably\.service"/.test(fs.readFileSync(file, "utf8")),
    );
    expect(offenders.map((file) => path.relative(CHAT_DIR, file))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and fix offenders**

Run: `cd backend && npx jest src/modules/chat/chat-no-direct-ably.spec.ts`
Expected: PASS. If a file is listed, convert its publish to `ChatEvents` as in Tasks 6-8. A file that only uses `ably.configured` or a channel-name helper (for example `chat-message-fanout.service.ts` or presence) should get that value through `ChatEvents` or be added to `ALLOWED` with the user's agreement.

- [ ] **Step 3: Full verification**

Run, one at a time:
1. `cd backend && npx jest src/modules/chat src/modules/realtime`
2. `cd backend && node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`
3. `cd backend && pnpm lint`
4. `cd frontend && npx jest hooks/api features/chat lib/__tests__/ably-channel-names.test.ts`
5. `cd frontend && npx tsc --noEmit -p tsconfig.json && npx eslint features/chat hooks/api`

Expected: all green. Report any failure verbatim, and say which are pre-existing (compare with the same command on the pre-session commit; do not use git stash).

- [ ] **Step 4: Commit (backend repo)**

```bash
cd backend
git add src/modules/chat/chat-no-direct-ably.spec.ts
git commit -m "test(chat): only the Ably sink publishes chat realtime"
```

**Deploy C gate:** ask the user before pushing backend `main`. After deploy, browser-check `/chat` against production with two accounts: typing shows the right name, messages and reactions arrive live, huddle start/end updates, and the console shows no Ably 40160 capability errors. Live-only checks are the user's call to run.

---

## Self-review notes

- Coverage: C2 decisions Q1-Q13 map to Tasks 1-10. Q10 reconnect refetch already exists (`invalidateChatReconnect` refetches messages, `myChannels`, `unreadTotal`), so no task changes it. CHAT-014 is Tasks 4 and 9. Phases 2-7 and CHAT-001..013, 015 are in Part 0.
- Deviations from the agreed design, flagged to the user: three deploys instead of two (presence capability); no outbox backstop for system messages (the consumer would send push/inbox for join/leave).
- Type names used across tasks: `ChatEvents.emit/deliver`, `ChatEvent`, `InMemoryChatEventSink.ofKind`, `CHAT_EVENT_SINK`, `AblyService.publish/huddleChannelName/userChannelName`, `useChatRealtime → typingUserIds`.
