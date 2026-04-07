const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

const logoUrl = `${baseUrl}/logo.png`;

interface EmailTemplateProps {
  title: string;
  preheader?: string;
  content: string;
}

function getEmailTemplate({ title, preheader, content }: EmailTemplateProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  ${preheader ? `<meta name="description" content="${preheader}">` : ''}
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      background-color: #f6f9fc;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .email-wrapper {
      width: 100%;
      background-color: #f6f9fc;
      padding: 40px 0;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }
    
    .email-header {
      background: linear-gradient(135deg, #0f2b7f 0%, #1e40af 100%);
      padding: 40px 48px;
      text-align: center;
    }
    
    .logo {
      width: 180px;
      height: auto;
      margin-bottom: 16px;
    }
    
    .email-body {
      padding: 48px;
      color: #334155;
      line-height: 1.6;
    }
    
    .email-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 24px 0;
      line-height: 1.3;
    }
    
    .email-text {
      font-size: 16px;
      color: #475569;
      margin: 0 0 16px 0;
      line-height: 1.6;
    }
    
    .email-button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #0f2b7f 0%, #1e40af 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 24px 0;
      transition: transform 0.2s;
    }
    
    .email-button:hover {
      transform: translateY(-2px);
    }
    
    .credential-box {
      background-color: #f8fafc;
      border-left: 4px solid #0f2b7f;
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
    }
    
    .credential-item {
      margin: 8px 0;
      font-size: 15px;
    }
    
    .credential-label {
      font-weight: 600;
      color: #0f172a;
    }
    
    .credential-value {
      color: #0f2b7f;
      font-family: 'Monaco', 'Courier New', monospace;
      background-color: #ffffff;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-left: 8px;
    }
    
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 32px 0;
    }
    
    .email-footer {
      background-color: #f8fafc;
      padding: 32px 48px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer-text {
      font-size: 14px;
      color: #64748b;
      margin: 8px 0;
    }
    
    .footer-link {
      color: #0f2b7f;
      text-decoration: none;
      font-weight: 500;
    }
    
    .security-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      border-radius: 8px;
      margin: 24px 0;
    }
    
    .security-text {
      font-size: 14px;
      color: #92400e;
      margin: 0;
    }
    
    @media only screen and (max-width: 600px) {
      .email-body, .email-header, .email-footer {
        padding: 32px 24px !important;
      }
      
      .email-title {
        font-size: 20px;
      }
      
      .email-text {
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">
          Vaivamm Capital
        </h1>
      </div>
      
      <div class="email-body">
        ${content}
      </div>
      
      <div class="email-footer">
        <p class="footer-text">
          <strong>Vaivamm Capital CRM</strong><br>
          Enterprise Resource Management System
        </p>
        <p class="footer-text">
          Need help? Contact us at <a href="mailto:support@vaivammcapital.com" class="footer-link">support@vaivammcapital.com</a>
        </p>
        <p class="footer-text" style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function getVerificationEmailTemplate(verificationUrl: string): string {
  const content = `
    <h2 class="email-title">Verify Your Email Address</h2>
    <p class="email-text">
      Thank you for signing up! To complete your registration and access all features, 
      please verify your email address by clicking the button below.
    </p>
    
    <div style="text-align: center;">
      <a href="${verificationUrl}" class="email-button">
        Verify Email Address
      </a>
    </div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b; margin-top: 24px;">
      If the button doesn't work, you can copy and paste this link into your browser:
    </p>
    <p class="email-text" style="word-break: break-all; font-size: 13px; color: #0f2b7f;">
      ${verificationUrl}
    </p>
    
    <div class="security-notice">
      <p class="security-text">
        <strong>Security Notice:</strong> This link will expire in 24 hours. 
        If you didn't create an account, please ignore this email.
      </p>
    </div>
  `;
  
  return getEmailTemplate({
    title: 'Verify Your Email - Vaivamm Capital',
    preheader: 'Complete your registration by verifying your email address',
    content,
  });
}

export function getPasswordResetEmailTemplate(resetUrl: string): string {
  const content = `
    <h2 class="email-title">Reset Your Password</h2>
    <p class="email-text">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="email-button">
        Reset Password
      </a>
    </div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b; margin-top: 24px;">
      If the button doesn't work, you can copy and paste this link into your browser:
    </p>
    <p class="email-text" style="word-break: break-all; font-size: 13px; color: #0f2b7f;">
      ${resetUrl}
    </p>
    
    <div class="divider"></div>
    
    <div class="security-notice">
      <p class="security-text">
        <strong>Security Notice:</strong> This link will expire in 1 hour. 
        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
      </p>
    </div>
  `;
  
  return getEmailTemplate({
    title: 'Reset Your Password - Vaivamm Capital',
    preheader: 'Click to reset your password securely',
    content,
  });
}

export function getInvitationEmailTemplate(invitationUrl: string, organizationName: string, inviterName?: string): string {
  const content = `
    <h2 class="email-title">🎉 You're Invited!</h2>
    <p class="email-text">
      ${inviterName ? `<strong>${inviterName}</strong> has invited you` : 'You have been invited'} 
      to join <strong>${organizationName}</strong> on Vaivamm Capital CRM.
    </p>
    
    <p class="email-text">
      Join your team to collaborate on projects, track attendance, manage HR operations, and more.
    </p>
    
    <div style="text-align: center;">
      <a href="${invitationUrl}" class="email-button">
        Accept Invitation
      </a>
    </div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b; margin-top: 24px;">
      If the button doesn't work, you can copy and paste this link into your browser:
    </p>
    <p class="email-text" style="word-break: break-all; font-size: 13px; color: #0f2b7f;">
      ${invitationUrl}
    </p>
    
    <div class="divider"></div>
    
    <div class="security-notice">
      <p class="security-text">
        <strong>Note:</strong> This invitation will expire in 7 days. 
        If you don't recognize this organization, you can safely ignore this email.
      </p>
    </div>
  `;
  
  return getEmailTemplate({
    title: `Invitation to join ${organizationName} - Vaivamm Capital`,
    preheader: `You've been invited to join ${organizationName}`,
    content,
  });
}

export function getWelcomeEmailTemplate(name: string, email: string, tempPassword: string, loginUrl: string): string {
  const content = `
    <h2 class="email-title">Welcome to Vaivamm Capital, ${name}! 🚀</h2>
    <p class="email-text">
      Your account has been successfully created. We're excited to have you on board!
    </p>
    
    <p class="email-text">
      Here are your login credentials:
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Email:</span>
        <span class="credential-value">${email}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Temporary Password:</span>
        <span class="credential-value">${tempPassword}</span>
      </div>
    </div>
    
    <div class="security-notice">
      <p class="security-text">
        <strong>Important:</strong> Please change your password immediately after your first login for security purposes.
      </p>
    </div>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="email-button">
        Login Now
      </a>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text">
      <strong>Getting Started:</strong>
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>Complete your profile with a photo and personal details</li>
      <li>Explore the dashboard to see your team and projects</li>
      <li>Set up your attendance tracking</li>
      <li>Check out your leave balances</li>
    </ul>
  `;
  
  return getEmailTemplate({
    title: 'Welcome to Vaivamm Capital - Your Account Details',
    preheader: 'Your account is ready. Let\'s get started!',
    content,
  });
}

export function getProjectAssignmentEmailTemplate(
  memberName: string,
  projectName: string,
  projectKey: string,
  projectUrl: string,
  assignedBy?: string
): string {
  const content = `
    <h2 class="email-title">📋 You've Been Added to a Project</h2>
    <p class="email-text">
      ${assignedBy ? `<strong>${assignedBy}</strong> has added you` : 'You have been added'} 
      to the project <strong>${projectName}</strong>.
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${projectName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project Key:</span>
        <span class="credential-value">${projectKey}</span>
      </div>
    </div>
    
    <p class="email-text">
      You can now view and contribute to this project. Access the project board to see tickets, 
      sprints, and collaborate with your team.
    </p>
    
    <div style="text-align: center;">
      <a href="${projectUrl}" class="email-button">
        View Project
      </a>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text">
      <strong>What's Next:</strong>
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>Review the project details and objectives</li>
      <li>Check your assigned tickets</li>
      <li>Collaborate with your team members</li>
      <li>Update ticket statuses as you progress</li>
    </ul>
  `;
  
  return getEmailTemplate({
    title: `Added to Project: ${projectName} - Vaivamm Capital`,
    preheader: `You've been added to ${projectName}`,
    content,
  });
}

export function getTicketAssignmentEmailTemplate(
  assigneeName: string,
  ticketTitle: string,
  ticketType: string,
  ticketPriority: string,
  projectName: string,
  ticketUrl: string,
  createdBy: string
): string {
  const priorityColors: Record<string, string> = {
    LOW: '#22c55e',
    MEDIUM: '#eab308',
    HIGH: '#f97316',
    URGENT: '#ef4444',
  };
  
  const priorityColor = priorityColors[ticketPriority] || '#64748b';
  
  const content = `
    <h2 class="email-title">🎫 New Ticket Assigned to You</h2>
    <p class="email-text">
      <strong>${createdBy}</strong> has created a ticket and assigned it to you.
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${ticketTitle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${projectName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${ticketType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Priority:</span>
        <span style="color: ${priorityColor}; font-weight: 600; display: inline-block; margin-left: 8px;">
          ${ticketPriority}
        </span>
      </div>
    </div>
    
    ${ticketPriority === 'URGENT' || ticketPriority === 'HIGH' ? `
    <div class="security-notice">
      <p class="security-text">
        <strong>High Priority:</strong> This ticket requires immediate attention. 
        Please review and update the status as soon as possible.
      </p>
    </div>
    ` : ''}
    
    <div style="text-align: center;">
      <a href="${ticketUrl}" class="email-button">
        View Ticket Details
      </a>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text">
      Check the status and details in the CRM system. Keep your team updated on your progress!
    </p>
  `;
  
  return getEmailTemplate({
    title: `Ticket Assigned: ${ticketTitle} - Vaivamm Capital`,
    preheader: `${createdBy} assigned you a ${ticketPriority.toLowerCase()} priority ticket`,
    content,
  });
}

export function getTicketReviewRequestEmailTemplate(
  reviewerName: string,
  ticketTitle: string,
  ticketType: string,
  projectName: string,
  ticketUrl: string,
  completedBy: string,
  comment?: string
): string {
  const content = `
    <h2 class="email-title">👀 Ticket Ready for Your Review</h2>
    <p class="email-text">
      <strong>${completedBy}</strong> has completed their work and moved a ticket to 
      <span style="display: inline-block; background: #eab308; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">IN REVIEW</span>.
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${ticketTitle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${projectName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${ticketType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Completed By:</span>
        <span class="credential-value">${completedBy}</span>
      </div>
    </div>
    
    ${comment ? `
    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">💬 Latest Comment:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${comment}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center;">
      <a href="${ticketUrl}" class="email-button">
        Review Work & Add Comments
      </a>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text">
      <strong>You can review:</strong>
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>View all comments and work updates</li>
      <li>Check attached images, videos, and documents</li>
      <li>Review external links and deployments</li>
      <li>Add your feedback and comments</li>
      <li>Approve (mark as DONE) or request changes (back to IN_PROGRESS)</li>
    </ul>
  `;
  
  return getEmailTemplate({
    title: `Review Requested: ${ticketTitle} - Vaivamm Capital`,
    preheader: `${completedBy} completed work on ${ticketTitle} and needs your review`,
    content,
  });
}

export function getTicketChangesRequestedEmailTemplate(
  assigneeName: string,
  ticketTitle: string,
  projectName: string,
  ticketUrl: string,
  reviewerName: string,
  comment?: string
): string {
  const content = `
    <h2 class="email-title">🔄 Changes Requested on Your Ticket</h2>
    <p class="email-text">
      <strong>${reviewerName}</strong> has reviewed your work and moved the ticket back to 
      <span style="display: inline-block; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">IN PROGRESS</span>.
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${ticketTitle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${projectName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Reviewed By:</span>
        <span class="credential-value">${reviewerName}</span>
      </div>
    </div>
    
    ${comment ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e; font-size: 14px;">💬 Review Feedback:</p>
      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${comment}</p>
    </div>
    ` : ''}
    
    <div class="security-notice">
      <p class="security-text">
        <strong>Action Required:</strong> Please review the feedback, make the requested changes, 
        and move the ticket back to IN_REVIEW when ready.
      </p>
    </div>
    
    <div style="text-align: center;">
      <a href="${ticketUrl}" class="email-button">
        View Feedback & Update Ticket
      </a>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text">
      Check all comments in the CRM to understand what needs to be fixed or improved.
    </p>
  `;
  
  return getEmailTemplate({
    title: `Changes Requested: ${ticketTitle} - Vaivamm Capital`,
    preheader: `${reviewerName} requested changes on ${ticketTitle}`,
    content,
  });
}

export function getLeaveRequestEmailTemplate(
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string,
  leaveUrl: string
): string {
  const content = `
    <h2 class="email-title">📅 New Leave Request</h2>
    <p class="email-text">
      <strong>${employeeName}</strong> has submitted a new leave request that requires your approval.
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${employeeName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${leaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>
    
    <div style="background: #f8fafc; border-left: 4px solid #0f2b7f; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">💬 Reason:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${reason}</p>
    </div>
    
    <div style="text-align: center;">
      <a href="${leaveUrl}" class="email-button">
        Review Leave Request
      </a>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text">
      You can approve or reject this request directly from the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Request: ${employeeName} - Vaivamm Capital`,
    preheader: `${employeeName} requested ${leaveType} from ${startDate} to ${endDate}`,
    content,
  });
}

export function getLeaveStatusUpdateEmailTemplate(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  status: "APPROVED" | "REJECTED",
  approverName: string,
  rejectionReason?: string
): string {
  const isApproved = status === "APPROVED";
  const statusColor = isApproved ? "#22c55e" : "#ef4444";
  
  const content = `
    <h2 class="email-title">${isApproved ? "✅ Leave Request Approved" : "❌ Leave Request Rejected"}</h2>
    <p class="email-text">
      Your leave request for <strong>${leaveType}</strong> from <strong>${startDate} to ${endDate}</strong> has been <strong>${status.toLowerCase()}</strong> by ${approverName}.
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Status:</span>
        <span style="color: ${statusColor}; font-weight: 700; margin-left: 8px;">${status}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${leaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Dates:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>
    
    ${!isApproved && rejectionReason ? `
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b; font-size: 14px;">💬 Reason for Rejection:</p>
      <p style="margin: 0; color: #b91c1c; font-size: 14px; line-height: 1.6;">${rejectionReason}</p>
    </div>
    ` : ''}
    
    <div class="divider"></div>
    
    <p class="email-text">
      Check your leave balances and request history in the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Request ${status}: ${leaveType} - Vaivamm Capital`,
    preheader: `Your leave request has been ${status.toLowerCase()}`,
    content,
  });
}

export function getLeaveCancellationEmailTemplate(
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string
): string {
  const content = `
    <h2 class="email-title">🚫 Leave Request Cancelled</h2>
    <p class="email-text">
      <strong>${employeeName}</strong> has cancelled their previously submitted leave request.
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${employeeName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${leaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text">
      This leave request has been withdrawn and no longer requires your action.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Cancelled: ${employeeName} - Vaivamm Capital`,
    preheader: `${employeeName} cancelled their ${leaveType} request`,
    content,
  });
}

