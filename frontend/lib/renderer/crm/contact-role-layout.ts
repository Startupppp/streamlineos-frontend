import type { RecordLayout } from "../layout";

/**
 * A contact's place on a buying committee, as data.
 *
 * One person is a champion on one deal and a blocker on another account, so the
 * role is a record between a contact and something else rather than a column on
 * the contact. `/contacts/:id/roles` adds and removes them; there is no update
 * route, so nothing here is `editOnly` — an edit form would have nowhere to post.
 *
 * **The pointer is one question, not two.** The API stores `entity_type` and
 * `entity_id`, and the hand-written form asked for both: a dropdown to classify
 * the record, then a second dropdown narrowed by the first. That coupling is
 * what made the old form fragile — changing the type left the id from the other
 * list still selected — and it asks a person to categorise a record before
 * naming it, which is a question the picker itself answers. So the description
 * names a single `entityId`, the surface hands `RecordForm` one picker listing
 * both deals and companies, and the value it returns carries its own kind
 * (`deal:12`). The surface splits that into the two columns at the boundary, the
 * same way it splits a comma-joined `tags` string into an array and converts a
 * boolean's `"true"` into a flag. `entityType` is therefore not declared: it is
 * how the pointer is stored, not a second thing to ask.
 *
 * A role's tone is a verdict only where the domain makes one. A champion is good
 * news and a blocker is bad news; a decision maker, an economic buyer, an
 * influencer and a user are positions on a committee rather than good or bad
 * ones, and tinting all six would have told the reader nothing about any of
 * them. `info` marks the two who can actually sign.
 *
 * `entityId` is asked for and never displayed, which is why it appears in
 * `form.sections` alone. Its stored value is a number, and a column or a detail
 * row rendering it would put a raw id on screen — the thing the reference kind
 * exists to avoid. Resolving it to the deal or account name needs both lists in
 * hand, which is a screen's job and not a description's.
 */
export const CONTACT_ROLE_LAYOUT: RecordLayout = {
  key: "crm:contact-role",
  singular: "Role",
  plural: "Roles",
  titleField: "roleKey",
  fields: [
    {
      name: "entityId",
      label: "Deal or company",
      kind: "reference",
      required: true,
      /*
        No `referenceTo`. It names one domain, and this pointer genuinely has
        two — naming either would be a description asserting something false
        about half its rows. The surface supplies the picker through
        `RecordForm`'s `controls`, which is where a polymorphic choice belongs:
        which records may be picked depends on the caller's permissions, and the
        engine has no business knowing that a deal and a company can both sit
        here.
      */
      hint: "The deal or account this role applies to.",
    },
    {
      name: "roleKey",
      label: "Role",
      kind: "badge",
      required: true,
      options: [
        { value: "decision_maker", label: "Decision maker", tone: "info" },
        { value: "economic_buyer", label: "Economic buyer", tone: "info" },
        { value: "champion", label: "Champion", tone: "success" },
        { value: "blocker", label: "Blocker", tone: "danger" },
        { value: "influencer", label: "Influencer", tone: "neutral" },
        { value: "user", label: "User", tone: "neutral" },
      ],
    },
    {
      name: "isPrimary",
      label: "Primary contact",
      kind: "boolean",
      /*
        Domain words rather than Yes/No. "Primary" is what the product calls it
        and what the card shows; the false label exists because a boolean's two
        states are both values — it is simply never the interesting one, so the
        card renders the flag only when it is set.
      */
      options: [
        { value: "true", label: "Primary", tone: "success" },
        { value: "false", label: "Not primary", tone: "neutral" },
      ],
    },
    { name: "createdAt", label: "Added", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search roles…",
    columns: [
      { field: "roleKey", primary: true },
      { field: "isPrimary", width: "w-28 shrink-0" },
      { field: "createdAt", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Role", fields: ["roleKey", "isPrimary"] },
      { title: "Record", fields: ["createdAt"] },
    ],
  },
  form: {
    sections: [{ title: "Role", fields: ["entityId", "roleKey", "isPrimary"] }],
  },
};

/**
 * The two halves of a pointer, packed into one control value and back.
 *
 * A deal and a company can share an id, so the kind travels with the number
 * rather than beside it — `deal:12` and `company:12` are different records and
 * a picker returning `12` could not say which.
 */
export type ContactRoleEntityType = "deal" | "company";

export function packEntityRef(entityType: ContactRoleEntityType, entityId: number): string {
  return `${entityType}:${entityId}`;
}

/**
 * Returns undefined rather than guessing when the value is not a pointer.
 *
 * A form that submitted a half-parsed reference would attach the role to
 * whatever record happened to share the number, which is worse than refusing.
 */
export function unpackEntityRef(
  value: string,
): { entityType: ContactRoleEntityType; entityId: number } | undefined {
  const [kind, rawId] = value.split(":");
  if (kind !== "deal" && kind !== "company") return undefined;

  const entityId = Number(rawId);
  if (!Number.isInteger(entityId) || entityId <= 0) return undefined;

  return { entityType: kind, entityId };
}
