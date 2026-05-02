import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User } from '@repo/database';
import { verifySession } from '@/lib/session';
import { getGoogleCalendarClient } from '@/lib/google-calendar-sync';

export const dynamic = 'force-dynamic';

/**
 * GET /api/google-calendars
 * Returns the list of Google Calendars for the authenticated user.
 * Returns { connected: false } if Google Calendar is not linked — kept as soft-fail
 * so the calling UI can hide the section without surfacing an error.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session: any = await verifySession(token);
  if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectToDatabase();
  const user = await User.findOne({ workosId: session.id });

  if (!user || !user.googleCalendarRefreshToken) {
    return NextResponse.json({ connected: false, calendars: [] });
  }

  try {
    const calendar = getGoogleCalendarClient(user);
    const { data } = await calendar.calendarList.list({ showHidden: false });

    const calendars = (data.items || []).map(cal => ({
      id: cal.id,
      summary: cal.summary,
      backgroundColor: cal.backgroundColor,
      primary: cal.primary ?? false,
    }));

    return NextResponse.json({ connected: true, calendars });
  } catch (err) {
    console.error('[GET /api/google-calendars]', err);
    return NextResponse.json({ connected: false, calendars: [] });
  }
}