export function getPasswordChangeConfirmationEmailTemplate(userName: string): string {
  const content = `
    <h2 class="email-title">🔒 Password Changed Successfully</h2>
    <p class="email-text">
      Hi <strong>${userName}</strong>,
    </p>
    
    <p class="email-text">
      Your password has been successfully changed. If you made this change, you can safely ignore this email.
    </p>
    
    <div class="security-notice">
      <p class="security-text">
        <strong>Security Alert:</strong> If you did NOT make this change, please contact our support team immediately 
        at <a href="mailto:support@vaivammcapital.com" style="color: #92400e; text-decoration: underline;">support@vaivammcapital.com</a> 
        or reset your password right away.
      </p>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text" style="font-size: 14px;">
      <strong>Security Tips:</strong>
    </p>
    <ul style="color: #475569; font-size: 14px; line-height: 1.8; margin: 16px 0;">
      <li>Use a strong, unique password for your account</li>
      <li>Never share your password with anyone</li>
      <li>Enable two-factor authentication if available</li>
      <li>Update your password regularly</li>
    </ul>
  `;

  return getEmailTemplate({
    title: 'Password Changed Successfully - Vaivamm Capital',
    preheader: 'Your password has been updated',
    content,
  });
}

export function getAccountDeactivationEmailTemplate(
  employeeName: string,
  deactivatedBy: string,
  reason?: string
): string {
  const content = `
    <h2 class="email-title">👋 Account Deactivated</h2>
    <p class="email-text">
      Dear <strong>${employeeName}</strong>,
    </p>
    
    <p class="email-text">
      Your account on Vaivamm Capital CRM has been deactivated by <strong>${deactivatedBy}</strong>.
    </p>
    
    ${reason ? `
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Reason:</span>
        <span style="color: #475569; margin-left: 8px;">${reason}</span>
      </div>
    </div>
    ` : ''}
    
    <p class="email-text">
      You will no longer have access to:
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>The CRM dashboard and all projects</li>
      <li>Time tracking and attendance systems</li>
      <li>HR portal and leave management</li>
      <li>Company documents and files</li>
    </ul>
    
    <div class="divider"></div>
    
    <p class="email-text">
      If you believe this is an error or have questions, please contact HR at 
      <a href="mailto:support@vaivammcapital.com" style="color: #0f2b7f; text-decoration: underline;">support@vaivammcapital.com</a>.
    </p>
    
    <p class="email-text" style="margin-top: 24px;">
      Thank you for your contributions to the organization.
    </p>
  `;

  return getEmailTemplate({
    title: 'Account Deactivated - Vaivamm Capital',
    preheader: 'Your account has been deactivated',
    content,
  });
}

