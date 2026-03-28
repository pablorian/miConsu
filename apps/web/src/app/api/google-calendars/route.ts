import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectToDatabase, { User } from '@repo/database';
import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/google-calendars
 * Returns the list of Google Calendars for the authenticated user.
 * Returns { connected: false } if Google Calendar is not linked.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session: any = await verifySession(token);
  if (!session?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id });

  // Not connected — return gracefully so the UI can hide the section
  if (!user || !user.googleCalendarRefreshToken) {
    return NextResponse.json({ connected: false, calendars: [] });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    access_token:  user.googleCalendarAccessToken,
    refresh_token: user.googleCalendarRefreshToken,
    expiry_date:   user.googleCalendarTokenExpiry?.getTime(),
  });

  // Persist refreshed tokens
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await User.findOneAndUpdate(
        { workosId: session.id },
        {
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarTokenExpiry: new Date(tokens.expiry_date || Date.now() + 3500 * 1000),
        },
      );
    }
  });

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data } = await calendar.calendarList.list({ showHidden: false });

    const calendars = (data.items || []).map(cal => ({
      id:              cal.id,
      summary:         cal.summary,
      backgroundColor: cal.backgroundColor,
      primary:         cal.primary ?? false,
    }));

    return NextResponse.json({ connected: true, calendars });
  } catch (err) {
    console.error('[GET /api/google-calendars]', err);
    // Return disconnected rather than 500 so the UI degrades gracefully
    return NextResponse.json({ connected: false, calendars: [] });
  }
}
