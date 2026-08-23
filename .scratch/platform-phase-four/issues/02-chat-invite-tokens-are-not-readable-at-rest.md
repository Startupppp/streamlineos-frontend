# 02 — A chat invite token is not readable from the database

**What to build:** Chat channel invite links that a database reader cannot use.

`chat_channel_invite_links.token` stores the raw 24-byte token (`chat.ts:428`), looked up by equality on a unique index. Anyone who can read that table can join any private channel it covers. The house rule is hash-at-rest.

**Hashing alone does not fit this surface, and the reason matters.** `getOrCreateInviteLink` returns the *stored* token so an admin re-opening the invite dialog sees the same link. A hash cannot be reversed, so hashing alone means every open mints a new link and kills the one already shared — the feature stops working the way a shareable link is supposed to. Organization invitations are hash-only because they are emailed once and never re-displayed; a channel invite link is the opposite.

So: two columns, each doing one job. A deterministic hash carries the indexed lookup; the reversible ciphertext carries the re-display.

**Blocked by:** None.

**Status:** DONE — code + migration `0459`. The migration is written and journaled but **not applied**.

- [x] Joining by an invite link is an indexed lookup on a hash of the presented token, not a scan.
- [x] Re-opening the invite dialog still shows the same link that was already shared. A regression here is the whole reason this is not hash-only.
- [x] The reversible copy uses the existing shared `secret-encryption.util.ts`, not a fourth private copy of AES-GCM.
- [x] A revoked link stays unusable, and revocation still works without knowing the plaintext.
- [x] The migration backfills the hash from the existing plaintext in SQL, so **links already shared keep working**. A migration that invalidates every live invite link is not acceptable.
- [x] The migration is written and reviewable; it is **not** applied here.
- [x] Existing rows keep their plaintext until the link is next regenerated — SQL cannot encrypt with the application key. State that limitation plainly rather than implying the table is clean the moment the migration runs.
- [x] No token is logged, and no error message contains one.
