**PRODUCT REQUIREMENTS DOCUMENT**

**Internal Chat & Messaging**

**Project: Vaivamm Capital CRM — Chat Module Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Draft**

**Table of Contents**

1. **Overview & Objective**  
2. **Current Flow Analysis**  
3. **Proposed Enhanced Flow**  
4. **Feature Specifications**  
5. **Database Schema Changes**  
6. **API Endpoints**  
7. **UI/UX Wireframe Descriptions**  
8. **Roles & Permissions**  
9. **Edge Cases & Error Handling**  
10. **Technical Implementation Notes**  
11. **Success Metrics**  
12. **Timeline & Milestones**

---

**1\. Overview & Objective**

**1.1 Background**

**Fast internal communication is critical. Moving away from scattered WhatsApp groups and Slack, the chat module aims to keep communication natively attached to Deals and Projects.**

**1.2 Objective**

**Build a real-time, low-latency messaging architecture tightly integrated with the CRM entities.**

**2\. Current Flow Analysis**

**2.1 Current Process**

**Completely reliant on external communication platforms, breaking the audit trail.**

**2.2 Gaps Identified**

* **Sensitive client info being shared on personal chats.**

**3\. Proposed Enhanced Flow**

**3.1 Contextual Chat**

**A persistent side-drawer available anywhere in the CRM. Users can start a Direct Message (DM) or a "Group Channel". Deals and Projects automatically spawn a linked Group Channel holding all assigned users.**

**4\. Feature Specifications**

**4.1 Real-Time Text**

**Sub-second delivery using WebSockets. Supports emojis, typing indicators, and online presence indicators (Green dot).**

**4.2 @Mentions**

**Using the @ symbol triggers a dropdown of directory employees to notify them specifically.**

**4.3 Contextual Spawning**

**When a Deal is marked "Negotiation", a temporary chat channel specific to that deal is generated for the Sales Rep and Manager.**

**5\. Database Schema Changes**

**5.1 New Tables**

**channels**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **serial** | **PK** |
| **type** | **enum** | **DIRECT, GROUP, DEAL\_LINKED** |
| **linkedId** | **int** | **Null, or ID of related Deal/Project** |

**messages**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **serial** | **PK** |
| **channelId** | **int (FK)** | **Reference** |
| **senderId** | **text (FK)** | **Reference to users** |
| **content** | **text** | **Plaintext or JSON Rich Text** |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| **GET** | **/api/chat/channels** | **Retrieve user's accessible channels** | **Employee** |
| **POST** | **/api/chat/messages** | **Send message (triggers WebSocket)** | **Employee** |
| **PUT** | **/api/chat/status** | **Set user Online/Away status** | **Employee** |

**7\. UI/UX Wireframe Descriptions**

* **Chat Drawer: Persistently accessible via a floating message bubble icon. Drawer slides out from the right containing a list of recent conversations.**  
* **Message Area: Blue bubbles for outgoing, grey for incoming. Timestamps on hover.**

**8\. Roles & Permissions**

| Permission | Admin | Manager | Employee |
| :---- | :---- | :---- | :---- |
| **Search History** | **✓** | **✓** | **Own Channels** |
| **Delete Own texts** | **✓** | **✓** | **✓ (within 5 mins)** |
| **Audit Full DB** | **✓** | **✘** | **✘** |

**9\. Edge Cases & Error Handling**

* **Socket Disconnects: If a user loses internet, messages queue locally and push when connection restores.**  
* **Message Size Limits: Prevent massive pasting by capping messages at 2000 characters.**

**10\. Technical Implementation Notes**

* **Utilizes Socket.io or Pusher for real-time pub/sub.**  
* **Use Upstash Redis to store active session presences without hitting PostgreSQL constantly.**

**11\. Success Metrics**

* **50% drop in external Slack/WhatsApp usage by week 2\.**  
* **WebSocket latency \< 150ms.**

**12\. Timeline & Milestones**

* **Phase 1: Polling API & Schema (4 days)**  
* **Phase 2: WebSocket Pub/Sub integration (1 Week)**  
* **Phase 3: Frontend UI Drawer (4 days)**  
* **Estimated Total: 2.5 Weeks**

 


---

## Status: SUBSTANTIALLY COMPLETE

## Checklist

### Database
- [x] `chat_channels` — `id, orgId, type (DIRECT/GROUP/DEAL_LINKED), name, linkedId`
- [x] `chat_channel_members` — `channelId, userId`
- [x] `chat_messages` — `id, channelId, senderId, content, createdAt`
- [x] `chat_attachments` — file attachments per message
- [x] `chat_user_presence` — `userId, status (ONLINE/AWAY/OFFLINE), lastSeenAt`
- [ ] `chat_messages.editedAt` — timestamp when message was edited
- [ ] `chat_messages.deletedAt` — soft delete (within 5 min window for sender)
- [ ] `chat_messages.replyToId` — threaded replies
- [ ] `chat_messages.reactions` — JSONB `{ emoji: userId[] }` for emoji reactions
- [ ] `chat_channels.isPinned` — pin channel to top of sidebar
- [ ] `chat_channels.isArchived` — archive old channels

