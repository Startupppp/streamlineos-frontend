# StreamlineOS Product Bible

# Knowledge Module

# 04_Database_Design.md

## Design Principles

- Multi-tenant first.
- UUID primary keys preferred for new tables unless repository convention requires otherwise.
- Every row belongs to `organization_id` except global system templates.
- Soft delete for user-created content.
- Forward-only migrations.
- Indexed for tree reads, search, permission checks, review queues, and analytics.
- No shared cache for permission-specific content.
- Article content stored as structured JSON plus plain text projection.

## Core Tables

## knowledge_spaces

Fields:

- id
- organization_id
- name
- slug
- description
- type
- icon
- color
- default_visibility
- owning_team_id
- created_by_user_id
- archived_at
- created_at
- updated_at
- deleted_at

Types:

- private
- team
- company
- module
- support
- project

Indexes:

- organization_id
- organization_id, slug unique where deleted_at is null
- organization_id, type
- owning_team_id

## knowledge_articles

Fields:

- id
- organization_id
- space_id
- parent_article_id
- collection_id
- title
- slug
- excerpt
- content_json
- content_html
- content_text
- status
- visibility
- content_type
- trust_state
- owner_user_id
- author_user_id
- verified_by_user_id
- verified_until
- current_version_id
- sort_order
- path
- depth
- tags
- icon
- cover_image_url
- published_at
- archived_at
- last_verified_at
- review_interval_days
- next_review_at
- seo_title
- seo_description
- public_slug
- created_at
- updated_at
- deleted_at
- deleted_by_user_id
- locked_by_user_id
- locked_at
- lock_expires_at
- import_source
- import_external_id
- duplicate_of_article_id

Statuses:

- draft
- in_review
- published
- archived

Visibility:

- private
- shared
- team
- company
- public_help_center

Content types:

- note
- sop
- policy
- support_article
- troubleshooting
- decision_record
- meeting_notes
- runbook
- project_brief
- playbook

Trust states:

- unverified
- verified
- verification_expired

Indexes:

- organization_id, space_id
- organization_id, parent_article_id
- organization_id, status
- organization_id, visibility
- organization_id, content_type
- organization_id, trust_state
- organization_id, next_review_at
- organization_id, verified_until
- organization_id, updated_at
- organization_id, slug
- organization_id, public_slug where visibility = public_help_center
- full-text index on title/content_text where database supports it

## knowledge_collections

Fields:

- id
- organization_id
- space_id
- name
- slug
- description
- icon
- sort_order
- created_at
- updated_at
- deleted_at

Indexes:

- organization_id, space_id
- organization_id, space_id, slug unique

## knowledge_article_versions

Fields:

- id
- organization_id
- article_id
- version_number
- title
- content_json
- content_html
- content_text
- change_summary
- diff_summary
- restore_of_version_id
- created_by_user_id
- created_at

Indexes:

- organization_id, article_id, version_number unique
- article_id, created_at

## knowledge_permissions

Fields:

- id
- organization_id
- resource_type
- resource_id
- subject_type
- subject_id
- permission
- expires_at
- inherited_from_resource_type
- inherited_from_resource_id
- created_by_user_id
- created_at
- updated_at

Resource types:

- space
- article

Subject types:

- user
- team
- department
- role
- organization

Permissions:

- view
- comment
- edit
- publish
- manage

Indexes:

- organization_id, resource_type, resource_id
- organization_id, subject_type, subject_id
- organization_id, resource_type, resource_id, subject_type, subject_id unique

## knowledge_favorites

Fields:

- id
- organization_id
- user_id
- resource_type
- resource_id
- sort_order
- created_at

Indexes:

- organization_id, user_id
- organization_id, user_id, resource_type, resource_id unique

## knowledge_article_views

Fields:

- id
- organization_id
- article_id
- user_id
- viewed_at
- source

Indexes:

- organization_id, user_id, viewed_at
- organization_id, article_id, viewed_at

## knowledge_comments

Fields:

- id
- organization_id
- article_id
- parent_comment_id
- body
- body_json
- status
- created_by_user_id
- resolved_by_user_id
- resolved_at
- created_at
- updated_at
- deleted_at

Indexes:

- organization_id, article_id
- organization_id, created_by_user_id

## knowledge_attachments

Fields:

