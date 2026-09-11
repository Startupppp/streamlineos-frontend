import { personNameSchema } from "@/lib/person-name-schema";
import type { BulkEntity } from "./bulk-import-model";

/**
 * The entities this page imports through a plain bulk endpoint.
 *
 * Parties are not here. Their import is planned on the server, committed as a
 * durable job and reversible afterwards, and lives in `import-page.tsx` against
 * `/crm/imports/*`. Leads, contacts and deals have none of that: each has a
 * single `POST` that takes rows and writes them. Pretending otherwise by
 * routing them through the party planner would either lose their fields — a
 * lead's priority and tags, a deal's stage and close date have nowhere to land
 * on a party — or silently write them into the wrong table.
 *
 * So the shape of this file is the honest one: a description of each entity's
 * columns, coercions and endpoint, driven by one flow. It exists because the
 * three CSV dialogs it replaced were three copies of the same four hundred
 * lines differing only in this data.
 */

export type {
  Cell,
  BulkValue,
  BulkRow,
  BulkImportResult,
  BulkField,
  BulkPreviewColumn,
  BulkEntityId,
  BulkEntity,
} from "./bulk-import-model";
export { matchField, requiredFieldOf } from "./bulk-import-model";

const LEAD_SOURCES = [
  "referral",
  "campaign",
  "cold_call",
  "website",
  "social_media",
  "walk_in",
  "other",
];
const LEAD_PRIORITIES = ["HOT", "WARM", "COLD"];
const DEAL_STAGES = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

/** A value the column accepts, or nothing — never a value it does not. */
function oneOf(allowed: string[], value: string | undefined): string | undefined {
  return value !== undefined && allowed.includes(value) ? value : undefined;
}

/**
 * Good enough for an endpoint that validates addresses.
 *
 * Deliberately the loosest useful check rather than a second opinion on RFC
 * 5322: its only job is to keep a row that says `n/a` or `ask Priya` in an
 * email column from taking the other four hundred rows down with it.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** An address, or nothing plus a line saying what was dropped and why. */
function email(
  value: string | undefined,
  field: string,
  notes: string[],
): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (LOOKS_LIKE_EMAIL.test(value)) return value;
  notes.push(`${field} "${value}" is not an address, so it was left off`);
  return undefined;
}

const LEADS: BulkEntity = {
  id: "leads",
  label: "Leads",
  noun: ["lead", "leads"],
  permission: "crm:leads:create",
  endpoint: "/leads/import",
  maxRows: 1_000,
  option: {
    key: "autoDistribute",
    label: "Share these out across the sales team",
    hint: "Splits the imported leads evenly between active reps as they land. Off, they arrive unassigned.",
  },
  fields: [
    { key: "name", label: "Name", required: true, aliases: ["lead name", "full name", "contact name", "lead"] },
    { key: "email", label: "Email", aliases: ["e-mail", "email address", "mail"] },
    { key: "phone", label: "Phone", aliases: ["mobile", "tel", "telephone", "contact number", "phone number", "mobile number"] },
    { key: "company", label: "Company", aliases: ["organization", "org", "firm", "company name"] },
    { key: "source", label: "Source", aliases: ["lead source", "channel"] },
    { key: "notes", label: "Notes", aliases: ["remarks", "comments", "description"] },
    { key: "city", label: "City", aliases: ["location", "area"] },
    { key: "designation", label: "Designation", aliases: ["title", "role", "position", "job title"] },
    { key: "referredBy", label: "Referred by", aliases: ["referral", "referred", "referrer"] },
    { key: "potentialValue", label: "Potential value", aliases: ["value", "deal value", "amount", "budget"] },
    { key: "investmentInterest", label: "Investment interest", aliases: ["investment", "interest"] },
    { key: "whatsappNumber", label: "WhatsApp number", aliases: ["whatsapp", "wa number"] },
    { key: "website", label: "Website", aliases: ["url", "web"] },
    { key: "priority", label: "Priority (HOT/WARM/COLD)", aliases: ["lead priority", "urgency"] },
    { key: "tags", label: "Tags (comma separated)", aliases: ["labels", "categories"] },
  ],
  columns: [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "company", header: "Company" },
    { key: "source", header: "Source", kind: "badge" },
    { key: "priority", header: "Priority", kind: "badge" },
  ],
  template:
    "name,email,phone,company,source,notes,city,designation,priority,potential value,referred by\n" +
    "John Doe,john@example.com,+919876543210,Acme Corp,website,Interested in premium plan,Hyderabad,CEO,HOT,500000,Ravi Kumar\n",
  build(cell) {
    const name = cell("name");
    if (!name) return { error: "no name" };

    const tags = cell("tags");

    return {
      row: {
        name,
        email: cell("email") ?? "",
        phone: cell("phone"),
        company: cell("company"),
        source: oneOf(LEAD_SOURCES, cell("source")?.toLowerCase()),
        notes: cell("notes"),
        city: cell("city"),
        designation: cell("designation"),
        referredBy: cell("referredBy"),
        potentialValue: cell("potentialValue"),
        investmentInterest: cell("investmentInterest"),
        whatsappNumber: cell("whatsappNumber"),
        website: cell("website"),
        priority: oneOf(LEAD_PRIORITIES, cell("priority")?.toUpperCase()),
        tags: tags
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined,
      },
    };
  },
  body: (rows, autoDistribute) => ({ leads: rows, autoDistribute }),
  summarise(result) {
    const parts = [`${result.imported ?? 0} imported`];
    if (result.updated) parts.push(`${result.updated} updated`);
    if (result.skipped) parts.push(`${result.skipped} skipped as duplicates`);
    if (result.distributed)
      parts.push(
        `${result.distributed} shared across ${result.salesPeopleCount ?? 0} ${
          result.salesPeopleCount === 1 ? "rep" : "reps"
        }`,
      );
    return parts.join(", ");
  },
};

