# AI Ask And Answer Engine

## Purpose

AI Ask answers questions using only retrieved, permission-safe Knowledge content.

## Input

- Question.
- Scope.
- Optional article.
- Optional space.
- Optional module context.
- Optional answer style.

Answer styles:

- Short.
- Detailed.
- Step-by-step.
- Table.
- Checklist.

## Output

- Direct answer.
- Citations.
- Confidence.
- Source freshness.
- Follow-up questions.
- Related articles.
- Suggested actions.

## Answer Rules

- Never answer from model memory for company facts.
- Use only retrieved source chunks.
- If context is weak, say no reliable answer is available.
- Cite every factual claim.
- Prefer verified and fresh sources.
- Warn when sources are stale/unverified.
- Do not reveal hidden source names.
- Do not cite inaccessible documents.

## Supported Questions

- Policy questions.
- SOP questions.
- “How do I…” questions.
- Troubleshooting.
- Summaries.
- Comparison across docs.
- “What changed?” from versions.
- Public help center questions.

## Edge Cases

- Conflicting sources.
- No context.
- Only stale context.
- User asks for hidden/private info.
- User asks for legal/financial/medical advice.
- Question requires action outside Knowledge.