export function getHolidayAnnouncementEmailTemplate(
  holidayName: string,
  holidayDate: string,
  message?: string
): string {
  const content = `
    <h2 class="email-title">🎉 Upcoming Holiday: ${holidayName}</h2>
    <p class="email-text">
      Dear Team,
    </p>
    
    <p class="email-text">
      This is a friendly reminder that <strong>${holidayName}</strong> is tomorrow, <strong>${holidayDate}</strong>.
    </p>
    
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Holiday:</span>
        <span class="credential-value">${holidayName}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Date:</span>
        <span class="credential-value">${holidayDate}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Status:</span>
        <span style="color: #22c55e; font-weight: 700; margin-left: 8px;">OFFICE CLOSED</span>
      </div>
    </div>
    
    ${message ? `
    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #166534; font-size: 14px;">💬 Message:</p>
      <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.6;">${message}</p>
    </div>
    ` : ''}
    
    <p class="email-text">
      Please ensure all urgent tasks are completed before the end of today. The office will resume normal operations the following working day.
    </p>
    
    <div class="divider"></div>
    
    <p class="email-text">
      Wishing you and your family a wonderful ${holidayName}! 🎊
    </p>
  `;

  return getEmailTemplate({
    title: `Holiday Tomorrow: ${holidayName} - Vaivamm Capital`,
    preheader: `Office closed tomorrow for ${holidayName}`,
    content,
  });
}

