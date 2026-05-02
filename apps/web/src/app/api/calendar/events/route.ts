import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { User } from '@repo/database';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  if (!user.googleCalendarAccessToken) {
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
      await User.findByIdAndUpdate(user._id, {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarTokenExpiry: new Date(tokens.expiry_date || Date.now() + 3500 * 1000),
      });
    }
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const start = request.nextUrl.searchParams.get('start') || new Date().toISOString();
    const end = request.nextUrl.searchParams.get('end');

    const calendarList = await calendar.calendarList.list({ showHidden: true });
    const calendars = calendarList.data.items || [];

    const allEventsPromises = calendars.map(async (cal) => {
      if (!cal.id) return [];
      try {
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin: start,
          timeMax: end || undefined,
          maxResults: 50,
          singleEvents: true,
          orderBy: 'startTime',
        });

        return (response.data.items || []).map(event => ({
          ...event,
          resource: {
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor,
            calendarSummary: cal.summary,
            calendarId: cal.id
          }
        }));
      } catch (e) {
        console.error(`Failed to fetch events for calendar ${cal.id}`, e);
        return [];
      }
    });

    const results = await Promise.all(allEventsPromises);
    return NextResponse.json(results.flat());
  } catch (error) {
    console.error('Google Calendar API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
