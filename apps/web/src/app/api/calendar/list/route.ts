import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectToDatabase, { User } from '@repo/database';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session: any = await verifySession(token);
  if (!session || !session.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id });

  if (!user || !user.googleCalendarAccessToken) {
    return NextResponse.json({ error: 'Calendar not connected' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.googleCalendarAccessToken,
    refresh_token: user.googleCalendarRefreshToken,
    expiry_date: user.googleCalendarTokenExpiry?.getTime()
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await User.findOneAndUpdate(
        { workosId: session.id },
        {
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarTokenExpiry: new Date(tokens.expiry_date || Date.now() + 3500 * 1000),
        }
      );
    }
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const calendarList = await calendar.calendarList.list({
      showHidden: true,
    });

    const items = calendarList.data.items || [];

    // Sync logic: Ensure all fetched calendars exist in user preferences
    // If we have no preferences yet, initialize them
    if (!user.calendarPreferences) {
      user.calendarPreferences = { view: 'week', calendars: [] };
    }
    // Defensive array check
    if (!Array.isArray(user.calendarPreferences.calendars)) {
      user.calendarPreferences.calendars = [];
    }

    let preferencesChanged = false;
    const existingIds = new Set(user.calendarPreferences.calendars.map((c: any) => c.calendarId));

    items.forEach(cal => {
      if (cal.id && !existingIds.has(cal.id)) {
        user.calendarPreferences.calendars.push({
          calendarId: cal.id,
          visible: true // Default to visible
        });
        existingIds.add(cal.id); // Prevent dupes locally if google returns dupes?
        preferencesChanged = true;
      }
    });

    if (preferencesChanged) {
      // Mark explicitly as modified for mixed/nested types just in case
      user.markModified('calendarPreferences.calendars');
      await user.save();
    }

    // Map to a cleaner format
    const calendars = items.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
      primary: cal.primary,
      selected: cal.selected
    }));

    return NextResponse.json(calendars);
  } catch (error) {
    console.error('Google Calendar List API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendars' }, { status: 500 });
  }
}
