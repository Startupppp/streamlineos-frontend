import { sendHolidayAnnouncementEmail } from "@/lib/email";

const testEmail = process.env.TEST_EMAIL || process.argv[2];

async function sendTestEmail() {
  if (!testEmail) {
    console.error("Set TEST_EMAIL env var or pass email as argument");
    process.exit(1);
  }

  try {
    console.log(`Sending test holiday email to ${testEmail}...`);

    await sendHolidayAnnouncementEmail(
      testEmail,
      "Diwali",
      "Friday, November 8, 2026",
      "Wishing you and your family a joyous and prosperous Diwali! May the festival of lights bring happiness, success, and prosperity to your life. Enjoy the celebrations!"
    );

    console.log(`Test email sent successfully to ${testEmail}`);
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