### API
- [x] `GET /api/chat/channels` — list user's channels
- [x] `POST /api/chat/messages` (or existing chat route) — send message
- [x] `GET /api/chat/[messageId]` — individual message
- [ ] `POST /api/chat/channels` — create DM or group channel
- [ ] `DELETE /api/chat/[messageId]` — delete own message (within 5 min)
- [ ] `PATCH /api/chat/[messageId]` — edit message (within 5 min)
- [ ] `POST /api/chat/[messageId]/reactions` — toggle emoji reaction
- [ ] `GET /api/chat/channels/[channelId]/messages` — paginated message history with cursor pagination
- [ ] `PUT /api/chat/status` — update user presence (ONLINE/AWAY/OFFLINE)
- [ ] `GET /api/chat/channels/[channelId]/members` — list channel members
- [ ] `POST /api/chat/channels/[channelId]/members` — add member to group channel
- [ ] `GET /api/chat/search?q=` — search messages across all accessible channels
- [ ] Auto-create deal/project linked channel when deal moves to NEGOTIATION or project is created

### Real-time (Ably)
- [x] Ably connection established in frontend — `chat-realtime.ts` hook
- [x] Polling fallback when Ably disconnected — `useChatPoll` enabled when `!ablyConnected`
- [x] Rate limit: `/api/chat` at 120 req/min (chat tier)
- [ ] Ably publish on message send: `org:{orgId}:channel:{channelId}` → all members receive
- [ ] Ably presence: publish online/away status; subscribe to show green dots
- [ ] Typing indicator: publish `typing:{channelId}:{userId}` event; auto-clear after 3s
- [ ] @mention: parse `@username` in message → create notification for mentioned user
- [ ] Local message queue: if Ably disconnected, buffer outgoing messages and flush on reconnect

### Frontend
- [x] `app/(dashboard)/chat/page.tsx` — chat interface
- [ ] Persistent chat drawer accessible from any page (floating button or sidebar icon)
- [ ] Channel sidebar: DMs at top, group channels below; unread badges per channel
- [ ] Message bubbles: sent (right, gold), received (left, neutral); timestamps on hover
- [ ] Typing indicator: "Alice is typing..." animated dots
- [ ] Online presence dots: green (online), yellow (away), grey (offline) per avatar
- [ ] Message reactions: hover message → emoji picker; counts shown below bubble
- [ ] Reply threading: quote original message in reply; click to scroll to original
- [ ] Edit/delete own messages (within 5 min window)
- [ ] File attachment: upload image/PDF; preview inline for images
- [ ] @mentions: `@` triggers member dropdown; mentioned user gets notification
- [ ] Message search: `/chat?search=keyword` — across all channels
- [ ] Pinned messages: pin important messages to top of channel
- [ ] Channel creation modal: DM (pick user) or Group (name + add members)
- [ ] Linked channel auto-open when clicking "Open channel" from a deal/project

### New Features (Extended)
- [ ] **Message read receipts** — double-tick (delivered/read) per message in DMs
- [ ] **Voice messages** — record short audio clip; store in R2; play inline
- [ ] **Code blocks** — format code in messages with syntax highlighting
- [ ] **GIF/Sticker picker** — Giphy API integration for fun messages
- [ ] **Channel announcements** — Admin can post pinned announcements in a read-only broadcast channel
- [ ] **AI chat assistant** — `/ai-help` command in any channel triggers context-aware AI response
- [ ] **Do Not Disturb** — user sets DND hours; notifications suppressed
- [ ] **Message scheduling** — schedule a message to be sent at a future time

### Verification
- [ ] WebSocket latency < 150ms (measure round-trip with performance.now())
- [ ] Message delete restricted to sender within 5 min
- [ ] Offline message queuing: disconnect → send messages → reconnect → messages delivered
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Message Enhancements (3 days)
1. Migration: `editedAt`, `deletedAt`, `replyToId`, `reactions JSONB` on `chat_messages`
2. Edit/delete API endpoints with time-window check
3. Reactions endpoint: toggle userId in reactions JSONB
4. Reply rendering: quote card above message

### Phase 2 — Real-time Completion (3 days)
1. Ably publish on send: `org:{orgId}:channel:{channelId}` subscription
2. Presence: Ably `presence.enter()` on mount, `presence.leave()` on unmount; show dots
3. Typing indicator: debounced publish on keydown; clear after 3s
4. @mention parser: regex `@(\w+)` → lookup userId → create notification

### Phase 3 — UI Polish (3 days)
1. Persistent chat drawer (portal rendered outside page layout)
2. Virtualized message list (`@tanstack/react-virtual`) for performance
3. File upload inline preview + progress bar
4. Channel sidebar with unread count badges + mute toggle

### Phase 4 — Search & Advanced (2 days)
1. Full-text search on `chat_messages.content` (GIN index)
2. DM read receipts: `message_reads` table; mark read on scroll into view
3. Linked channel auto-create hook in deals/projects creation flow
