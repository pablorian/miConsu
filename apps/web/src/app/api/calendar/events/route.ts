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
  // Find user by WorkOS ID
  const user = await User.findOne({ workosId: session.id });

  if (!user || !user.googleCalendarAccessToken) {
    return NextResponse.json({ error: 'Calendar not connected' }, { status: 400 });
  }

  // Initialize OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.googleCalendarAccessToken,
    refresh_token: user.googleCalendarRefreshToken,
    expiry_date: user.googleCalendarTokenExpiry?.getTime()
  });

  // Handle Token Refresh if needed
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
    const start = request.nextUrl.searchParams.get('start') || new Date().toISOString();
    const end = request.nextUrl.searchParams.get('end');

    // 1. List all calendars (Primary + Holidays + Others)
    const calendarList = await calendar.calendarList.list({
      showHidden: true,
    });
    const calendars = calendarList.data.items || [];

    console.log(`[GoogleAPI] Found ${calendars.length} calendars:`, calendars.map(c => c.summary));

    // 2. Fetch events for each calendar
    const allEventsPromises = calendars.map(async (cal) => {
      if (!cal.id) return [];
      try {
        console.log(`[GoogleAPI] Fetching events for ${cal.summary} (${cal.id})`);
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin: start,
          timeMax: end || undefined,
          maxResults: 50, // Limit per calendar to avoid timeout
          singleEvents: true,
          orderBy: 'startTime',
        });

        // Map events to include color from calendar if event doesn't have one
        return (response.data.items || []).map(event => ({
          ...event,
          resource: {
            backgroundColor: cal.backgroundColor,
            foregroundColor: cal.foregroundColor,
            calendarSummary: cal.summary,
            calendarId: cal.id // Critical for filtering
          }
        }));
      } catch (e) {
        console.error(`Failed to fetch events for calendar ${cal.id}`, e);
        return [];
      }
    });

    const results = await Promise.all(allEventsPromises);
    const flattenedEvents = results.flat();

    return NextResponse.json(flattenedEvents);
  } catch (error) {
    console.error('Google Calendar API Error:', error);
    // If error is 401, token might be revoked or invalid.
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
