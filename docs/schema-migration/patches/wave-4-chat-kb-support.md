---
type: wave-4 patch spec (chat+kb+support)
status: DRAFT
date: 2026-07-26
companion: wave-0-composite-fk-matrix-crm-projects-misc.md (Parts E, F, G)
wave-in-matrix: W7-G
---

# Wave 4 Patch Spec — Chat + KB + Support Tenant-Safe FK Work

> **HIGHEST PRIORITY FINDING:** Chat has **8 tables with no `org_id` column at all** (`chat_channel_members`, `chat_messages`, `chat_attachments`, `chat_pinned_messages`, `chat_saved_messages`, `chat_huddles`, `chat_huddle_participants`, `chat_channel_invite_links`). These tables are reachable by any tenant that can guess or enumerate an integer channel/message ID. Until `org_id` is added and every service method applies an org-scoped WHERE, cross-tenant data leakage via direct FK traversal is possible. This is a P0 tenant-isolation gap.

---

## Prerequisites and Ordering

Every step below must run in the order shown. Composite FKs require the parent to already have a `unique(org_id, id)` candidate key constraint — none of the parents listed here have one today. The ordering is:

1. Add `unique(org_id, id)` candidate keys to anchor tables (`chat_channels`, `support_tickets`, `kb_spaces`, `kb_articles`, `kb_pages`).
2. Add `org_id` column to the 8 org-id-missing tables; backfill from the parent row; set NOT NULL.
3. Drop old uniqueIndexes that will conflict, then re-create them widened with `org_id`.
4. Add composite FK declarations.
5. VALIDATE constraints (separate transaction after backfill confirms zero nulls).

All `NOT VALID` → `VALIDATE CONSTRAINT` two-step sequences are mandatory on production (Neon/Postgres) to avoid full-table lock during backfill.

---

## PART A — CHAT MODULE (`backend/src/db/schema/chat.ts`)

### A-0: Prerequisite — Add `unique(org_id, id)` to `chat_channels`

Before any child table can carry a composite FK to `chat_channels`, the parent needs a candidate key constraint.

**SQL:**
```sql
-- A-0: chat_channels candidate key (no Drizzle change needed — candidate key only)
ALTER TABLE chat_channels
  ADD CONSTRAINT uniq_chat_channels_org_id
  UNIQUE (org_id, id);
```

**Drizzle (add to `chatChannels` table builder array):**
```ts
uniqueIndex("uniq_chat_channels_org_id").on(table.orgId, table.id),
```

---

### A-1: `chat_channel_members` — Add `org_id`, backfill, composite FK

**Before (Drizzle):**
```ts
export const chatChannelMembers = pgTable("chat_channel_members", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("MEMBER").notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  mutedUntil: timestamp("muted_until"),
  archivedAt: timestamp("archived_at"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  notificationPreference: text("notification_preference").default("DEFAULT").notNull(),
}, (table) => [
  uniqueIndex("uniq_channel_member").on(table.channelId, table.userId),
  index("idx_chat_members_user").on(table.userId),
  index("idx_chat_members_channel").on(table.channelId),
]);
```

**After (Drizzle):**
```ts
export const chatChannelMembers = pgTable("chat_channel_members", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  channelId: integer("channel_id").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("MEMBER").notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  mutedUntil: timestamp("muted_until"),
  archivedAt: timestamp("archived_at"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  notificationPreference: text("notification_preference").default("DEFAULT").notNull(),
}, (table) => [
  uniqueIndex("uniq_channel_member").on(table.orgId, table.channelId, table.userId),
  index("idx_chat_members_user").on(table.userId),
  index("idx_chat_members_channel").on(table.channelId),
  index("idx_chat_members_org").on(table.orgId),
  foreignKey({
    name: "fk_chat_channel_members_org_channel",
    columns: [table.orgId, table.channelId],
    foreignColumns: [chatChannels.orgId, chatChannels.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL (migration):**
```sql
-- A-1a: add column nullable first
ALTER TABLE chat_channel_members
  ADD COLUMN org_id text;

-- A-1b: backfill from parent channel
UPDATE chat_channel_members cm
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = cm.channel_id;

-- A-1c: verify zero nulls before NOT NULL
-- SELECT COUNT(*) FROM chat_channel_members WHERE org_id IS NULL;

-- A-1d: set NOT NULL
ALTER TABLE chat_channel_members
  ALTER COLUMN org_id SET NOT NULL;

-- A-1e: add FK to organizations
ALTER TABLE chat_channel_members
  ADD CONSTRAINT chat_channel_members_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- A-1f: drop old unique (channelId, userId), re-create with org_id
DROP INDEX IF EXISTS uniq_channel_member;
CREATE UNIQUE INDEX uniq_channel_member ON chat_channel_members (org_id, channel_id, user_id);

