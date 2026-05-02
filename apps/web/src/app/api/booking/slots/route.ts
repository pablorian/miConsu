import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectToDatabase, { User } from '@repo/database';
import { addMinutes, format, isBefore, isAfter } from 'date-fns';

export const dynamic = 'force-dynamic';

const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;
const SLOT_DURATION_MIN = 30;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userPublicId = searchParams.get('userPublicId');
  const calendarSlug = searchParams.get('calendarSlug');
  const dateStr = searchParams.get('date');

  if (!userPublicId || !calendarSlug || !dateStr) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ publicId: userPublicId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const calendarConfig = user.calendarPreferences?.calendars?.find(
      (cal: any) => cal.publicSlug === calendarSlug && cal.isPublic
    );
    if (!calendarConfig) return NextResponse.json({ error: 'Calendar not found or not public' }, { status: 404 });

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken,
    });

    if (user.googleCalendarTokenExpiry && user.googleCalendarTokenExpiry < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      user.googleCalendarAccessToken = credentials.access_token;
      user.googleCalendarTokenExpiry = new Date(credentials.expiry_date || Date.now() + 3500 * 1000);
      await user.save();
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const freeBusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date(dateStr + 'T00:00:00').toISOString(),
        timeMax: new Date(dateStr + 'T23:59:59').toISOString(),
        items: [{ id: calendarConfig.calendarId }]
      }
    });

    const busySlots = freeBusyRes.data.calendars?.[calendarConfig.calendarId]?.busy || [];

    const slots = [];
    let currentSlot = new Date(`${dateStr}T${String(WORK_START_HOUR).padStart(2, '0')}:00:00`);
    const dayEnd = new Date(`${dateStr}T${String(WORK_END_HOUR).padStart(2, '0')}:00:00`);

    while (isBefore(currentSlot, dayEnd)) {
      const slotEnd = addMinutes(currentSlot, SLOT_DURATION_MIN);

      const isBusy = busySlots.some((busy: any) => {
        const busyStart = new Date(busy.start!);
        const busyEnd = new Date(busy.end!);
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
