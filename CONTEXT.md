# StreamlineOS domain glossary

## Chat

**Chat event**: a realtime notice about a conversation (message created/updated/deleted, reaction changed, huddle started/ended/joined, user notification). Only the server emits chat events, through the chat events module; clients only subscribe. Each kind has one zod schema.

**Durable chat event**: a chat event that creates a row people must see (user message, system message). Published right after commit, with the outbox as a backstop; clients refetch on reconnect so nothing depends on the outbox running.

**Typing**: Ably presence state on the conversation's channel, not a chat event.

**Huddle**: an external Google Meet or Microsoft Teams meeting started from a conversation through the starter's primary Composio calendar connection. StreamlineOS keeps only the join link, starter, provider, invites and active status; the meeting owns chat, video and moderation.

**Linked record**: a record from another module (Build ticket/project, CRM client/deal/lead, …) referenced by type and id, resolved and access-checked through an entity adapter.

**Record conversation**: the conversation attached to one linked record, embeddable on that record's module page.
