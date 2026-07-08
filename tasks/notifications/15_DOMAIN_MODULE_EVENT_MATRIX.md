# Domain Module Event Matrix

## Purpose
Every StreamlineOS product module should emit consistent events into the central notification system.

## Chat
- `chat.message.direct`
- `chat.message.mention`
- `chat.thread.reply`
- `chat.channel.invited`
- `chat.huddle.invite`
- `chat.reply.reminder`

## Projects
- `project.task.assigned`
- `project.task.due_soon`
- `project.task.overdue`
- `project.task.comment.mention`
- `project.task.status.changed`
- `project.sprint.started`
- `project.sprint.ending`
- `project.blocker.created`
- `project.approval.requested`

## CRM
- `crm.lead.assigned`
- `crm.lead.created`
- `crm.deal.stage_changed`
- `crm.followup.due`
- `crm.followup.overdue`
- `crm.customer.message_received`
- `crm.automation.failed`

## HR
- `hr.leave.requested`
- `hr.leave.approved`
- `hr.leave.rejected`
- `hr.attendance.missing`
- `hr.document.expiring`
- `hr.announcement.created`

## Payroll
- `payroll.run.created`
- `payroll.run.approval_requested`
- `payroll.run.approved`
- `payroll.payment.failed`
- `payroll.payslip.ready`
- `payroll.tax.document.ready`

## Recruitment
- `recruitment.candidate.applied`
- `recruitment.candidate.referred`
- `recruitment.interview.scheduled`
- `recruitment.interview.feedback_due`
- `recruitment.offer.approval_requested`
- `recruitment.offer.accepted`

## Knowledge
- `knowledge.article.mentioned`
- `knowledge.article.comment_created`
- `knowledge.article.approval_requested`
- `knowledge.article.published`
- `knowledge.ai.answer_ready`
- `knowledge.document.ingestion_failed`

## Sign
- `sign.document.sent`
- `sign.document.viewed`
- `sign.document.signed`
- `sign.document.completed`
- `sign.document.expiring`
- `sign.document.declined`

## Inventory
- `inventory.stock.low`
- `inventory.stock.out`
- `inventory.reorder.suggested`
- `inventory.transfer.requested`
- `inventory.transfer.completed`
- `inventory.adjustment.approval_requested`

## Surveys
- `survey.response.received`
- `survey.deadline.due_soon`
- `survey.certification.passed`
- `survey.certification.failed`
- `survey.live_session.started`

## Calendar
- `calendar.event.invited`
- `calendar.event.starting_soon`
- `calendar.event.changed`
- `calendar.event.cancelled`
- `calendar.reminder`

## Billing
- `billing.invoice.created`
- `billing.invoice.due_soon`
- `billing.payment.failed`
- `billing.subscription.changed`
- `billing.subscription.cancelled`

## Security
- `security.login.new_device`
- `security.password.changed`
- `security.mfa.disabled`
- `security.role.changed`
- `security.api_key.created`
- `security.suspicious_activity`

## Support
- `support.ticket.assigned`
- `support.ticket.customer_replied`
- `support.ticket.sla_breached`
- `support.ticket.escalated`

## Backend Requirements
- Each module should call notification event service, not manually decide channels.
- Each event payload must include entity link, actor, target users, and variables.

## Frontend Requirements
- Notification cards should deep-link to the correct module record.
- Category icons/colors should be consistent across modules.
