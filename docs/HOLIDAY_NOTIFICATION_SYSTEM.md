# Holiday Notification System

## Overview
Automated holiday notification system that sends emails to all organization members 12 hours before a company holiday.

## Features
- ✅ Add holidays with custom messages
- ✅ Bulk import holidays for the entire year
- ✅ Automated email notifications sent at 12:00 PM (noon) the day before
- ✅ Beautiful branded email templates
- ✅ Organization-specific holidays
- ✅ Tracks notification status to prevent duplicates

## Database Schema

```sql
holidays
├── id (serial)
├── org_id (text) - Organization reference
├── name (text) - Holiday name (e.g., "Diwali", "Christmas")
├── date (date) - Holiday date
├── message (text) - Optional custom message
├── notification_sent (boolean) - Tracks if email was sent
├── created_at (timestamp)
└── updated_at (timestamp)
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Push the schema to database
npm run db:push

# Or run the migration manually
psql $DATABASE_URL < drizzle/0002_add_holidays_table.sql
```

### 2. Configure Cron Job

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in the root:

```json
{
  "crons": [{
    "path": "/api/cron/holiday-notifications",
    "schedule": "0 12 * * *"
  }]
}
```

#### Option B: External Cron Service (cron-job.org, EasyCron, etc.)

1. Add `CRON_SECRET` to your `.env`:
   ```
   CRON_SECRET=your-secure-random-string
   ```

2. Configure the cron job:
   - **URL**: `https://your-domain.com/api/cron/holiday-notifications`
   - **Schedule**: `0 12 * * *` (Every day at 12:00 PM)
   - **Method**: GET or POST
   - **Headers**: `Authorization: Bearer your-secure-random-string`

### 3. Add Holidays

#### Single Holiday
```typescript
import { addHoliday } from '@/server/actions/holiday-actions';

await addHoliday({
  name: "Diwali",
  date: new Date("2026-10-20"),
  message: "Wishing everyone a prosperous and joyful Diwali! 🪔"
});
```

#### Bulk Import (Recommended)
```typescript
import { bulkAddHolidays } from '@/server/actions/holiday-actions';

await bulkAddHolidays([
  {
    name: "Republic Day",
    date: "2026-01-26",
    message: "Celebrating the spirit of our great nation! 🇮🇳"
  },
  {
    name: "Holi",
    date: "2026-03-14",
    message: "Wishing you a colorful and joyous Holi! 🎨"
  },
  {
    name: "Independence Day",
    date: "2026-08-15",
    message: "Happy Independence Day! Jai Hind! 🇮🇳"
  },
  {
    name: "Diwali",
    date: "2026-11-08",
    message: "May this Diwali bring prosperity and happiness! 🪔"
  },
  {
    name: "Christmas",
    date: "2026-12-25",
    message: "Merry Christmas to all! 🎄"
  }
]);
```

## Usage Examples

### Adding Holidays from Admin Panel
```typescript
// In your settings page
"use client";

import { addHoliday } from '@/server/actions/holiday-actions';
import { useState } from 'react';

export function AddHolidayForm() {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addHoliday({
      name: formData.name,
      date: new Date(formData.date),
      message: formData.message
    });
    
    if (result.success) {
      alert('Holiday added successfully!');
    }
  };

  // Form JSX here...
}
```

### Manual Trigger (Testing)
```bash
# Test the cron endpoint manually
curl -X POST https://your-domain.com/api/cron/holiday-notifications \
  -H "Authorization: Bearer your-cron-secret"
```

## Email Template Preview

The holiday email includes:
- 🎉 Eye-catching subject line
- Holiday name and date
- Custom message (if provided)
- Office closure notice
- Branded footer

**Subject**: `Holiday Tomorrow: Diwali - Vaivamm Capital`

## Indian Festival Holidays 2026

Here's a complete list you can bulk import:

