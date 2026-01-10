# Email Templates Documentation

## Complete List of Email Templates

### 1. Authentication & Security

#### Email Verification
**Function**: `getVerificationEmailTemplate(verificationUrl)`
- **When**: User signs up
- **To**: New user
- **Purpose**: Verify email address
- **Expires**: 24 hours

#### Password Reset
**Function**: `getPasswordResetEmailTemplate(resetUrl)`
- **When**: User requests password reset
- **To**: User
- **Purpose**: Reset password securely
- **Expires**: 1 hour

#### Password Change Confirmation ✨ NEW
**Function**: `getPasswordChangeConfirmationEmailTemplate(userName)`
- **When**: User successfully changes password
- **To**: User
- **Purpose**: Security notification
- **Action**: Alert user if they didn't make the change

---

### 2. Onboarding & Account Management

#### Welcome Email
**Function**: `getWelcomeEmailTemplate(name, email, tempPassword, loginUrl)`
- **When**: Admin creates new employee account
- **To**: New employee
- **Contains**: Login credentials, getting started guide
- **Action Required**: Change password on first login

#### Organization Invitation
**Function**: `getInvitationEmailTemplate(invitationUrl, organizationName, inviterName?)`
- **When**: User invited to join organization
- **To**: Invited user
- **Expires**: 7 days

#### Account Deactivation ✨ NEW
**Function**: `getAccountDeactivationEmailTemplate(employeeName, deactivatedBy, reason?)`
- **When**: Admin deactivates employee account
- **To**: Deactivated employee
- **Contains**: Reason (if provided), access restrictions info

---

### 3. HR & Leave Management

#### Leave Request Submitted ✨ NEW
**Function**: `getLeaveRequestEmailTemplate(approverName, employeeName, leaveType, startDate, endDate, reason, leaveUrl)`
- **When**: Employee submits leave request
- **To**: Designated approver (manager/admin)
- **Contains**: Leave type, dates, reason
- **Action Required**: Approve/Reject in HR portal

#### Leave Status Update ✨ NEW
**Function**: `getLeaveStatusUpdateEmailTemplate(employeeName, leaveType, startDate, endDate, status, approverName, rejectionReason?)`
- **When**: Leave request is approved/rejected
- **To**: Employee who submitted request
- **Contains**: Status, dates, rejection reason (if rejected)

#### Leave Cancellation ✨ NEW
**Function**: `getLeaveCancellationEmailTemplate(approverName, employeeName, leaveType, startDate, endDate)`
- **When**: Employee cancels a leave request
- **To**: Approver who was assigned
- **Purpose**: Notify that approval is no longer needed

---

### 4. Project Management

#### Project Assignment
**Function**: `getProjectAssignmentEmailTemplate(memberName, projectName, projectKey, projectUrl, assignedBy?)`
- **When**: User added to a project
- **To**: Assigned team member
- **Contains**: Project name, key, direct link

#### Ticket Assignment
**Function**: `getTicketAssignmentEmailTemplate(assigneeName, ticketTitle, ticketType, ticketPriority, projectName, ticketUrl, createdBy)`
- **When**: Ticket assigned to user
- **To**: Assignee
- **Contains**: Priority-based styling, ticket details
- **Highlights**: URGENT/HIGH priority tickets

#### Ticket Review Request
**Function**: `getTicketReviewRequestEmailTemplate(reviewerName, ticketTitle, ticketType, projectName, ticketUrl, completedBy, comment?)`
- **When**: Ticket moved to IN_REVIEW status
- **To**: Reviewer
- **Contains**: Work completed, latest comment
- **Action Required**: Review and approve/request changes

#### Ticket Changes Requested
**Function**: `getTicketChangesRequestedEmailTemplate(assigneeName, ticketTitle, projectName, ticketUrl, reviewerName, comment?)`
- **When**: Reviewer moves ticket back to IN_PROGRESS
- **To**: Original assignee
- **Contains**: Reviewer feedback
- **Action Required**: Make requested changes

---

### 5. Company Communications

#### Holiday Announcement ✨ NEW
**Function**: `getHolidayAnnouncementEmailTemplate(holidayName, holidayDate, message?)`
- **When**: 12 hours before company holiday (automated)
- **To**: All organization members
- **Contains**: Holiday name, date, custom message, office closure notice
- **Timing**: Sent at 12:00 PM (noon) the day before

#### Company Announcement ✨ NEW
**Function**: `getCompanyAnnouncementEmailTemplate(subject, message, announcedBy)`
- **When**: Admin sends company-wide announcement
- **To**: All organization members (or selected groups)
- **Contains**: Subject, message body, sender name
- **Use Cases**: Policy updates, news, reminders

---

## Email Sending Functions

