# Core Schema

## knowledge_spaces

Fields:

- id.
- org_id.
- name.
- slug.
- description.
- type.
- icon.
- color.
- default_visibility.
- owning_team_id.
- ai_indexing_enabled.
- public_help_enabled.
- archived_at.
- created_by.
- created_at.
- updated_at.
- deleted_at.

Types:

- private.
- team.
- company.
- module.
- support.
- project.
- client.

## knowledge_articles

Fields:

- id.
- org_id.
- space_id.
- parent_article_id.
- collection_id.
- title.
- slug.
- excerpt.
- content_json.
- content_html.
- content_text.
- status.
- visibility.
- content_type.
- trust_state.
- owner_user_id.
- author_user_id.
- verified_by_user_id.
- verified_until.
- current_version_id.
- sort_order.
- path.
- depth.
- tags.
- icon.
- cover_image_url.
- published_at.
- archived_at.
- last_verified_at.
- review_interval_days.
- next_review_at.
- ai_indexing_enabled.
- public_slug.
- import_source.
- import_external_id.
- duplicate_of_article_id.
- created_at.
- updated_at.
- deleted_at.

Statuses:

- draft.
- in_review.
- published.
- archived.

Visibility:

- private.
- shared.
- team.
- company.
- public_help_center.

Trust states:

- unverified.
- verified.
- verification_expired.

## knowledge_article_versions

Fields:

- id.
- org_id.
- article_id.
- version_number.
- title.
- content_json.
- content_html.
- content_text.
- change_summary.
- diff_summary.
- created_by.
- created_at.

## knowledge_collections

Fields:

- id.
- org_id.
- space_id.
- name.
- slug.
- description.
- icon.
- sort_order.
- created_at.
- updated_at.
- deleted_at.

