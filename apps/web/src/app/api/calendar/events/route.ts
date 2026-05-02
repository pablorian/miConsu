import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getGoogleCalendarClient } from '@/lib/google-calendar-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  if (!user.googleCalendarAccessToken) {
    return NextResponse.json({ error: 'Calendar not connected' }, { status: 400 });
  }

  const calendar = getGoogleCalendarClient(user);

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
