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
    const calendarList = await calendar.calendarList.list({ showHidden: true });
    const items = calendarList.data.items || [];

    if (!user.calendarPreferences) {
      user.calendarPreferences = { view: 'week', calendars: [] };
    }
    if (!Array.isArray(user.calendarPreferences.calendars)) {
      user.calendarPreferences.calendars = [];
    }

    let preferencesChanged = false;
    const existingIds = new Set(user.calendarPreferences.calendars.map((c: any) => c.calendarId));

    items.forEach(cal => {
      if (cal.id && !existingIds.has(cal.id)) {
        user.calendarPreferences.calendars.push({ calendarId: cal.id, visible: true });
        existingIds.add(cal.id);
        preferencesChanged = true;
      }
    });

    if (preferencesChanged) {
      user.markModified('calendarPreferences.calendars');
      await user.save();
    }

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