-- A-1g: composite FK to chat_channels(org_id, id)
ALTER TABLE chat_channel_members
  ADD CONSTRAINT fk_chat_channel_members_org_channel
  FOREIGN KEY (org_id, channel_id) REFERENCES chat_channels(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-1h: validate (run after backfill confirmed)
ALTER TABLE chat_channel_members VALIDATE CONSTRAINT chat_channel_members_org_id_fkey;
ALTER TABLE chat_channel_members VALIDATE CONSTRAINT fk_chat_channel_members_org_channel;

-- A-1i: add org index
CREATE INDEX idx_chat_members_org ON chat_channel_members (org_id);
```

**Backfill query:**
```sql
UPDATE chat_channel_members cm
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = cm.channel_id
  AND cm.org_id IS NULL;
```

---

### A-2: `chat_messages` — Add `org_id`, backfill from `chat_channels`, composite FK

**Before (Drizzle — relevant columns/constraints):**
```ts
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId
}, (table) => [
  foreignKey({ columns: [table.replyToId], foreignColumns: [table.id] }).onDelete("set null"),
  index("idx_chat_messages_channel").on(table.channelId, table.createdAt),
  index("idx_chat_messages_sender").on(table.senderId),
  index("idx_chat_messages_unread").on(table.channelId, table.isDeleted, table.createdAt),
]);
```

**After (Drizzle):**
```ts
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  channelId: integer("channel_id").notNull(),
  // ... rest unchanged
}, (table) => [
  foreignKey({ columns: [table.replyToId], foreignColumns: [table.id] }).onDelete("set null"),
  index("idx_chat_messages_channel").on(table.channelId, table.createdAt),
  index("idx_chat_messages_sender").on(table.senderId),
  index("idx_chat_messages_unread").on(table.channelId, table.isDeleted, table.createdAt),
  index("idx_chat_messages_org").on(table.orgId),
  foreignKey({
    name: "fk_chat_messages_org_channel",
    columns: [table.orgId, table.channelId],
    foreignColumns: [chatChannels.orgId, chatChannels.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- A-2a: add nullable
ALTER TABLE chat_messages ADD COLUMN org_id text;

-- A-2b: backfill
UPDATE chat_messages m
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = m.channel_id
  AND m.org_id IS NULL;

-- A-2c: NOT NULL
ALTER TABLE chat_messages ALTER COLUMN org_id SET NOT NULL;

-- A-2d: org FK NOT VALID
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- A-2e: composite FK NOT VALID
ALTER TABLE chat_messages
  ADD CONSTRAINT fk_chat_messages_org_channel
  FOREIGN KEY (org_id, channel_id) REFERENCES chat_channels(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-2f: index for org-scoped queries
CREATE INDEX idx_chat_messages_org ON chat_messages (org_id);

-- A-2g: validate
ALTER TABLE chat_messages VALIDATE CONSTRAINT chat_messages_org_id_fkey;
ALTER TABLE chat_messages VALIDATE CONSTRAINT fk_chat_messages_org_channel;
```

**Backfill query:**
```sql
UPDATE chat_messages m
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = m.channel_id
  AND m.org_id IS NULL;
```

---

### A-3: `chat_attachments` — Add `org_id`, backfill via `chat_messages → chat_channels`

`chat_attachments` references `chat_messages.id` only. It needs `org_id` and can carry a composite FK to `chat_messages(org_id, id)` once `chat_messages` has its own candidate key constraint.

**Prerequisite:** Add `unique(org_id, id)` to `chat_messages` (after A-2 completes and NOT NULL is set):
```sql
ALTER TABLE chat_messages
  ADD CONSTRAINT uniq_chat_messages_org_id UNIQUE (org_id, id);
```

**Drizzle — add to `chatMessages` builder:**
```ts
uniqueIndex("uniq_chat_messages_org_id").on(table.orgId, table.id),
```

**Before (Drizzle):**
```ts
export const chatAttachments = pgTable("chat_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId
}, (table) => [
  index("idx_chat_attachments_msg").on(table.messageId),
]);
```

**After (Drizzle):**
```ts
export const chatAttachments = pgTable("chat_attachments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  messageId: integer("message_id").notNull(),
  // ... rest unchanged
}, (table) => [
  index("idx_chat_attachments_msg").on(table.messageId),
  index("idx_chat_attachments_org").on(table.orgId),
  foreignKey({
    name: "fk_chat_attachments_org_message",
    columns: [table.orgId, table.messageId],
    foreignColumns: [chatMessages.orgId, chatMessages.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- A-3a: candidate key on chat_messages (prerequisite)
ALTER TABLE chat_messages
  ADD CONSTRAINT uniq_chat_messages_org_id UNIQUE (org_id, id);

-- A-3b: add nullable org_id to attachments
ALTER TABLE chat_attachments ADD COLUMN org_id text;

-- A-3c: backfill via message → channel
UPDATE chat_attachments a
SET org_id = m.org_id
FROM chat_messages m
WHERE m.id = a.message_id
  AND a.org_id IS NULL;

-- A-3d: NOT NULL
ALTER TABLE chat_attachments ALTER COLUMN org_id SET NOT NULL;

-- A-3e: org FK NOT VALID
ALTER TABLE chat_attachments
  ADD CONSTRAINT chat_attachments_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- A-3f: composite FK NOT VALID
ALTER TABLE chat_attachments
  ADD CONSTRAINT fk_chat_attachments_org_message
  FOREIGN KEY (org_id, message_id) REFERENCES chat_messages(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-3g: index
CREATE INDEX idx_chat_attachments_org ON chat_attachments (org_id);

-- A-3h: validate
ALTER TABLE chat_attachments VALIDATE CONSTRAINT chat_attachments_org_id_fkey;
ALTER TABLE chat_attachments VALIDATE CONSTRAINT fk_chat_attachments_org_message;
```

**Backfill query:**
```sql
UPDATE chat_attachments a
SET org_id = m.org_id
FROM chat_messages m
WHERE m.id = a.message_id
  AND a.org_id IS NULL;
```

---

### A-4: `chat_pinned_messages` — Add `org_id`, backfill from `chat_channels`

**Before (Drizzle):**
```ts
export const chatPinnedMessages = pgTable("chat_pinned_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId
}, (table) => [
  uniqueIndex("uniq_chat_pinned_msg").on(table.channelId, table.messageId),
  index("idx_chat_pinned_channel").on(table.channelId),
]);
```

**After (Drizzle):**
```ts
export const chatPinnedMessages = pgTable("chat_pinned_messages", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  channelId: integer("channel_id").notNull(),
  messageId: integer("message_id").notNull(),
  // ... rest unchanged
}, (table) => [
  uniqueIndex("uniq_chat_pinned_msg").on(table.orgId, table.channelId, table.messageId),
  index("idx_chat_pinned_channel").on(table.channelId),
  index("idx_chat_pinned_org").on(table.orgId),
  foreignKey({
    name: "fk_chat_pinned_messages_org_channel",
    columns: [table.orgId, table.channelId],
    foreignColumns: [chatChannels.orgId, chatChannels.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "fk_chat_pinned_messages_org_message",
    columns: [table.orgId, table.messageId],
    foreignColumns: [chatMessages.orgId, chatMessages.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- A-4a: add nullable
ALTER TABLE chat_pinned_messages ADD COLUMN org_id text;

-- A-4b: backfill from channel (channel_id → chat_channels.org_id)
UPDATE chat_pinned_messages pm
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = pm.channel_id
  AND pm.org_id IS NULL;

-- A-4c: NOT NULL
ALTER TABLE chat_pinned_messages ALTER COLUMN org_id SET NOT NULL;

-- A-4d: org FK NOT VALID
ALTER TABLE chat_pinned_messages
  ADD CONSTRAINT chat_pinned_messages_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- A-4e: drop old unique (channelId, messageId)
DROP INDEX IF EXISTS uniq_chat_pinned_msg;
CREATE UNIQUE INDEX uniq_chat_pinned_msg ON chat_pinned_messages (org_id, channel_id, message_id);

-- A-4f: composite FKs NOT VALID
ALTER TABLE chat_pinned_messages
  ADD CONSTRAINT fk_chat_pinned_messages_org_channel
  FOREIGN KEY (org_id, channel_id) REFERENCES chat_channels(org_id, id) ON DELETE CASCADE NOT VALID;

ALTER TABLE chat_pinned_messages
  ADD CONSTRAINT fk_chat_pinned_messages_org_message
  FOREIGN KEY (org_id, message_id) REFERENCES chat_messages(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-4g: index
CREATE INDEX idx_chat_pinned_org ON chat_pinned_messages (org_id);

-- A-4h: validate
ALTER TABLE chat_pinned_messages VALIDATE CONSTRAINT chat_pinned_messages_org_id_fkey;
ALTER TABLE chat_pinned_messages VALIDATE CONSTRAINT fk_chat_pinned_messages_org_channel;
ALTER TABLE chat_pinned_messages VALIDATE CONSTRAINT fk_chat_pinned_messages_org_message;
```

**Backfill query:**
```sql
UPDATE chat_pinned_messages pm
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = pm.channel_id
  AND pm.org_id IS NULL;
```

---

### A-5: `chat_saved_messages` — Add `org_id`, backfill via `chat_messages → chat_channels`

`chat_saved_messages` references `chat_messages.id` only. No `channel_id` column — backfill must go via `chat_messages`.

**Before (Drizzle):**
```ts
export const chatSavedMessages = pgTable("chat_saved_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_saved_message").on(table.userId, table.messageId),
  index("idx_saved_messages_user").on(table.userId),
]);
```

**After (Drizzle):**
```ts
export const chatSavedMessages = pgTable("chat_saved_messages", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  messageId: integer("message_id").notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_saved_message").on(table.orgId, table.userId, table.messageId),
  index("idx_saved_messages_user").on(table.userId),
  index("idx_saved_messages_org").on(table.orgId),
  foreignKey({
    name: "fk_chat_saved_messages_org_message",
    columns: [table.orgId, table.messageId],
    foreignColumns: [chatMessages.orgId, chatMessages.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- A-5a: add nullable
ALTER TABLE chat_saved_messages ADD COLUMN org_id text;

-- A-5b: backfill via message
UPDATE chat_saved_messages sm
SET org_id = m.org_id
FROM chat_messages m
WHERE m.id = sm.message_id
  AND sm.org_id IS NULL;

-- A-5c: NOT NULL
ALTER TABLE chat_saved_messages ALTER COLUMN org_id SET NOT NULL;

-- A-5d: org FK NOT VALID
ALTER TABLE chat_saved_messages
  ADD CONSTRAINT chat_saved_messages_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- A-5e: drop old unique, re-create
DROP INDEX IF EXISTS uniq_saved_message;
CREATE UNIQUE INDEX uniq_saved_message ON chat_saved_messages (org_id, user_id, message_id);

-- A-5f: composite FK NOT VALID
ALTER TABLE chat_saved_messages
  ADD CONSTRAINT fk_chat_saved_messages_org_message
  FOREIGN KEY (org_id, message_id) REFERENCES chat_messages(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-5g: index
CREATE INDEX idx_saved_messages_org ON chat_saved_messages (org_id);

-- A-5h: validate
ALTER TABLE chat_saved_messages VALIDATE CONSTRAINT chat_saved_messages_org_id_fkey;
ALTER TABLE chat_saved_messages VALIDATE CONSTRAINT fk_chat_saved_messages_org_message;
```

**Backfill query:**
```sql
UPDATE chat_saved_messages sm
SET org_id = m.org_id
FROM chat_messages m
WHERE m.id = sm.message_id
  AND sm.org_id IS NULL;
```

---

### A-6: `chat_huddles` — Add `org_id`, backfill from `chat_channels`

**Before (Drizzle):**
```ts
export const chatHuddles = pgTable("chat_huddles", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId
}, (table) => [
  index("idx_chat_huddles_channel").on(table.channelId, table.status),
]);
```

**After (Drizzle):**
```ts
export const chatHuddles = pgTable("chat_huddles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  channelId: integer("channel_id").notNull(),
  // ... rest unchanged
}, (table) => [
  index("idx_chat_huddles_channel").on(table.channelId, table.status),
  index("idx_chat_huddles_org").on(table.orgId, table.status),
  foreignKey({
    name: "fk_chat_huddles_org_channel",
    columns: [table.orgId, table.channelId],
    foreignColumns: [chatChannels.orgId, chatChannels.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- A-6a: add nullable
ALTER TABLE chat_huddles ADD COLUMN org_id text;

-- A-6b: backfill
UPDATE chat_huddles h
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = h.channel_id
  AND h.org_id IS NULL;

-- A-6c: NOT NULL
ALTER TABLE chat_huddles ALTER COLUMN org_id SET NOT NULL;

-- A-6d: org FK NOT VALID
ALTER TABLE chat_huddles
  ADD CONSTRAINT chat_huddles_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- A-6e: composite FK NOT VALID
ALTER TABLE chat_huddles
  ADD CONSTRAINT fk_chat_huddles_org_channel
  FOREIGN KEY (org_id, channel_id) REFERENCES chat_channels(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-6f: org index
CREATE INDEX idx_chat_huddles_org ON chat_huddles (org_id, status);

-- A-6g: validate
ALTER TABLE chat_huddles VALIDATE CONSTRAINT chat_huddles_org_id_fkey;
ALTER TABLE chat_huddles VALIDATE CONSTRAINT fk_chat_huddles_org_channel;
```

**Backfill query:**
```sql
UPDATE chat_huddles h
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = h.channel_id
  AND h.org_id IS NULL;
```

---

### A-7: `chat_huddle_participants` — Add `org_id`, backfill via `chat_huddles → chat_channels`

**Prerequisite:** Add `unique(org_id, id)` to `chat_huddles` after A-6 NOT NULL step:
```sql
ALTER TABLE chat_huddles
  ADD CONSTRAINT uniq_chat_huddles_org_id UNIQUE (org_id, id);
```

**Before (Drizzle):**
```ts
export const chatHuddleParticipants = pgTable("chat_huddle_participants", {
  id: serial("id").primaryKey(),
  huddleId: integer("huddle_id").references(() => chatHuddles.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId
}, (table) => [
  uniqueIndex("uniq_huddle_participant").on(table.huddleId, table.userId),
  index("idx_huddle_participants_huddle").on(table.huddleId),
]);
```

**After (Drizzle):**
```ts
export const chatHuddleParticipants = pgTable("chat_huddle_participants", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  huddleId: integer("huddle_id").notNull(),
  // ... rest unchanged
}, (table) => [
  uniqueIndex("uniq_huddle_participant").on(table.orgId, table.huddleId, table.userId),
  index("idx_huddle_participants_huddle").on(table.huddleId),
  index("idx_huddle_participants_org").on(table.orgId),
  foreignKey({
    name: "fk_chat_huddle_participants_org_huddle",
    columns: [table.orgId, table.huddleId],
    foreignColumns: [chatHuddles.orgId, chatHuddles.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- A-7a: candidate key on chat_huddles (prerequisite)
ALTER TABLE chat_huddles
  ADD CONSTRAINT uniq_chat_huddles_org_id UNIQUE (org_id, id);

-- A-7b: add nullable
ALTER TABLE chat_huddle_participants ADD COLUMN org_id text;

-- A-7c: backfill via huddle
UPDATE chat_huddle_participants hp
SET org_id = h.org_id
FROM chat_huddles h
WHERE h.id = hp.huddle_id
  AND hp.org_id IS NULL;

-- A-7d: NOT NULL
ALTER TABLE chat_huddle_participants ALTER COLUMN org_id SET NOT NULL;

-- A-7e: org FK NOT VALID
ALTER TABLE chat_huddle_participants
  ADD CONSTRAINT chat_huddle_participants_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- A-7f: drop old unique, re-create
DROP INDEX IF EXISTS uniq_huddle_participant;
CREATE UNIQUE INDEX uniq_huddle_participant ON chat_huddle_participants (org_id, huddle_id, user_id);

-- A-7g: composite FK NOT VALID
ALTER TABLE chat_huddle_participants
  ADD CONSTRAINT fk_chat_huddle_participants_org_huddle
  FOREIGN KEY (org_id, huddle_id) REFERENCES chat_huddles(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-7h: index
CREATE INDEX idx_huddle_participants_org ON chat_huddle_participants (org_id);

-- A-7i: validate
ALTER TABLE chat_huddle_participants VALIDATE CONSTRAINT chat_huddle_participants_org_id_fkey;
ALTER TABLE chat_huddle_participants VALIDATE CONSTRAINT fk_chat_huddle_participants_org_huddle;
```

**Backfill query:**
```sql
UPDATE chat_huddle_participants hp
SET org_id = h.org_id
FROM chat_huddles h
WHERE h.id = hp.huddle_id
  AND hp.org_id IS NULL;
```

---

### A-8: `chat_channel_invite_links` — Add `org_id`, backfill from `chat_channels`

**Before (Drizzle):**
```ts
export const chatChannelInviteLinks = pgTable("chat_channel_invite_links", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId
}, (table) => [
  uniqueIndex("uniq_chat_invite_link_token").on(table.token),
  index("idx_chat_invite_links_channel").on(table.channelId, table.revokedAt),
]);
```

**After (Drizzle):**
```ts
export const chatChannelInviteLinks = pgTable("chat_channel_invite_links", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  channelId: integer("channel_id").notNull(),
  // ... rest unchanged
}, (table) => [
  uniqueIndex("uniq_chat_invite_link_token").on(table.token),
  index("idx_chat_invite_links_channel").on(table.channelId, table.revokedAt),
  index("idx_chat_invite_links_org").on(table.orgId),
  foreignKey({
    name: "fk_chat_invite_links_org_channel",
    columns: [table.orgId, table.channelId],
    foreignColumns: [chatChannels.orgId, chatChannels.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- A-8a: add nullable
ALTER TABLE chat_channel_invite_links ADD COLUMN org_id text;

-- A-8b: backfill
UPDATE chat_channel_invite_links il
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = il.channel_id
  AND il.org_id IS NULL;

-- A-8c: NOT NULL
ALTER TABLE chat_channel_invite_links ALTER COLUMN org_id SET NOT NULL;

-- A-8d: org FK NOT VALID
ALTER TABLE chat_channel_invite_links
  ADD CONSTRAINT chat_channel_invite_links_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- A-8e: composite FK NOT VALID
ALTER TABLE chat_channel_invite_links
  ADD CONSTRAINT fk_chat_invite_links_org_channel
  FOREIGN KEY (org_id, channel_id) REFERENCES chat_channels(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-8f: index
CREATE INDEX idx_chat_invite_links_org ON chat_channel_invite_links (org_id);

-- A-8g: validate
ALTER TABLE chat_channel_invite_links VALIDATE CONSTRAINT chat_channel_invite_links_org_id_fkey;
ALTER TABLE chat_channel_invite_links VALIDATE CONSTRAINT fk_chat_invite_links_org_channel;
```

**Backfill query:**
```sql
UPDATE chat_channel_invite_links il
SET org_id = c.org_id
FROM chat_channels c
WHERE c.id = il.channel_id
  AND il.org_id IS NULL;
```

---

### A-9: `chat_reply_reminders` — Composite FK to `chat_channels` (org_id already present)

`chat_reply_reminders` already has `orgId` referencing `organizations`. Gap: no composite FK to `chat_channels(org_id, id)`.

**Before (Drizzle — constraint block only):**
```ts
}, (table) => [
  uniqueIndex("uniq_chat_reply_reminder").on(table.messageId, table.recipientUserId),
  index("idx_chat_reply_reminders_due").on(table.remindAt),
  index("idx_chat_reply_reminders_recipient").on(table.recipientUserId, table.channelId),
]);
```

**After (Drizzle):**
```ts
}, (table) => [
  uniqueIndex("uniq_chat_reply_reminder").on(table.messageId, table.recipientUserId),
  index("idx_chat_reply_reminders_due").on(table.remindAt),
  index("idx_chat_reply_reminders_recipient").on(table.recipientUserId, table.channelId),
  foreignKey({
    name: "fk_chat_reply_reminders_org_channel",
    columns: [table.orgId, table.channelId],
    foreignColumns: [chatChannels.orgId, chatChannels.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "fk_chat_reply_reminders_org_message",
    columns: [table.orgId, table.messageId],
    foreignColumns: [chatMessages.orgId, chatMessages.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- A-9a: composite FK to chat_channels NOT VALID
ALTER TABLE chat_reply_reminders
  ADD CONSTRAINT fk_chat_reply_reminders_org_channel
  FOREIGN KEY (org_id, channel_id) REFERENCES chat_channels(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-9b: composite FK to chat_messages NOT VALID
ALTER TABLE chat_reply_reminders
  ADD CONSTRAINT fk_chat_reply_reminders_org_message
  FOREIGN KEY (org_id, message_id) REFERENCES chat_messages(org_id, id) ON DELETE CASCADE NOT VALID;

-- A-9c: validate
ALTER TABLE chat_reply_reminders VALIDATE CONSTRAINT fk_chat_reply_reminders_org_channel;
ALTER TABLE chat_reply_reminders VALIDATE CONSTRAINT fk_chat_reply_reminders_org_message;
```

**Backfill query:** None needed — `org_id` already populated.

---

## PART B — KB MODULE (`backend/src/db/schema/kb/`)

### B-1: `kb_pages` — Add composite FK for `space_id` + fix bare `parent_page_id`

**Current state confirmed from `kb/pages.ts`:**
- `parentPageId: integer("parent_page_id")` — bare integer, NO `.references()` declared at all (self-referential gap)
- `spaceId: integer("space_id").references(() => kbSpaces.id, ...)` — single-col FK only, no composite FK `(org_id, space_id) → kb_spaces(org_id, id)`

**Prerequisite:** Add `unique(org_id, id)` to `kb_spaces`:
```sql
ALTER TABLE kb_spaces
  ADD CONSTRAINT uniq_kb_spaces_org_id UNIQUE (org_id, id);
```

**Drizzle — add to `kbSpaces` builder:**
```ts
uniqueIndex("uniq_kb_spaces_org_id").on(table.orgId, table.id),
```

**Prerequisite:** Add `unique(org_id, id)` to `kb_pages` (for self-referential parent_page_id composite FK):
```sql
-- Add after NOT NULL column is confirmed clean
ALTER TABLE kb_pages
  ADD CONSTRAINT uniq_kb_pages_org_id UNIQUE (org_id, id);
```

**Before (Drizzle — relevant fields):**
```ts
spaceId: integer("space_id").references(() => kbSpaces.id, { onDelete: "set null" }),
parentPageId: integer("parent_page_id"),
```

**After (Drizzle):**
```ts
spaceId: integer("space_id"),        // remove bare .references(), replaced by composite FK below
parentPageId: integer("parent_page_id"),  // remains bare integer (self-ref composite FK below)
```

Add to `kbPages` builder array:
```ts
foreignKey({
  name: "fk_kb_pages_org_space",
  columns: [table.orgId, table.spaceId],
  foreignColumns: [kbSpaces.orgId, kbSpaces.id],
}).onDelete("set null"),
foreignKey({
  name: "fk_kb_pages_org_parent",
  columns: [table.orgId, table.parentPageId],
  foreignColumns: [kbPages.orgId, kbPages.id],
}).onDelete("set null"),
uniqueIndex("uniq_kb_pages_org_id").on(table.orgId, table.id),
```

**Generated SQL:**
```sql
-- B-1a: candidate key on kb_spaces
ALTER TABLE kb_spaces
  ADD CONSTRAINT uniq_kb_spaces_org_id UNIQUE (org_id, id);

-- B-1b: candidate key on kb_pages (self-ref target)
ALTER TABLE kb_pages
  ADD CONSTRAINT uniq_kb_pages_org_id UNIQUE (org_id, id);

-- B-1c: drop old single-col space_id FK
ALTER TABLE kb_pages DROP CONSTRAINT IF EXISTS kb_pages_space_id_fkey;

-- B-1d: composite FK to kb_spaces(org_id, id) NOT VALID
ALTER TABLE kb_pages
  ADD CONSTRAINT fk_kb_pages_org_space
  FOREIGN KEY (org_id, space_id) REFERENCES kb_spaces(org_id, id) ON DELETE SET NULL NOT VALID;

-- B-1e: self-referential composite FK NOT VALID
ALTER TABLE kb_pages
  ADD CONSTRAINT fk_kb_pages_org_parent
  FOREIGN KEY (org_id, parent_page_id) REFERENCES kb_pages(org_id, id) ON DELETE SET NULL NOT VALID;

-- B-1f: validate
ALTER TABLE kb_pages VALIDATE CONSTRAINT fk_kb_pages_org_space;
ALTER TABLE kb_pages VALIDATE CONSTRAINT fk_kb_pages_org_parent;
```

**Backfill query:** None — `org_id` already populated on `kb_pages`. But run a data audit first:
```sql
-- Audit: find pages whose space_id org doesn't match their own org_id
SELECT kp.id, kp.org_id, kp.space_id, ks.org_id AS space_org_id
FROM kb_pages kp
JOIN kb_spaces ks ON ks.id = kp.space_id
WHERE kp.org_id != ks.org_id
  AND kp.space_id IS NOT NULL;
-- Quarantine rows above before adding the FK.

-- Audit: find pages whose parent_page_id belongs to a different org
SELECT kp.id, kp.org_id, kp.parent_page_id, parent.org_id AS parent_org_id
FROM kb_pages kp
JOIN kb_pages parent ON parent.id = kp.parent_page_id
WHERE kp.org_id != parent.org_id
  AND kp.parent_page_id IS NOT NULL;
-- Set parent_page_id = NULL for cross-tenant orphans before adding the self-ref FK.
```

---

### B-2: `kb_research_briefs` — Add `.references()` for bare `space_id`

**Current state confirmed from `kb/research-briefs.ts`:**
- `spaceId: integer("space_id")` — bare integer, NO `.references()` at all (W7-HOTFIX class)

**Before (Drizzle):**
```ts
spaceId: integer("space_id"),
```

**After (Drizzle):**
```ts
spaceId: integer("space_id"),  // keep nullable integer
```

Add to `kbResearchBriefs` builder array (requires `uniq_kb_spaces_org_id` from B-1a):
```ts
foreignKey({
  name: "fk_kb_research_briefs_org_space",
  columns: [table.orgId, table.spaceId],
  foreignColumns: [kbSpaces.orgId, kbSpaces.id],
}).onDelete("set null"),
index("idx_kb_research_briefs_space").on(table.spaceId),
```

**Generated SQL:**
```sql
-- B-2a: data audit — find briefs whose space_id org doesn't match their org_id
SELECT rb.id, rb.org_id, rb.space_id, ks.org_id AS space_org_id
FROM kb_research_briefs rb
JOIN kb_spaces ks ON ks.id = rb.space_id
WHERE rb.org_id != ks.org_id
  AND rb.space_id IS NOT NULL;
-- NULL out cross-tenant space_id before adding FK.

-- B-2b: composite FK NOT VALID
ALTER TABLE kb_research_briefs
  ADD CONSTRAINT fk_kb_research_briefs_org_space
  FOREIGN KEY (org_id, space_id) REFERENCES kb_spaces(org_id, id) ON DELETE SET NULL NOT VALID;

-- B-2c: index
CREATE INDEX idx_kb_research_briefs_space ON kb_research_briefs (space_id);

-- B-2d: validate
ALTER TABLE kb_research_briefs VALIDATE CONSTRAINT fk_kb_research_briefs_org_space;
```

**Backfill / quarantine query:**
```sql
-- Quarantine: NULL out cross-tenant space assignments before validating
UPDATE kb_research_briefs rb
SET space_id = NULL
WHERE space_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM kb_spaces ks
    WHERE ks.id = rb.space_id
      AND ks.org_id = rb.org_id
  );
```

---

### B-3: `kb_space_members` — Add composite FK `(org_id, space_id) → kb_spaces(org_id, id)`

**Current state confirmed from `kb/spaces.ts`:**
- `spaceId: integer("space_id").references(() => kbSpaces.id, ...)` — single-col FK only

**Before (Drizzle — constraint block):**
```ts
}, (table) => [
  index("idx_kb_space_members_space").on(table.spaceId),
  index("idx_kb_space_members_user").on(table.userId),
  index("idx_kb_space_members_org_role").on(table.orgId, table.role),
  index("idx_kb_space_members_org_space").on(table.orgId, table.spaceId),
]);
```

**After (Drizzle):**
```ts
}, (table) => [
  index("idx_kb_space_members_space").on(table.spaceId),
  index("idx_kb_space_members_user").on(table.userId),
  index("idx_kb_space_members_org_role").on(table.orgId, table.role),
  index("idx_kb_space_members_org_space").on(table.orgId, table.spaceId),
  foreignKey({
    name: "fk_kb_space_members_org_space",
    columns: [table.orgId, table.spaceId],
    foreignColumns: [kbSpaces.orgId, kbSpaces.id],
  }).onDelete("cascade"),
]);
// Also: remove the bare .references(() => kbSpaces.id) from the spaceId column
// and let the composite FK enforce it exclusively.
```

**Generated SQL:**
```sql
-- B-3a: drop bare single-col FK on space_id
ALTER TABLE kb_space_members DROP CONSTRAINT IF EXISTS kb_space_members_space_id_fkey;

-- B-3b: composite FK NOT VALID
ALTER TABLE kb_space_members
  ADD CONSTRAINT fk_kb_space_members_org_space
  FOREIGN KEY (org_id, space_id) REFERENCES kb_spaces(org_id, id) ON DELETE CASCADE NOT VALID;

-- B-3c: validate
ALTER TABLE kb_space_members VALIDATE CONSTRAINT fk_kb_space_members_org_space;
```

**Backfill query:** None — `org_id` already populated.

---

### B-4: Support KB — `kb_categories`, `kb_articles`, `kb_article_feedback` composite FKs

**Current state confirmed from `support/kb.ts`:**
- `kbCategories.spaceId` — single-col FK `.references(() => kbSpaces.id)` — no composite FK
- `kbArticles.categoryId` — single-col FK `.references(() => kbCategories.id)` — no composite FK
- `kbArticles.spaceId` — single-col FK `.references(() => kbSpaces.id)` — no composite FK
- `kbArticleFeedback.articleId` — single-col FK `.references(() => kbArticles.id)` — no composite FK

**Prerequisites:** `unique(org_id, id)` on `kb_spaces` (B-1a), `unique(org_id, id)` on `kb_categories`, `unique(org_id, id)` on `kb_articles`.

```sql
-- B-4-pre: candidate keys
ALTER TABLE kb_categories
  ADD CONSTRAINT uniq_kb_categories_org_id UNIQUE (org_id, id);

ALTER TABLE kb_articles
  ADD CONSTRAINT uniq_kb_articles_org_id UNIQUE (org_id, id);
```

**Generated SQL:**
```sql
-- B-4a: kb_categories → kb_spaces composite FK
ALTER TABLE kb_categories DROP CONSTRAINT IF EXISTS kb_categories_space_id_fkey;
ALTER TABLE kb_categories
  ADD CONSTRAINT fk_kb_categories_org_space
  FOREIGN KEY (org_id, space_id) REFERENCES kb_spaces(org_id, id) ON DELETE CASCADE NOT VALID;

-- B-4b: kb_articles → kb_categories composite FK
ALTER TABLE kb_articles DROP CONSTRAINT IF EXISTS kb_articles_category_id_fkey;
ALTER TABLE kb_articles
  ADD CONSTRAINT fk_kb_articles_org_category
  FOREIGN KEY (org_id, category_id) REFERENCES kb_categories(org_id, id) ON DELETE SET NULL NOT VALID;

-- B-4c: kb_articles → kb_spaces composite FK
ALTER TABLE kb_articles DROP CONSTRAINT IF EXISTS kb_articles_space_id_fkey;
ALTER TABLE kb_articles
  ADD CONSTRAINT fk_kb_articles_org_space
  FOREIGN KEY (org_id, space_id) REFERENCES kb_spaces(org_id, id) ON DELETE CASCADE NOT VALID;

-- B-4d: kb_article_feedback → kb_articles composite FK
ALTER TABLE kb_article_feedback DROP CONSTRAINT IF EXISTS kb_article_feedback_article_id_fkey;
ALTER TABLE kb_article_feedback
  ADD CONSTRAINT fk_kb_article_feedback_org_article
  FOREIGN KEY (org_id, article_id) REFERENCES kb_articles(org_id, id) ON DELETE CASCADE NOT VALID;

-- B-4e: validate all
ALTER TABLE kb_categories VALIDATE CONSTRAINT fk_kb_categories_org_space;
ALTER TABLE kb_articles VALIDATE CONSTRAINT fk_kb_articles_org_category;
ALTER TABLE kb_articles VALIDATE CONSTRAINT fk_kb_articles_org_space;
ALTER TABLE kb_article_feedback VALIDATE CONSTRAINT fk_kb_article_feedback_org_article;
```

**Data audit before B-4 (run before any constraint add):**
```sql
-- Cross-tenant articles (article org != category org)
SELECT a.id, a.org_id, a.category_id, c.org_id AS cat_org
FROM kb_articles a
JOIN kb_categories c ON c.id = a.category_id
WHERE a.org_id != c.org_id AND a.category_id IS NOT NULL;

-- Cross-tenant categories (category org != space org)
SELECT cat.id, cat.org_id, cat.space_id, ks.org_id AS space_org
FROM kb_categories cat
JOIN kb_spaces ks ON ks.id = cat.space_id
WHERE cat.org_id != ks.org_id AND cat.space_id IS NOT NULL;
```

---

## PART C — SUPPORT MODULE (`backend/src/db/schema/support/` + `crm/billing.ts`)

### C-0: Misplacement note

`support_tickets` and `support_ticket_messages` are defined in `backend/src/db/schema/crm/billing.ts`, not in the `support/` subdirectory. This is architecturally misplaced — the support module owns these tables but they live in a CRM billing file alongside invoices and quotes. A future refactor wave should move them to `support/index.ts` or a dedicated `support/tickets.ts`.

**Do NOT move these tables in this wave** — it would break the generated migration hash. Record the misplacement here for Wave 12 (dead-code/structural cleanup).

---

### C-1: `support_ticket_messages` — Add `org_id`, backfill from `support_tickets`

**Current state confirmed from `crm/billing.ts`:**
- `ticketId: integer("ticket_id").references(() => supportTickets.id, ...)` — single-col FK, no `org_id`

**Prerequisite:** Add `unique(org_id, id)` to `support_tickets`:
```sql
ALTER TABLE support_tickets
  ADD CONSTRAINT uniq_support_tickets_org_id UNIQUE (org_id, id);
```

**Before (Drizzle):**
```ts
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  // ... no orgId
```

**After (Drizzle):**
```ts
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").notNull(),
  // ... rest unchanged
}, (table) => [
  index("idx_support_ticket_messages_ticket").on(table.ticketId),
  index("idx_support_ticket_messages_author").on(table.authorId),
  index("idx_support_ticket_messages_source_message").on(table.sourceMessageId),
  index("idx_support_ticket_messages_org").on(table.orgId),
  foreignKey({
    name: "fk_support_ticket_messages_org_ticket",
    columns: [table.orgId, table.ticketId],
    foreignColumns: [supportTickets.orgId, supportTickets.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- C-1a: candidate key on support_tickets
ALTER TABLE support_tickets
  ADD CONSTRAINT uniq_support_tickets_org_id UNIQUE (org_id, id);

-- C-1b: add nullable org_id
ALTER TABLE support_ticket_messages ADD COLUMN org_id text;

-- C-1c: backfill from ticket
UPDATE support_ticket_messages stm
SET org_id = st.org_id
FROM support_tickets st
WHERE st.id = stm.ticket_id
  AND stm.org_id IS NULL;

-- C-1d: NOT NULL
ALTER TABLE support_ticket_messages ALTER COLUMN org_id SET NOT NULL;

-- C-1e: org FK NOT VALID
ALTER TABLE support_ticket_messages
  ADD CONSTRAINT support_ticket_messages_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- C-1f: drop old single-col FK
ALTER TABLE support_ticket_messages DROP CONSTRAINT IF EXISTS support_ticket_messages_ticket_id_fkey;

-- C-1g: composite FK NOT VALID
ALTER TABLE support_ticket_messages
  ADD CONSTRAINT fk_support_ticket_messages_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;

-- C-1h: index
CREATE INDEX idx_support_ticket_messages_org ON support_ticket_messages (org_id);

-- C-1i: validate
ALTER TABLE support_ticket_messages VALIDATE CONSTRAINT support_ticket_messages_org_id_fkey;
ALTER TABLE support_ticket_messages VALIDATE CONSTRAINT fk_support_ticket_messages_org_ticket;
```

**Backfill query:**
```sql
UPDATE support_ticket_messages stm
SET org_id = st.org_id
FROM support_tickets st
WHERE st.id = stm.ticket_id
  AND stm.org_id IS NULL;
```

---

### C-2: `support_ticket_tags` — Add `org_id`, add composite FK

**Current state confirmed from `support/support-workspace.ts`:**
- Composite PK `(ticket_id, tag_id)`, no `org_id`

**Prerequisite:** `unique(org_id, id)` on `support_tickets` (C-1a), `unique(org_id, id)` on `support_tags`.

```sql
ALTER TABLE support_tags
  ADD CONSTRAINT uniq_support_tags_org_id UNIQUE (org_id, id);
```

**Before (Drizzle):**
```ts
export const supportTicketTags = pgTable("support_ticket_tags", {
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  tagId: integer("tag_id").references(() => supportTags.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.ticketId, table.tagId] }),
  index("idx_support_ticket_tags_tag").on(table.tagId),
]);
```

**After (Drizzle):**
```ts
export const supportTicketTags = pgTable("support_ticket_tags", {
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").notNull(),
  tagId: integer("tag_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.orgId, table.ticketId, table.tagId] }),
  index("idx_support_ticket_tags_tag").on(table.tagId),
  index("idx_support_ticket_tags_org").on(table.orgId),
  foreignKey({
    name: "fk_support_ticket_tags_org_ticket",
    columns: [table.orgId, table.ticketId],
    foreignColumns: [supportTickets.orgId, supportTickets.id],
  }).onDelete("cascade"),
  foreignKey({
    name: "fk_support_ticket_tags_org_tag",
    columns: [table.orgId, table.tagId],
    foreignColumns: [supportTags.orgId, supportTags.id],
  }).onDelete("cascade"),
]);
```

**Generated SQL:**
```sql
-- C-2a: drop composite PK
ALTER TABLE support_ticket_tags DROP CONSTRAINT IF EXISTS support_ticket_tags_pkey;

-- C-2b: add nullable org_id
ALTER TABLE support_ticket_tags ADD COLUMN org_id text;

-- C-2c: backfill from ticket
UPDATE support_ticket_tags stt
SET org_id = st.org_id
FROM support_tickets st
WHERE st.id = stt.ticket_id
  AND stt.org_id IS NULL;

-- C-2d: NOT NULL
ALTER TABLE support_ticket_tags ALTER COLUMN org_id SET NOT NULL;

-- C-2e: re-add PK widened with org_id
ALTER TABLE support_ticket_tags
  ADD PRIMARY KEY (org_id, ticket_id, tag_id);

-- C-2f: org FK NOT VALID
ALTER TABLE support_ticket_tags
  ADD CONSTRAINT support_ticket_tags_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE NOT VALID;

-- C-2g: drop old single-col FKs
ALTER TABLE support_ticket_tags DROP CONSTRAINT IF EXISTS support_ticket_tags_ticket_id_fkey;
ALTER TABLE support_ticket_tags DROP CONSTRAINT IF EXISTS support_ticket_tags_tag_id_fkey;

-- C-2h: composite FKs NOT VALID
ALTER TABLE support_ticket_tags
  ADD CONSTRAINT fk_support_ticket_tags_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;

ALTER TABLE support_ticket_tags
  ADD CONSTRAINT fk_support_ticket_tags_org_tag
  FOREIGN KEY (org_id, tag_id) REFERENCES support_tags(org_id, id) ON DELETE CASCADE NOT VALID;

-- C-2i: index
CREATE INDEX idx_support_ticket_tags_org ON support_ticket_tags (org_id);

-- C-2j: validate
ALTER TABLE support_ticket_tags VALIDATE CONSTRAINT support_ticket_tags_org_id_fkey;
ALTER TABLE support_ticket_tags VALIDATE CONSTRAINT fk_support_ticket_tags_org_ticket;
ALTER TABLE support_ticket_tags VALIDATE CONSTRAINT fk_support_ticket_tags_org_tag;
```

**Backfill query:**
```sql
UPDATE support_ticket_tags stt
SET org_id = st.org_id
FROM support_tickets st
WHERE st.id = stt.ticket_id
  AND stt.org_id IS NULL;
```

---

### C-3: Tables with `org_id` present — Add composite FKs to `support_tickets`

The following tables already have `org_id` but reference `support_tickets.id` as a bare single-column FK. They need composite FK declarations after `uniq_support_tickets_org_id` is added (C-1a).

| Table | Drizzle file | Current FK col | Action |
|---|---|---|---|
| `support_ticket_watchers` | `support/support-workspace.ts` | `ticketId` single-col | Add `fk_support_ticket_watchers_org_ticket` |
| `support_ticket_links` | `support/support-workspace.ts` | `ticketId`, `linkedTicketId` single-col | Add two composite FKs |
| `support_ticket_activity` | `support/support-activity.ts` | `supportTicketId` single-col | Add `fk_support_ticket_activity_org_ticket` |
| `support_csat_requests` | `support/support-csat.ts` | `ticketId` single-col | Add `fk_support_csat_requests_org_ticket` |
| `support_ai_suggestions` | `support/support-ai.ts` | `ticketId` single-col | Add `fk_support_ai_suggestions_org_ticket` |
| `support_ticket_embeddings` | `support/support-ai.ts` | `ticketId` single-col | Add `fk_support_ticket_embeddings_org_ticket` |
| `support_message_mentions` | `support/support-productivity.ts` | `messageId` (→ `support_ticket_messages`) | Add composite FK after C-1 adds candidate key to `support_ticket_messages` |
| `support_ticket_drafts` | `support/support-productivity.ts` | `ticketId` single-col | Add `fk_support_ticket_drafts_org_ticket` |

**Prerequisite for `support_message_mentions`:** `unique(org_id, id)` on `support_ticket_messages` after C-1 NOT NULL step.

**Generated SQL for this group:**
```sql
-- C-3a: support_ticket_watchers
ALTER TABLE support_ticket_watchers DROP CONSTRAINT IF EXISTS support_ticket_watchers_ticket_id_fkey;
ALTER TABLE support_ticket_watchers
  ADD CONSTRAINT fk_support_ticket_watchers_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_ticket_watchers VALIDATE CONSTRAINT fk_support_ticket_watchers_org_ticket;

-- C-3b: support_ticket_links (two FKs)
ALTER TABLE support_ticket_links DROP CONSTRAINT IF EXISTS support_ticket_links_ticket_id_fkey;
ALTER TABLE support_ticket_links DROP CONSTRAINT IF EXISTS support_ticket_links_linked_ticket_id_fkey;
ALTER TABLE support_ticket_links
  ADD CONSTRAINT fk_support_ticket_links_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_ticket_links
  ADD CONSTRAINT fk_support_ticket_links_org_linked
  FOREIGN KEY (org_id, linked_ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_ticket_links VALIDATE CONSTRAINT fk_support_ticket_links_org_ticket;
ALTER TABLE support_ticket_links VALIDATE CONSTRAINT fk_support_ticket_links_org_linked;

-- C-3c: support_ticket_activity
ALTER TABLE support_ticket_activity DROP CONSTRAINT IF EXISTS support_ticket_activity_support_ticket_id_fkey;
ALTER TABLE support_ticket_activity
  ADD CONSTRAINT fk_support_ticket_activity_org_ticket
  FOREIGN KEY (org_id, support_ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_ticket_activity VALIDATE CONSTRAINT fk_support_ticket_activity_org_ticket;

-- C-3d: support_csat_requests
ALTER TABLE support_csat_requests DROP CONSTRAINT IF EXISTS support_csat_requests_ticket_id_fkey;
ALTER TABLE support_csat_requests
  ADD CONSTRAINT fk_support_csat_requests_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_csat_requests VALIDATE CONSTRAINT fk_support_csat_requests_org_ticket;

-- C-3e: support_ai_suggestions
ALTER TABLE support_ai_suggestions DROP CONSTRAINT IF EXISTS support_ai_suggestions_ticket_id_fkey;
ALTER TABLE support_ai_suggestions
  ADD CONSTRAINT fk_support_ai_suggestions_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_ai_suggestions VALIDATE CONSTRAINT fk_support_ai_suggestions_org_ticket;

-- C-3f: support_ticket_embeddings
ALTER TABLE support_ticket_embeddings DROP CONSTRAINT IF EXISTS support_ticket_embeddings_ticket_id_fkey;
ALTER TABLE support_ticket_embeddings
  ADD CONSTRAINT fk_support_ticket_embeddings_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_ticket_embeddings VALIDATE CONSTRAINT fk_support_ticket_embeddings_org_ticket;

-- C-3g: support_ticket_drafts
ALTER TABLE support_ticket_drafts DROP CONSTRAINT IF EXISTS support_ticket_drafts_ticket_id_fkey;
ALTER TABLE support_ticket_drafts
  ADD CONSTRAINT fk_support_ticket_drafts_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_ticket_drafts VALIDATE CONSTRAINT fk_support_ticket_drafts_org_ticket;

-- C-3h: support_message_mentions (requires uniq_support_ticket_messages_org_id first)
ALTER TABLE support_ticket_messages
  ADD CONSTRAINT uniq_support_ticket_messages_org_id UNIQUE (org_id, id);  -- run after C-1i

ALTER TABLE support_message_mentions DROP CONSTRAINT IF EXISTS support_message_mentions_message_id_fkey;
ALTER TABLE support_message_mentions
  ADD CONSTRAINT fk_support_message_mentions_org_message
  FOREIGN KEY (org_id, message_id) REFERENCES support_ticket_messages(org_id, id) ON DELETE CASCADE NOT VALID;
ALTER TABLE support_message_mentions VALIDATE CONSTRAINT fk_support_message_mentions_org_message;
```

---

## PART D — EXECUTION ORDER SUMMARY

Run steps in this exact sequence. Each group depends on the previous group's NOT NULL and candidate-key steps completing first.

```
D-0  Run all data audits (cross-tenant ID checks) — fix/quarantine violations
D-1  Add candidate keys to anchors:
       chat_channels(org_id, id)
       kb_spaces(org_id, id)
       kb_categories(org_id, id)
       kb_articles(org_id, id)
       support_tickets(org_id, id)
       support_tags(org_id, id)
D-2  PART A (Chat 8 tables): A-1 → A-2 → A-3 prerequisite → A-3 → A-4 → A-5 → A-6 → A-7 prerequisite → A-7 → A-8 → A-9
       (each: add col → backfill → NOT NULL → org FK NOT VALID → composite FK NOT VALID → index → VALIDATE)
D-3  PART B (KB): B-1 (kb_pages candidate key + composite FKs) → B-2 (research_briefs) → B-3 (space_members) → B-4 (categories/articles/feedback)
D-4  PART C (Support): C-1 (support_ticket_messages: add col + backfill + candidate key) → C-2 (ticket_tags: PK widen) → C-3 (remaining composite FKs)
```

---

## Counts Summary

| Domain | Tables getting `org_id` added | Tables getting composite FK only | Total tables touched |
|---|---|---|---|
| Chat | 8 (`chat_channel_members`, `chat_messages`, `chat_attachments`, `chat_pinned_messages`, `chat_saved_messages`, `chat_huddles`, `chat_huddle_participants`, `chat_channel_invite_links`) | 1 (`chat_reply_reminders`) | 9 |
| KB | 0 | 5 (`kb_pages`, `kb_research_briefs`, `kb_space_members`, `kb_categories`, `kb_articles`) + 1 feedback | 6 |
| Support | 2 (`support_ticket_messages`, `support_ticket_tags`) | 8 (watchers, links, activity, csat, ai_suggestions, embeddings, drafts, message_mentions) | 10 |
| **Total** | **10** | **15** | **25** |

> **Re-emphasis:** The Chat `org_id` gap is the most critical finding. All 8 tables listed above are queryable today using only a serial integer (`channel_id`, `message_id`, `huddle_id`) with no tenant boundary at the DB layer. Any service method that fetches by these IDs without also filtering by `org_id` leaks data across tenants. After this wave, all service methods in `ChatService`, `ChatMessageService`, `HuddleService`, and `InviteLinkService` MUST be updated to scope every query by `org_id`.