### Standard Email Senders
```typescript
// Authentication
sendVerificationEmail(email, token)
sendPasswordResetEmail(email, token)
sendPasswordChangeConfirmationEmail(email, userName) // NEW

// Onboarding
sendInvitationEmail(email, token, organizationName, inviterName?)
sendWelcomeEmail(email, name, tempPassword, loginUrl)
sendAccountDeactivationEmail(email, employeeName, deactivatedBy, reason?) // NEW

// Leave Management
sendLeaveRequestEmail(email, approverName, employeeName, leaveType, startDate, endDate, reason) // NEW
sendLeaveStatusUpdateEmail(email, employeeName, leaveType, startDate, endDate, status, approverName, rejectionReason?) // NEW
sendLeaveCancellationEmail(email, approverName, employeeName, leaveType, startDate, endDate) // NEW

// Projects
sendProjectAssignmentEmail(email, memberName, projectName, projectKey, projectId, assignedBy?)
sendTicketAssignmentEmail(email, assigneeName, ticketTitle, ticketType, ticketPriority, projectName, projectId, ticketId, createdBy)
sendTicketReviewRequestEmail(email, reviewerName, ticketTitle, ticketType, projectName, projectId, ticketId, completedBy, comment?)
sendTicketChangesRequestedEmail(email, assigneeName, ticketTitle, projectName, projectId, ticketId, reviewerName, comment?)

// Company Communications
sendHolidayAnnouncementEmail(email, holidayName, holidayDate, message?) // NEW
sendCompanyAnnouncementEmail(email, subject, message, announcedBy) // NEW
```

### Bulk Email Senders ✨ NEW
```typescript
// Send to multiple recipients at once
sendBulkHolidayAnnouncement(emails[], holidayName, holidayDate, message?)
sendBulkCompanyAnnouncement(emails[], subject, message, announcedBy)
```

---

## Email Template Features

### Design System
- **Brand Colors**: Navy blue gradient (`#0f2b7f` → `#1e40af`)
- **Typography**: Inter font family
- **Mobile Responsive**: Optimized for all devices
- **Professional Layout**: Clean, modern design

### Components
- ✅ Header with company branding
- ✅ Clear call-to-action buttons
- ✅ Credential boxes for structured info
- ✅ Security notices (yellow highlight)
- ✅ Dividers for content separation
- ✅ Footer with contact info
- ✅ Priority-based color coding (tickets)

### Accessibility
- Preheader text for email previews
- Alt text support (ready for logo images)
- High contrast ratios
- Screen reader friendly

---

## Integration Points

### Triggered Automatically
✅ Email Verification (signup flow)
✅ Password Reset (forgot password)
✅ Welcome Email (employee onboarding)
✅ Leave Request (when submitted)
✅ Leave Status Update (when processed)
✅ Account Deactivation (when deactivated)
✅ Holiday Announcements (cron job at 12 PM daily)

### Manual Triggers
- Password Change Confirmation (after password change)
- Organization Invitations (admin action)
- Project/Ticket assignments (admin action)
- Company announcements (admin action)
- Leave cancellations (employee action)

---

## Setup Requirements

### Environment Variables
```env
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@vaivammcapital.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
CRON_SECRET=your_secure_secret (for holiday cron)
```

### Cron Configuration
For holiday notifications, set up:
- **Endpoint**: `/api/cron/holiday-notifications`
- **Schedule**: `0 12 * * *` (daily at noon)
- See `docs/HOLIDAY_NOTIFICATION_SYSTEM.md` for details

---

## Testing Emails

### Development Mode
If `SENDGRID_API_KEY` is not set, emails will be logged but not sent.

### Testing Individual Templates
```typescript
import { sendLeaveRequestEmail } from '@/lib/email';

await sendLeaveRequestEmail(
  'test@example.com',
  'John Manager',
  'Jane Doe',
  'Sick Leave',
  '2026-01-15',
  '2026-01-16',
  'Not feeling well'
);
```

### Preview in Browser
Email templates are pure HTML and can be opened directly in a browser for preview.

---

## Future Enhancements

- [ ] Email analytics (open rates, click rates)
- [ ] Template customization per organization
- [ ] Attachment support
- [ ] Digest emails (weekly summaries)
- [ ] Multi-language support
- [ ] Dark mode email templates
- [ ] SMS notifications (for urgent items)

---

## Troubleshooting

### Emails not sending?
1. Check `SENDGRID_API_KEY` is set
2. Verify sender email is verified in SendGrid
3. Check spam folder
4. Review SendGrid dashboard for delivery logs

### Wrong recipient?
- Ensure user email is verified in database
- Check organization membership
- Verify `isActive` flag is true

### Broken links?
- Confirm `NEXT_PUBLIC_APP_URL` is correct
- Check token generation for auth emails
- Verify project/ticket IDs are valid


