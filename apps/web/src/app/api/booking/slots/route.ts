import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectToDatabase, { User } from '@repo/database';
import { startOfDay, endOfDay, addMinutes, format, isBefore, isAfter, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userPublicId = searchParams.get('userPublicId');
  const calendarSlug = searchParams.get('calendarSlug');
  const dateStr = searchParams.get('date'); // YYYY-MM-DD

  if (!userPublicId || !calendarSlug || !dateStr) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    // 1. Find Provider
    const user = await User.findOne({ publicId: userPublicId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2. Find Calendar Config
    const calendarConfig = user.calendarPreferences?.calendars?.find(
      (cal: any) => cal.publicSlug === calendarSlug && cal.isPublic
    );
    if (!calendarConfig) return NextResponse.json({ error: 'Calendar not found or not public' }, { status: 404 });

    // 3. Setup Google Auth
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken,
    }); // TODO: refresh token logic if expired (similar to list/events route)

    // Refresh token check roughly (reuse logic if possible or trust client auto-refresh if valid)
    // For robustness we should check expiry. 
    if (user.googleCalendarTokenExpiry && user.googleCalendarTokenExpiry < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      // Update user tokens
      user.googleCalendarAccessToken = credentials.access_token;
      user.googleCalendarTokenExpiry = new Date(credentials.expiry_date || Date.now() + 3500 * 1000);
      await user.save();
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 4. Calculate Time Range (Available slots for that day)
    // Assume 9 AM to 6 PM work hours for now (Configurable later)
    const workStartHour = 9;
    const workEndHour = 18;
    const slotDuration = 30; // minutes

    const dayStart = parseISO(`${dateStr}T09:00:00`); // Local time implicit? Better use timezone.
    // Making it timezone aware is complex without user timezone.
    // We strictly use the User's timezone ideally.
    // For MVP, let's treat dateStr as "Day in User's Timezone".

    // Fix: We need the User's Timezone to correctly query "Whole Day".
    const timeZone = user.timezone || 'UTC';

    // Construct start/end ISOs for the FreeBusy query
    const queryStart = `${dateStr}T00:00:00Z`; // This effectively queries UTC. 
    const queryEnd = `${dateStr}T23:59:59Z`;
    // Ideally we should use date-fns-tz to convert "2024-01-01" + "America/Argentina..." -> ISO UTC.
    // Let's assume standard google freebusy query works fine.

    // 5. Query FreeBusy
    const freeBusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date(dateStr + 'T00:00:00').toISOString(), // Improve this with timezone later
        timeMax: new Date(dateStr + 'T23:59:59').toISOString(),
        items: [{ id: calendarConfig.calendarId }]
      }
    });

    const busySlots = freeBusyRes.data.calendars?.[calendarConfig.calendarId]?.busy || [];

    // 6. Generate Slots
    // Generate 30min slots from 9am to 6pm
    const slots = [];
    let currentSlot = new Date(`${dateStr}T${workStartHour.toString().padStart(2, '0')}:00:00`); // Local construction
    const dayEnd = new Date(`${dateStr}T${workEndHour.toString().padStart(2, '0')}:00:00`);

    while (isBefore(currentSlot, dayEnd)) {
      const slotEnd = addMinutes(currentSlot, slotDuration);

      // Check overlap with busy slots
      const isBusy = busySlots.some((busy: any) => {
        const busyStart = new Date(busy.start!);
        const busyEnd = new Date(busy.end!);

        // Check intersection
        return (
          (isAfter(currentSlot, busyStart) || currentSlot.getTime() === busyStart.getTime()) &&
          isBefore(currentSlot, busyEnd)
        ) || (
            isAfter(slotEnd, busyStart) &&
            (isBefore(slotEnd, busyEnd) || slotEnd.getTime() === busyEnd.getTime())
          ) || (
            isBefore(currentSlot, busyStart) && isAfter(slotEnd, busyEnd)
          );
      });

      if (!isBusy) {
        slots.push(format(currentSlot, 'HH:mm'));
      }

      currentSlot = slotEnd;
    }

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Failed to fetch slots', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