export function getCompanyAnnouncementEmailTemplate(
  subject: string,
  message: string,
  announcedBy: string
): string {
  const content = `
    <h2 class="email-title">📢 Company Announcement</h2>
    <p class="email-text">
      Dear Team,
    </p>
    
    <p class="email-text">
      <strong>${announcedBy}</strong> has shared an important announcement:
    </p>
    
    <div class="credential-box">
      <h3 style="margin: 0 0 16px 0; color: #0f172a; font-size: 18px;">${subject}</h3>
      <div style="color: #475569; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${message}</div>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b;">
      For any questions or clarifications, please reach out to your manager or HR.
    </p>
  `;

  return getEmailTemplate({
    title: `Announcement: ${subject} - Vaivamm Capital`,
    preheader: subject,
    content,
  });
}

export function getExpenseSubmittedEmailTemplate(
  approverName: string,
  employeeName: string,
  category: string,
  amount: string,
  description: string,
  expenseLink: string
): string {
  const content = `
    <h2 class="email-title">🧾 New Expense Claim</h2>
    <p class="email-text">
      Hello <strong>${approverName}</strong>,
    </p>
    
    <p class="email-text">
      <strong>${employeeName}</strong> has submitted a new expense claim for your approval.
    </p>
    
    <div class="credential-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Category:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${category}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700; font-size: 18px;">₹${amount}</td>
        </tr>
        ${description ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Description:</td>
          <td style="padding: 8px 0; color: #475569;">${description}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="text-align: center;">
      <a href="${expenseLink}" class="email-button">
        Review Expense Claim
      </a>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b;">
      Please review and approve or reject this expense claim at your earliest convenience.
    </p>
  `;

  return getEmailTemplate({
    title: `New Expense Claim from ${employeeName}`,
    preheader: `${employeeName} submitted a ₹${amount} expense claim`,
    content,
  });
}

