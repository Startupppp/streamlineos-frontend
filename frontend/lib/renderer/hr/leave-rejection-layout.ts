import type { RecordLayout } from "../layout";

/**
 * Rejecting a leave request, as data.
 *
 * One field: the reason the requester is told. It is required because
 * `PUT /hr/leaves/:id/reject` is a decision the requester has to be able to
 * read, and a rejection with no reason is a refusal nobody can act on. Never
 * listed — the request it decides is the record on screen — so there are no
 * columns.
 */
export const LEAVE_REJECTION_LAYOUT: RecordLayout = {
  key: "hr:leave-rejection",
  singular: "Leave rejection",
  plural: "Leave rejections",
  titleField: "reason",
  fields: [
    {
      name: "reason",
      label: "Rejection reason",
      kind: "longText",
      required: true,
      hint: "E.g. Insufficient notice, conflicting deadlines...",
    },
  ],
  list: { searchPlaceholder: "", columns: [] },
  detail: { sections: [{ title: "Rejection", fields: ["reason"] }] },
  form: { sections: [{ title: "", fields: ["reason"] }] },
};
