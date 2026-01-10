/**
 * Test script to send a holiday email
 * Usage: npx tsx scripts/test-holiday-email.ts
 */

import { sendHolidayAnnouncementEmail } from "@/lib/email";

async function sendTestEmail() {
  try {
    console.log("📧 Sending test holiday email...");
    
    await sendHolidayAnnouncementEmail(
      "tarunchintakunta@gmail.com",
      "Diwali",
      "Friday, November 8, 2026",
      "Wishing you and your family a joyous and prosperous Diwali! May the festival of lights bring happiness, success, and prosperity to your life. Enjoy the celebrations! 🪔✨"
    );
    
    console.log("✅ Test email sent successfully to tarunchintakunta@gmail.com");
    console.log("\n📬 Check your inbox for:");
    console.log("   Subject: Holiday Tomorrow: Diwali - Vaivamm Capital");
    console.log("\n💡 If you don't see it, check your spam folder!");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to send test email:", error);
    console.log("\n⚠️  Make sure SENDGRID_API_KEY is set in your .env file");
    process.exit(1);
  }
}

sendTestEmail();


