/**
 * Script to import holidays for your organization
 * Run this once to populate the holidays table
 * 
 * Usage: npx tsx scripts/import-holidays.ts
 */

import { db } from "@/lib/db";
import { holidays, organizations } from "@/lib/db/schema";

// ============================================
// 🎯 ADD YOUR HOLIDAYS HERE
// ============================================
// Format: { name: "Holiday Name", date: "YYYY-MM-DD", message: "Optional message" }

interface HolidayEntry {
  name: string;
  date: string;
  message?: string;
}

// 2026 holidays (format: date as YYYY-MM-DD)
const YOUR_HOLIDAYS: HolidayEntry[] = [
  { name: "New Year Eve", date: "2026-01-01" },
  { name: "Bhogi", date: "2026-01-13" },
  { name: "Makar Sankranthi", date: "2026-01-14" },
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Ugadi", date: "2026-03-19" },
  { name: "Eid", date: "2026-03-21" },
  { name: "Bakrid", date: "2026-05-27" },
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Ganesh Chaturthi", date: "2026-09-14" },
  { name: "Gandhi Jayanthi", date: "2026-10-02" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Christmas Day", date: "2026-12-25" },
];

async function importHolidays() {
  try {
    // Check if holidays are provided
    if (YOUR_HOLIDAYS.length === 0) {
      console.error("❌ No holidays found!");
      console.log("\n📝 Please edit scripts/import-holidays.ts and add your holidays to the YOUR_HOLIDAYS array.");
      console.log("\nExample format:");
      console.log('  { name: "New Year", date: "2026-01-01", message: "Happy New Year! 🎉" },');
      process.exit(1);
    }

    console.log("🔍 Finding organizations...");
    
    // Get all organizations
    const orgs = await db.query.organizations.findMany();
    
    if (orgs.length === 0) {
      console.error("❌ No organizations found. Please create an organization first.");
      process.exit(1);
    }

    console.log(`✅ Found ${orgs.length} organization(s)`);

    for (const org of orgs) {
      console.log(`\n📅 Importing holidays for: ${org.name}`);
      
      const holidayRecords = YOUR_HOLIDAYS.map(h => ({
        orgId: org.id,
        name: h.name,
        date: h.date,
        message: h.message,
        notificationSent: false,
      }));

      await db.insert(holidays).values(holidayRecords);
      
      console.log(`✅ Imported ${holidayRecords.length} holidays for ${org.name}`);
    }

    console.log("\n🎉 All holidays imported successfully!");
    console.log("\n📋 Imported holidays:");
    YOUR_HOLIDAYS.forEach(h => {
      console.log(`  - ${h.date}: ${h.name}`);
    });

    console.log("\n⚠️  Don't forget to set up the cron job!");
    console.log("   See docs/HOLIDAY_NOTIFICATION_SYSTEM.md for details");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to import holidays:", error);
    process.exit(1);
  }
}

importHolidays();

