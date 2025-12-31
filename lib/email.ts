// Email Service (Mocked for now as per user request to remove Azure)

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions) {
  // Mock email sending
  console.log("---------------------------------------------------");
  console.log("📧 MOCK EMAIL SENDING (Azure Disabled)");
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log("---------------------------------------------------");
  return Promise.resolve();
}

export async function sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Verify Your Email Address",
      html: `Verify Email Link: ${verificationUrl}`,
    });
  }
  
  export async function sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Reset Your Password",
      html: `Reset Password Link: ${resetUrl}`,
    });
  }
  
  export async function sendInvitationEmail(
    email: string,
    token: string,
    organizationName: string
  ) {
    const invitationUrl = `${baseUrl}/invitation/${token}`;
    await sendEmail({
      to: email,
      subject: `Invitation to join ${organizationName}`,
      html: `Invitation Link: ${invitationUrl}`,
    });
  }
  
  export async function sendWelcomeEmail(
    email: string,
    name: string,
    tempPassword: string,
    loginUrl: string = `${baseUrl}/signin`
  ) {
    await sendEmail({
      to: email,
      subject: "Welcome to Vaivamm CRM - Your Account Details",
      html: `Welcome ${name}! Temp Password: ${tempPassword}. Login at: ${loginUrl}`,
    });
  }