export function getExpenseApprovedEmailTemplate(
  employeeName: string,
  category: string,
  amount: string,
  approverName: string
): string {
  const content = `
    <h2 class="email-title">✅ Expense Claim Approved</h2>
    <p class="email-text">
      Hello <strong>${employeeName}</strong>,
    </p>
    
    <p class="email-text">
      Great news! Your expense claim has been <strong style="color: #16a34a;">approved</strong> by <strong>${approverName}</strong>.
    </p>
    
    <div class="credential-box" style="border-left-color: #16a34a;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Category:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${category}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: #16a34a; font-weight: 700; font-size: 18px;">₹${amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Status:</td>
          <td style="padding: 8px 0;"><span style="background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">APPROVED</span></td>
        </tr>
      </table>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b;">
      The reimbursement will be processed as per company policy. If you have any questions, please contact HR.
    </p>
  `;

  return getEmailTemplate({
    title: `Expense Claim Approved - ₹${amount}`,
    preheader: `Your ₹${amount} expense claim has been approved`,
    content,
  });
}

export function getExpenseRejectedEmailTemplate(
  employeeName: string,
  category: string,
  amount: string,
  approverName: string,
  reason: string
): string {
  const content = `
    <h2 class="email-title">❌ Expense Claim Rejected</h2>
    <p class="email-text">
      Hello <strong>${employeeName}</strong>,
    </p>
    
    <p class="email-text">
      Unfortunately, your expense claim has been <strong style="color: #dc2626;">rejected</strong> by <strong>${approverName}</strong>.
    </p>
    
    <div class="credential-box" style="border-left-color: #dc2626;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Category:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${category}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount:</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: 700; font-size: 18px;">₹${amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Status:</td>
          <td style="padding: 8px 0;"><span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">REJECTED</span></td>
        </tr>
      </table>
    </div>
    
    <div class="credential-box" style="margin-top: 16px; border-left-color: #f59e0b;">
      <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">Reason for rejection:</p>
      <p style="margin: 0; color: #0f172a; font-style: italic;">"${reason}"</p>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b;">
      If you believe this is an error or have questions, please contact your manager or HR.
    </p>
  `;

  return getEmailTemplate({
    title: `Expense Claim Rejected - ₹${amount}`,
    preheader: `Your ₹${amount} expense claim has been rejected`,
    content,
  });
}

