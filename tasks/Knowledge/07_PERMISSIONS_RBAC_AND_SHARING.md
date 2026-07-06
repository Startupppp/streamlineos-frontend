# Permissions RBAC And Sharing

## Permission Principles

- Server-enforced only.
- Never rely on frontend filtering.
- Retrieval must enforce permissions before LLM sees chunks.
- Public help center uses only public published chunks.
- Draft content is only available to author/editor collaborators.

## knowledge_permissions

Fields:

- id.
- org_id.
- resource_type.
- resource_id.
- subject_type.
- subject_id.
- permission.
- expires_at.
- inherited_from_resource_type.
- inherited_from_resource_id.
- created_by.
- created_at.

Resource types:

- space.
- article.
- collection.

Subject types:

- user.
- team.
- department.
- role.
- organization.

Permissions:

- view.
- comment.
- edit.
- publish.
- verify.
- manage.

## RAG Permission Requirements

- Store permission scope or ACL hash on chunks.
- Recompute chunk ACL when article/space permissions change.
- Retrieval query must filter by org and accessible resource IDs.
- Citation endpoint must re-check access.
- Answer text must not include inaccessible source content.

## Sharing Features

- Share article with user/team.
- Share space with team.
- Expiring share.
- Public help publish.
- Link access disabled by default for internal docs.

## Edge Cases

- Permission changed after retrieval but before answer.
- Article moved to restricted space.
- User removed from team.
- Draft indexed for author but queried by someone else.
- Citation clicked after access revoked.