- id
- organization_id
- article_id
- file_name
- file_key
- file_url
- mime_type
- size_bytes
- checksum
- uploaded_by_user_id
- created_at
- deleted_at

Indexes:

- organization_id, article_id
- organization_id, uploaded_by_user_id

## knowledge_templates

Fields:

- id
- organization_id nullable for system templates
- name
- slug
- description
- category
- scope
- content_json
- content_html
- variables
- default_content_type
- default_review_interval_days
- is_system
- is_active
- created_by_user_id
- created_at
- updated_at
- deleted_at

Indexes:

- organization_id, category
- organization_id, slug unique where deleted_at is null
- is_system

## knowledge_reviews

Fields:

- id
- organization_id
- article_id
- type
- status
- requested_by_user_id
- reviewer_user_id
- due_at
- decision
- decision_note
- verification_expires_at
- decided_at
- created_at
- updated_at

Types:

- publish_approval
- freshness_review
- compliance_review

Statuses:

- pending
- approved
- rejected
- completed
- cancelled

Indexes:

- organization_id, status, due_at
- organization_id, reviewer_user_id, status
- organization_id, article_id

## knowledge_links

Fields:

- id
- organization_id
- article_id
- target_type
- target_id
- relation_type
- created_by_user_id
- created_at

Relation types:

- documents
- explains
- decision_for
- runbook_for
- support_article_for
- onboarding_for
- policy_for

Indexes:

- organization_id, article_id
- organization_id, target_type, target_id

## knowledge_search_events

Fields:

- id
- organization_id
- user_id
- query
- scope
- result_count
- clicked_article_id
- asked_ai
- no_result_action
- created_at

Indexes:

- organization_id, created_at
- organization_id, result_count

## knowledge_ai_embeddings

Fields:

- id
- organization_id
- article_id
- article_version_id
- chunk_index
- content_hash
- chunk_text
- embedding
- metadata
- is_verified_source
- permission_fingerprint
- created_at

Indexes:

- organization_id, article_id
- organization_id, content_hash

Use pgvector if available. If the repository currently uses a different vector solution, adapt to the existing one.

## knowledge_feedback

Fields:

- id
- organization_id
- article_id
- user_id
- feedback_type
- comment
- source
- resolved_at
- resolved_by_user_id
- created_at

Feedback types:

- helpful
- not_helpful
- outdated
- missing_information
- confusing

Indexes:

- organization_id, article_id
- organization_id, created_at

## knowledge_audit_events

Fields:

- id
- organization_id
- actor_user_id
- action
- resource_type
- resource_id
- before
- after
- ip_address
- user_agent
- created_at

Indexes:

- organization_id, resource_type, resource_id
- organization_id, actor_user_id
- organization_id, created_at

## knowledge_import_jobs

Fields:

- id
- organization_id
- source_type
- target_space_id
- status
- file_key
- file_name
- total_items
- processed_items
- succeeded_items
- failed_items
- duplicate_items
- error_report
- mapping_config
- started_by_user_id
- started_at
- completed_at
- created_at
- updated_at

Statuses:

- pending
- validating
- running
- completed
- failed
- cancelled

Indexes:

- organization_id, status
- organization_id, started_by_user_id
- organization_id, created_at

## knowledge_export_jobs

Fields:

- id
- organization_id
- scope_type
- scope_id
- format
- status
- file_key
- requested_by_user_id
- requested_at
- completed_at
- expires_at
- created_at
- updated_at

Indexes:

- organization_id, requested_by_user_id
- organization_id, status

## Data Integrity Rules

- Article parent must belong to the same organization.
- Article parent must belong to the same space unless moving entire subtree.
- Private spaces have exactly one owning user.
- Public help articles must be in support spaces.
- Public help articles must be published before anonymous access.
- Verified articles must have `verified_by_user_id` and `verified_until` unless verified indefinitely by policy.
- Verification expires automatically when `verified_until` is in the past.
- A locked article can be edited only by the lock owner or after lock expiry.
- Import external IDs are unique per organization/source when present.
- Deleted spaces cannot be used for new articles.
- Archived articles cannot be edited unless restored.
- Article slugs are unique within space.
- Public slugs are unique within organization.

## Retention

- Soft-deleted articles remain restorable for default 30 days.
- Audit events are retained based on organization plan.
- Version history retention is plan-based.
- Public deleted content must return 404 immediately.
- Import/export job files expire according to organization retention and storage policy.
