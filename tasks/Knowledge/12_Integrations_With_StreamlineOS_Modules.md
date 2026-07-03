# StreamlineOS Product Bible

# Knowledge Module

# 12_Integrations_With_StreamlineOS_Modules.md

## Purpose

Knowledge should become the documentation layer across StreamlineOS, not an isolated notes module.

## Integration Pattern

Any module can link records to articles using `knowledge_links`.

Each linked record should support:

- Related articles panel.
- Create article from record.
- Attach existing article.
- Search Knowledge from record context.
- Ask AI scoped to linked articles if permitted.

## CRM

Use cases:

- Sales playbooks.
- Objection handling.
- Deal handoff notes.
- Account research.
- Quote process docs.

Record links:

- Lead.
- Contact.
- Deal.
- Quote.
- Customer.

## HR

Use cases:

- Handbook.
- Policies.
- Onboarding guides.
- Department SOPs.
- Interview training.
- Payroll process docs.
- Exit process docs.

Record links:

- Employee.
- Department.
- Team.
- Job.
- Candidate.
- Onboarding task.
- Policy.

## Inventory

Use cases:

- Receiving SOP.
- Stock count SOP.
- Product handling guide.
- Vendor process.
- Warehouse safety.
- Barcode procedures.

Record links:

- Product.
- Variant.
- Warehouse.
- Location.
- Vendor.
- Purchase order.
- Sales order.
- Transfer.

## Projects

Use cases:

- Project brief.
- Requirements.
- Decision records.
- Meeting notes.
- Retrospectives.

Record links:

- Project.
- Task.
- Sprint.
- Milestone.
- Goal.

## Support

Use cases:

- Public help center.
- Internal troubleshooting.
- Ticket macros.
- Repeated issue articles.
- Customer education.

Record links:

- Ticket.
- Customer.
- SLA.
- Help article.

Support automation:

- Suggest articles while replying.
- Create draft article from solved ticket.
- Detect tickets with no linked article.
- Track article deflection.

## Chat

Use cases:

- Turn useful messages into articles.
- Link article in channel.
- Ask Knowledge in chat.
- Mention articles.

Rules:

- Creating article from chat must respect channel permissions.
- Linked article access must not expose private channel content.

## Calendar And Meetings

Use cases:

- Meeting notes.
- Decision records.
- Follow-up tasks.

Rules:

- If calendar integration is disconnected, show connect prompt instead of broken data.

## Documents And Files

Use cases:

- Attach source documents to articles.
- Convert internal docs into Knowledge articles.
- Link HR documents, policy PDFs, and SOP assets.

Rules:

- Do not duplicate large files into article content.
- Store files through existing storage provider.
- Private file links require signed URL access checks.

## Workflows And Automations

Use cases:

- Trigger review when article becomes stale.
- Create article from completed onboarding process.
- Create task when failed search repeats.
- Notify team when policy changes.

Rules:

- Automations must run with explicit actor/system context.
- Automation-created content starts as draft unless policy allows auto-publish.

## Accounting

Use cases:

- Invoice SOPs.
- Vendor payment process.
- GST/tax process docs.
- Month-end close checklist.

Record links:

- Invoice.
- Expense.
- Vendor payment.
- Ledger account.

## AI

Use cases:

- Ask from linked records.
- Summarize article.
- Draft SOP from tickets/chat.
- Rewrite article for clarity.
- Find stale or conflicting knowledge.

Rules:

- AI actions consume credits/top-up if configured.
- AI respects exact user permissions.

## Global Search

Knowledge articles must appear in global search if user can view them.

Result metadata:

- Article title.
- Space.
- Breadcrumb.
- Updated date.
- Status.

## Acceptance Criteria

- At least Support, HR, CRM, Inventory, Projects, and Chat have defined integration hooks.
- Documents/files and workflow automation hooks are defined.
- Linked records do not bypass permissions.
- Existing support KB uses Knowledge as source of truth.
