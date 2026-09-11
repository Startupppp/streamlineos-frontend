# StreamlineOS data map decision record

Copy this file to a dated controlled record after review. Do not treat this blank template as approval evidence.

## Scope

- Record ID:
- Review date:
- Organizations/regions/environments:
- DPO or privacy owner:

## Processing inventory

| Category/table | Data subjects and fields | Purpose | Lawful basis | Special-category basis | Retention | Owner | Processor/region | Deletion or archival behavior |
|---|---|---|---|---|---|---|---|---|
| Identity/authentication | | | | | | | | |
| Employment/payroll | | | | | | | | |
| Sensitive HR/workplace records | `biometric_logs`, `hr_wellness_checkins`, `hr_accommodation_requests`, `hr_safety_incidents`, `hr_work_authorizations` | | DECISION REQUIRED | DECISION REQUIRED for Art. 9 condition | DECISION REQUIRED | | | Restrict access; delete at approved period or legal hold |
| Communication | `chat_messages`, `mail_message_metadata`, `notifications`, attendance report email queue | | | | | | | |
| Time/attendance | | | | | | | | |
| Documents | | | | | | | | |
| Recruitment | | | | | | | | |
| Financial | | | | | | | | |
| Audit/operator access | | | | | | | | |
| AI/integrations | | | | | | | | |
| AI processing | `ai_chat_conversations`, `ai_chat_messages`, `ai_feedback`, `ai_jobs`, `ai_usage_logs` | | DECISION REQUIRED | DECISION REQUIRED for special-category prompts | DECISION REQUIRED | | OpenAI embeddings; Google or OpenRouter chat/LLM; configured region | Redact or delete prompts and derived data under approved period |
| Knowledge base | `kb_chat_conversations`, `kb_chat_messages`, `kb_pages`, `kb_page_versions`, `kb_article_chunks` | | DECISION REQUIRED | DECISION REQUIRED for sensitive authored/chat content | DECISION REQUIRED | | Application and search index | Delete derived chunks with source content |
| Support | `support_tickets`, `support_ticket_messages`, `support_ticket_attachments`, `support_csat_requests` | | DECISION REQUIRED | DECISION REQUIRED for sensitive support content | DECISION REQUIRED | | Application and configured storage | Close, retain, then delete attachments and messages |
| Signatures | `sign_documents`, `sign_audit_events` | | DECISION REQUIRED | Inherits from signed document; DECISION REQUIRED where sensitive | DECISION REQUIRED | | Configured signature/storage provider | Preserve approved evidence, then delete or archive |
| Notifications | `notification_preferences`, `notification_consents`, `notification_deliveries`, `notification_outbox`, `notification_digest_runs` | | DECISION REQUIRED | Usually not applicable; review message content | DECISION REQUIRED | | Application and email provider | Preserve consent evidence; purge delivery and outbox records |
| Integrations/webhooks | `user_integration_connections`, `webhook_deliveries`, `webhook_logs` | | DECISION REQUIRED | DECISION REQUIRED; prohibit unapproved sensitive payloads | DECISION REQUIRED | | Composio and configured providers | Revoke/delete connections on disconnect; expire payloads |
| Organization/membership | `organizations`, `organization_members` | | DECISION REQUIRED | Usually not applicable; affiliation may be sensitive | DECISION REQUIRED | | Application database | Remove access and retain only approved audit history |
| Calendar/meetings | `calendar_events`, `event_attendees`, `project_meetings`, `meeting_attendees` | | DECISION REQUIRED | DECISION REQUIRED for sensitive notes or topics | DECISION REQUIRED | | Application and calendar provider | Delete after event-based period; recordings require separate policy |
| Projects | `projects`, `project_members` | | DECISION REQUIRED | Usually not applicable; review free text | DECISION REQUIRED | | Application database | Delete or archive after project closure period |

## Unresolved decisions and conditions

| Decision/risk | Owner | Mitigation | Due date | Approval or release-authority reference |
|---|---|---|---|---|

## Attestation

- Privacy/DPO approver:
- Legal approver:
- Date and signature/approval reference:
