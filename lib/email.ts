import sgMail from "@sendgrid/mail";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions) {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@vaivammcapital.com";
  
  if (!process.env.SENDGRID_API_KEY) {
    return Promise.resolve();
  }

  try {
    await sgMail.send({
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    });
  } catch (error) {
    throw error;
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Verify Your Email Address",
    html: `
      <h2>Verify Your Email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Reset Your Password",
    html: `
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `,
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
    html: `
      <h2>You're Invited!</h2>
      <p>You have been invited to join <strong>${organizationName}</strong>.</p>
      <p>Click the link below to accept:</p>
      <a href="${invitationUrl}">${invitationUrl}</a>
    `,
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
    html: `
      <h2>Welcome to Vaivamm CRM, ${name}!</h2>
      <p>Your account has been created. Here are your login details:</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      <p>Please login and change your password immediately.</p>
      <a href="${loginUrl}">Login Now</a>
    `,
  });
}

export { sendEmail };
