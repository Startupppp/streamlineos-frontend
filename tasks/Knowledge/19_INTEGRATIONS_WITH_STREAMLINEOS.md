# Integrations With StreamlineOS

## Module Integrations

- Chat: convert repeated questions to article; ask AI from chat.
- Projects: project wiki, project decisions, project RAG scope.
- Recruitment: interview guides, offer docs, candidate FAQs.
- Payroll: payroll policy articles and employee FAQs.
- HR: handbook, policies, onboarding guides.
- CRM: client playbooks, sales scripts, proposal docs.
- Support: help articles and answer suggestions.
- Sign: signed policy documents stored as verified knowledge if enabled.
- Surveys: create FAQ/gaps from survey responses.

## Contextual Ask

AI Ask can be scoped to:

- Current project.
- Current client.
- Current employee.
- Current module.
- Current support ticket.

## Events

Emit:

- knowledge.article.created.
- knowledge.article.updated.
- knowledge.article.published.
- knowledge.article.verified.
- knowledge.article.expired.
- knowledge.ai.asked.
- knowledge.gap.created.
- knowledge.upload.indexed.