const CONTACTS: BulkEntity = {
  id: "contacts",
  label: "Contacts",
  noun: ["contact", "contacts"],
  permission: "crm:contacts:manage",
  endpoint: "/contacts/bulk-import",
  maxRows: 500,
  fields: [
    { key: "first_name", label: "First name", required: true, aliases: ["fname", "given name"] },
    { key: "last_name", label: "Last name", aliases: ["lname", "surname", "family name"] },
    { key: "email", label: "Email", aliases: ["e-mail", "email address", "mail"] },
    { key: "phone", label: "Phone", aliases: ["mobile", "tel", "telephone", "contact number", "phone number", "mobile number"] },
    { key: "company", label: "Company", aliases: ["organization", "org", "firm", "company name"] },
    { key: "title", label: "Job title", aliases: ["position", "role", "designation"] },
    { key: "source", label: "Source", aliases: ["lead source", "channel"] },
    { key: "notes", label: "Notes", aliases: ["remarks", "comments", "description"] },
  ],
  columns: [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone" },
    { key: "company", header: "Company" },
    { key: "title", header: "Title" },
    { key: "source", header: "Source", kind: "badge" },
  ],
  template:
    "first_name,last_name,email,phone,company,title,source,notes\n" +
    "Jane,Doe,jane@example.com,+919876543210,Acme Corp,VP Sales,website,Interested in enterprise plan\n",
  build(cell) {
    const first = cell("first_name");
    if (!first) return { error: "no first name" };

    const last = cell("last_name");
    const full = last ? `${first} ${last}` : first;
    // The endpoint validates the same schema and rejects the whole batch on one
    // bad name, so a row that would fail there is caught and reported here
    // instead — five hundred good rows should not be lost to one.
    const name = personNameSchema.safeParse(full);
    if (!name.success) return { error: `"${full}" is not a name this accepts` };

    const notes: string[] = [];

    return {
      notes,
      row: {
        name: name.data,
        email: email(cell("email"), "Email", notes),
        phone: cell("phone"),
        company: cell("company"),
        title: cell("title"),
        source: oneOf(LEAD_SOURCES, cell("source")?.toLowerCase()),
        notes: cell("notes"),
      },
    };
  },
  body: (rows) => ({ contacts: rows }),
  summarise: (result) =>
    `${result.created ?? 0} created${result.failed ? `, ${result.failed} could not be written` : ""}`,
};

const DEALS: BulkEntity = {
  id: "deals",
  label: "Deals",
  noun: ["deal", "deals"],
  permission: "crm:deals:create",
  endpoint: "/deals/bulk-import",
  maxRows: 500,
  fields: [
    { key: "name", label: "Deal name", required: true, aliases: ["deal name", "title", "deal title"] },
    { key: "value", label: "Value", aliases: ["amount", "deal value", "budget", "price"] },
    { key: "stage", label: "Stage (NEW/QUALIFIED/…)", aliases: ["deal stage", "status", "pipeline stage"] },
    { key: "ownerEmail", label: "Owner email", aliases: ["owner email", "owner", "assigned to", "sales rep email", "rep email"] },
    {
      key: "expectedCloseDate",
      label: "Expected close date",
      aliases: ["expected close date", "close date", "closing date", "due date"],
    },
    { key: "contactEmail", label: "Contact email", aliases: ["contact email", "customer email", "client email"] },
    { key: "companyName", label: "Company name", aliases: ["company name", "company", "organization", "account", "account name"] },
    { key: "description", label: "Description", aliases: ["notes", "details", "summary", "remarks"] },
  ],
  columns: [
    { key: "name", header: "Name" },
    { key: "value", header: "Value", kind: "money" },
    { key: "stage", header: "Stage", kind: "badge" },
    { key: "ownerEmail", header: "Owner" },
    { key: "expectedCloseDate", header: "Close date" },
  ],
  template:
    "name,value,stage,owner_email,expected_close_date,contact_email,company_name,description\n" +
    "Enterprise Deal,500000,QUALIFIED,owner@example.com,2025-12-31,client@corp.com,Acme Corp,Q4 renewal negotiation\n",
  build(cell) {
    const name = cell("name");
    if (!name) return { error: "no deal name" };

    const rawValue = cell("value");
    // Currency symbols, thousands separators and a trailing "/-" are all normal
    // in an exported sheet; what is left has to be a number or the cell is not
    // a value at all.
    const parsed = rawValue === undefined ? undefined : Number(rawValue.replace(/[^0-9.-]/g, ""));
    const value = parsed !== undefined && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;

    const notes: string[] = [];

    return {
      notes,
      row: {
        name,
        value,
        // An unreadable stage is not a reason to drop the deal, and NEW is
        // where an unplaced deal belongs.
        stage: oneOf(DEAL_STAGES, cell("stage")?.toUpperCase()) ?? "NEW",
        ownerEmail: email(cell("ownerEmail"), "Owner email", notes),
        expectedCloseDate: cell("expectedCloseDate"),
        contactEmail: email(cell("contactEmail"), "Contact email", notes),
        companyName: cell("companyName"),
        description: cell("description"),
      },
    };
  },
  body: (rows) => ({ deals: rows }),
  summarise: (result) =>
    `${result.created ?? 0} created${result.failed ? `, ${result.failed} could not be written` : ""}`,
};

export const BULK_ENTITIES: readonly BulkEntity[] = [LEADS, CONTACTS, DEALS];