```typescript
const indianHolidays2026 = [
  { name: "Republic Day", date: "2026-01-26", message: "Celebrating the spirit of our great nation! 🇮🇳" },
  { name: "Maha Shivaratri", date: "2026-02-17", message: "Om Namah Shivaya! 🕉️" },
  { name: "Holi", date: "2026-03-14", message: "Wishing you a colorful and joyous Holi! 🎨" },
  { name: "Ugadi / Gudi Padwa", date: "2026-03-22", message: "Happy New Year! 🌸" },
  { name: "Ram Navami", date: "2026-03-29", message: "Jai Shri Ram! 🙏" },
  { name: "Mahavir Jayanti", date: "2026-04-06", message: "Wishing peace and harmony! 🕊️" },
  { name: "Good Friday", date: "2026-04-10" },
  { name: "Eid ul-Fitr", date: "2026-05-04", message: "Eid Mubarak! 🌙" },
  { name: "Buddha Purnima", date: "2026-05-11", message: "May peace prevail! 🙏" },
  { name: "Eid ul-Adha", date: "2026-07-11", message: "Eid Mubarak! 🌙" },
  { name: "Independence Day", date: "2026-08-15", message: "Happy Independence Day! Jai Hind! 🇮🇳" },
  { name: "Raksha Bandhan", date: "2026-08-28", message: "Celebrating the bond of love! 👫" },
  { name: "Janmashtami", date: "2026-09-05", message: "Hare Krishna! 🦚" },
  { name: "Ganesh Chaturthi", date: "2026-09-13", message: "Ganpati Bappa Morya! 🐘" },
  { name: "Gandhi Jayanti", date: "2026-10-02", message: "Remembering the Father of the Nation 🙏" },
  { name: "Dussehra", date: "2026-10-12", message: "Victory of good over evil! 🏹" },
  { name: "Diwali", date: "2026-11-08", message: "May this Diwali bring prosperity and happiness! 🪔" },
  { name: "Guru Nanak Jayanti", date: "2026-11-27", message: "Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh! 🙏" },
  { name: "Christmas", date: "2026-12-25", message: "Merry Christmas to all! 🎄🎅" }
];

// Import all at once
await bulkAddHolidays(indianHolidays2026);
```

## API Reference

### Server Actions

#### `addHoliday(data)`
Add a single holiday
- **Permissions**: ADMIN, OWNER
- **Returns**: `{ success: true } | { error: string }`

#### `bulkAddHolidays(holidays[])`
Bulk import multiple holidays
- **Permissions**: ADMIN, OWNER
- **Returns**: `{ success: true, count: number } | { error: string }`

#### `getHolidays()`
Get all holidays for current year
- **Permissions**: Any authenticated user
- **Returns**: `Holiday[]`

#### `deleteHoliday(holidayId)`
Remove a holiday
- **Permissions**: ADMIN, OWNER
- **Returns**: `{ success: true } | { error: string }`

#### `sendHolidayNotifications()`
Manually trigger notification check (called by cron)
- **Public**: Via cron endpoint only
- **Returns**: `{ success: true, count: number } | { error: string }`

## Troubleshooting

### Notifications not sending?
1. Check if `SENDGRID_API_KEY` is configured
2. Verify cron job is running (check logs)
3. Ensure holiday date is exactly tomorrow
4. Check `notification_sent` is `false` in database

### Testing
```typescript
// Force send notifications for testing
import { sendHolidayNotifications } from '@/server/actions/holiday-actions';

// Temporarily change holiday date to tomorrow in DB, then:
await sendHolidayNotifications();
```

### Reset notification status
```sql
-- If you need to resend notifications
UPDATE holidays 
SET notification_sent = false 
WHERE date = '2026-10-20';
```

## Security Notes
- Always use `CRON_SECRET` for production cron endpoints
- Only ADMIN/OWNER can manage holidays
- Bulk imports are rate-limited by database transaction limits
- Email sending uses Promise.allSettled to prevent cascading failures

## Future Enhancements
- [ ] UI for holiday management in settings
- [ ] Multiple notification times (e.g., 1 week before, 1 day before)
- [ ] Regional holiday support (different holidays per department/location)
- [ ] Holiday calendar view in dashboard
- [ ] Export holidays to .ics calendar format
- [ ] Integration with Google Calendar

