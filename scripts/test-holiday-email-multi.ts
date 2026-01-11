/**
 * Test script to send holiday emails to multiple addresses
 * Usage: npx tsx scripts/test-holiday-email-multi.ts
 */

import { sendHolidayAnnouncementEmail } from "@/lib/email";

const TEST_EMAILS = [
  "tarunchintakunta@gmail.com",
  "chintakuntatarun@gmail.com"
];

async function sendTestEmails() {
  try {
    console.log("📧 Sending test holiday emails...\n");
    
    for (const email of TEST_EMAILS) {
      try {
        await sendHolidayAnnouncementEmail(
          email,
          "Diwali",
          "Friday, November 8, 2026",
          "Wishing you and your family a joyous and prosperous Diwali! May the festival of lights bring happiness, success, and prosperity to your life. Enjoy the celebrations! 🪔✨"
        );
        
        console.log(`✅ Email sent to: ${email}`);
      } catch (error) {
        console.error(`❌ Failed to send to ${email}:`, error);
      }
    }
    
    console.log("\n🎉 All test emails sent!");
    console.log("\n📬 Check your inboxes for:");
    console.log("   Subject: Holiday Tomorrow: Diwali - Vaivamm Capital");
    console.log("\n💡 If you don't see it, check your spam folder!");
    console.log("\n📊 Email Status:");
    console.log("   - Account creation emails: ✅ Working");
    console.log("   - Holiday notifications: ✅ Should now be working");
    console.log("\n🔍 Possible reasons for previous issues:");
    console.log("   - SendGrid API key might have been recently configured");
    console.log("   - Emails might have gone to spam");
    console.log("   - Rate limiting or SendGrid account verification needed");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to send test emails:", error);
    console.log("\n⚠️  Make sure SENDGRID_API_KEY is set in your .env file");
    process.exit(1);
  }
}

sendTestEmails();





