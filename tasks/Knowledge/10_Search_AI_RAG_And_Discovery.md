# StreamlineOS Product Bible

# Knowledge Module

# 10_Search_AI_RAG_And_Discovery.md

## Purpose

Users should find trusted answers quickly through keyword search, contextual discovery, and permission-safe AI.

## Search Requirements

Search scopes:

- All Knowledge.
- Current space.
- Current article descendants.
- Private notes.
- Shared with me.
- Support KB.
- Module space.

Search filters:

- Space.
- Status.
- Owner.
- Tag.
- Updated date.
- Review state.
- Article type/template.

Search result fields:

- Title.
- Snippet.
- Space.
- Status.
- Owner.
- Updated date.
- Breadcrumb path.
- Permission badge if shared.

## Ranking Signals

- Exact title match.
- Keyword match in content.
- Recently updated.
- Recently viewed by user.
- Favorited by user.
- Published over draft for general search.
- Space relevance.
- Team membership.
- Helpfulness.
- Verified/trusted state.
- Verification freshness.

## Discovery

Show suggestions:

- Related articles.
- Articles linked to current record.
- Recently updated in my team.
- Articles needing review.
- Search gaps.
- Drafts I should finish.

## AI Ask

AI Ask must answer from Knowledge content and cite sources.

Inputs:

- Question.
- Optional space.
- Optional article.
- Optional linked record context.

Output:

- Answer.
- Citations.
- Confidence/has context.
- Suggested follow-up actions.

Rules:

- Only retrieve chunks from articles the user can view.
- Prefer verified and recently reviewed sources.
- If no permitted context exists, say no answer is available from accessible Knowledge.
- Do not answer from hidden/private articles.
- Do not show citation metadata for inaccessible articles.
- Log AI usage for billing and analytics.
- Respect AI top-up/credit limits.
- Include stale-content warning when the best available source is expired.

## Embedding Pipeline

On article publish/update:

1. Extract plain text.
2. Split into chunks.
3. Hash chunks.
4. Reuse embeddings for unchanged chunks.
5. Store embeddings with organization/article/version metadata.
6. Remove stale embeddings for deleted/archived content where appropriate.

## Draft AI Handling

Draft content:

- Can be used for the author asking inside that draft.
- Can be used for explicit collaborators with edit permission.
- Must not appear in general AI answers for users without draft access.

## Knowledge Gaps

Detect gaps from:

- Search queries with zero results.
- AI questions with no context.
- Support tickets closed without linked article.
- Repeated chat questions.
- Articles with negative feedback.

Gap actions:

- Create article from query.
- Assign owner.
- Link to ticket/chat.
- Add to review queue.

## Public Help AI

If public help center AI is enabled:

- Use only public published articles.
- Do not use internal articles.
- Rate limit anonymous usage.
- Do not expose internal citations.

## Acceptance Criteria

- Search never returns inaccessible content.
- AI citations are clickable and permission-checked.
- Failed searches are recorded.
- Embeddings refresh after article updates.
- AI answers degrade gracefully without context.
- AI answers indicate when cited content is stale or unverified.
