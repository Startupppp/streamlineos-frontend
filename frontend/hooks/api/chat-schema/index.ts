/**
 * Response contracts for the chat reads that carry a PERSON.
 *
 * Three of the seven shape-drift defects this release shipped were here, and all
 * three rendered a plausible screen rather than an error: channel members
 * arrived as `membership.user` while the client declared `user` (Favourites
 * permanently empty, channel-admin controls missing); huddle participants had
 * `columns: {}` so `userId` was never selected (every tile "Unknown",
 * `isInHuddle` permanently false); and `Message.senderId` was emitted by NO read
 * path at all, so `isOwn` was always false and a user's own messages rendered as
 * somebody else's. `apiClient.get<T>` is a cast, so both repositories typechecked
 * clean throughout.
 *
 * EVERY FIELD BELOW WAS READ OFF THE BACKEND, NOT OFF `types/chat.ts`. A contract
 * copied from the frontend's declared type encodes the drift instead of catching
 * it — it would have passed happily on all three defects. The sources are
 * `chat-channel-member-shape.ts` (`CHANNEL_MEMBER_WIRE_KEYS`,
 * `CHANNEL_MEMBER_COLUMNS`), `chat-channel-member-preview.ts`
 * (`CHANNEL_LIST_COLUMNS`, `withMemberPreview`), `chat-channel-list.service.ts`
 * and the column nullability in `db/schema/chat/chat-channel-tables.ts`.
 *
 * WHY `.strict()` HERE, AGAINST THE DEFAULT IN `api-envelope.ts`. That default
 * — an added backend field is a compatible deploy — is right for a shape nobody
 * has enumerated. These shapes ARE enumerated: the backend picks them with an
 * explicit `columns:` constant and pins the member keys in
 * `CHANNEL_MEMBER_WIRE_KEYS`, which its own spec asserts. On a closed key set an
 * unexpected key is not a compatible addition, it is the drift: every one of the
 * three defects put an EXTRA key on the wire (`membership`, `senderMembership`)
 * beside the missing one. Required-and-nullable already rejects the missing
 * half; `.strict()` is what names the extra half in the error, which is the
 * difference between a five-minute diagnosis and a five-day one.
 *
 * DATES ARE STRINGS. `types/chat.ts` declares `Date | string | null` because the
 * optimistic-insert paths construct real `Date`s. Nothing on the WIRE is ever a
 * `Date` — Nest serialises a Drizzle `timestamp` to an ISO string — so the
 * contract says `string`, and a `.notNull()` column says non-nullable.
 *
 * ENUMS. `type`, `role` and `notificationPreference` have no CHECK constraint,
 * so the enums here rest on two measurements: every write goes through a Zod
 * literal/enum DTO (`chat.schemas.ts` `createChannelSchema`,
 * `notificationPreferenceSchema`; `role` is written only as "ADMIN"/"MEMBER"),
 * and `scratch_perf_seed` at head holds only the declared values
 * (type PUBLIC/GROUP, role MEMBER, notification_preference DEFAULT). An
 * undeclared value arriving is drift the screen cannot render anyway.
 */

export { chatMemberUserContract, chatPreviewUserContract } from "./user-schema";
export {
  chatChannelContract,
  chatChannelMemberContract,
  chatChannelMemberPreviewContract,
  chatChannelPageContract,
  chatLastMessageContract,
  chatPublicChannelContract,
} from "./channel-schema";
export type {
  ChatChannelMemberWire,
  ChatChannelWire,
  ChatPublicChannelWire,
} from "./channel-schema";
export {
  chatActiveHuddleContract,
  chatHuddleContract,
  chatHuddleParticipantContract,
} from "./huddle-schema";
export type { ChatHuddleWire } from "./huddle-schema";
export {
  chatMessageContract,
  chatMessagesPageContract,
  chatPollPageContract,
} from "./message-schema";
export {
  chatCreateTaskContract,
  chatEntityActionOptionsContract,
  chatEntityActionsContract,
  chatOkContract,
  chatReactionsContract,
  chatSubmitActionContract,
  chatSummarizeContract,
} from "./action-schema";
export {
  chatOnlineUsersContract,
  chatOrgUsersContract,
  chatUnreadContract,
} from "./presence-schema";
export {
  chatAttachmentUrlContract,
  chatChannelFilesContract,
  chatLinkPreviewContract,
} from "./file-schema";
export {
  chatInviteLinkContract,
  chatJoinViaInviteContract,
  chatMuteResponseContract,
  chatNotifPrefResponseContract,
} from "./channel-settings-schema";
export {
  chatPinItemContract,
  chatPinsContract,
  chatSavedMessagesContract,
  chatThreadPageContract,
} from "./thread-schema";
export {
  chatSearchChannelsContract,
  chatSearchMessagesContract,
  chatSearchUsersContract,
} from "./search-schema";
