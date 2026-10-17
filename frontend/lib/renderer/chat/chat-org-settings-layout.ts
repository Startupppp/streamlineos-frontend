import type { RecordLayout } from "../layout";

/**
 * An organisation's chat defaults, as data.
 *
 * A singleton: one record per organisation, only ever edited, so it declares
 * no list columns. The ranges mirror the backend's
 * `updateChatOrgSettingsSchema` bounds.
 */
export const CHAT_ORG_SETTINGS_LAYOUT: RecordLayout = {
  key: "chat:org-settings",
  singular: "Chat settings",
  plural: "Chat settings",
  titleField: "defaultNotificationPreference",
  fields: [
    {
      name: "defaultNotificationPreference",
      label: "Default notifications",
      kind: "select",
      required: true,
      hint: "Applies to members who have not chosen their own setting for a channel.",
      options: [
        { value: "ALL", label: "All messages" },
        { value: "MENTIONS", label: "Mentions only" },
        { value: "NOTHING", label: "Nothing" },
      ],
    },
    {
      name: "maxAttachmentSizeMb",
      label: "Maximum attachment size (MB)",
      kind: "number",
      required: true,
      range: { min: 1, max: 1000 },
    },
    {
      name: "maxHuddleParticipants",
      label: "Maximum huddle participants",
      kind: "number",
      required: true,
      range: { min: 2, max: 500 },
    },
  ],
  list: { searchPlaceholder: "", columns: [] },
  detail: {
    sections: [
      {
        title: "Defaults",
        fields: ["defaultNotificationPreference", "maxAttachmentSizeMb", "maxHuddleParticipants"],
      },
    ],
  },
  form: {
    sections: [
      {
        title: "",
        fields: ["defaultNotificationPreference", "maxAttachmentSizeMb", "maxHuddleParticipants"],
      },
    ],
  },
};