export function getExpensePaidEmailTemplate(
  employeeName: string,
  category: string,
  amount: string,
  transactionRef?: string
): string {
  const content = `
    <h2 class="email-title">💰 Expense Reimbursed</h2>
    <p class="email-text">
      Hello <strong>${employeeName}</strong>,
    </p>
    
    <p class="email-text">
      Your expense claim has been <strong style="color: #2563eb;">reimbursed</strong>! The amount has been credited to your account.
    </p>
    
    <div class="credential-box" style="border-left-color: #2563eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Category:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${category}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount Reimbursed:</td>
          <td style="padding: 8px 0; color: #2563eb; font-weight: 700; font-size: 18px;">₹${amount}</td>
        </tr>
        ${transactionRef ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Transaction Ref:</td>
          <td style="padding: 8px 0; color: #0f172a; font-family: monospace;">${transactionRef}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Status:</td>
          <td style="padding: 8px 0;"><span style="background: #dbeafe; color: #2563eb; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">PAID</span></td>
        </tr>
      </table>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b;">
      Please check your bank account for the credited amount. Contact HR if you don't receive the payment within 2-3 business days.
    </p>
  `;

  return getEmailTemplate({
    title: `Expense Reimbursed - ₹${amount}`,
    preheader: `Your ₹${amount} expense has been reimbursed`,
    content,
  });
}

export function getDocumentExpiryReminderEmailTemplate(
  employeeName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysRemaining: number
): string {
  const urgencyColor = daysRemaining <= 7 ? '#dc2626' : daysRemaining <= 14 ? '#f59e0b' : '#2563eb';
  const urgencyBg = daysRemaining <= 7 ? '#fee2e2' : daysRemaining <= 14 ? '#fef3c7' : '#dbeafe';
  
  const content = `
    <h2 class="email-title">📋 Document Expiry Reminder</h2>
    <p class="email-text">
      Hello <strong>${employeeName}</strong>,
    </p>
    
    <p class="email-text">
      This is a reminder that the following document is expiring soon:
    </p>
    
    <div class="credential-box" style="border-left-color: ${urgencyColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Document:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${documentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
          <td style="padding: 8px 0; color: #475569;">${documentType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Expiry Date:</td>
          <td style="padding: 8px 0; color: ${urgencyColor}; font-weight: 700;">${expiryDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time Remaining:</td>
          <td style="padding: 8px 0;"><span style="background: ${urgencyBg}; color: ${urgencyColor}; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">${daysRemaining} days</span></td>
        </tr>
      </table>
    </div>
    
    <div class="divider"></div>
    
    <p class="email-text" style="font-size: 14px; color: #64748b;">
      Please ensure to renew or update this document before it expires to avoid any compliance issues.
    </p>
  `;

  return getEmailTemplate({
    title: `Document Expiring Soon: ${documentName}`,
    preheader: `Your ${documentType} expires in ${daysRemaining} days`,
    content,
  });
}

