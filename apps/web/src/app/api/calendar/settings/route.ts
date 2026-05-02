import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type CalendarPref = { visible: boolean; isPublic: boolean; publicSlug: string };

function calendarsToDict(prefs: any[] | undefined): Record<string, CalendarPref> {
  const out: Record<string, CalendarPref> = {};
  prefs?.forEach((cal: any) => {
    out[cal.calendarId] = {
      visible: cal.visible,
      isPublic: cal.isPublic || false,
      publicSlug: cal.publicSlug || ''
    };
  });
  return out;
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  return NextResponse.json({
    timezone: user.timezone || 'America/Argentina/Buenos_Aires',
    view: user.calendarPreferences?.view || 'week',
    calendars: calendarsToDict(user.calendarPreferences?.calendars),
    publicId: user.publicId
  });
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  try {
    const body = await request.json();

    if (body.timezone) user.timezone = body.timezone;

    if (!user.calendarPreferences) {
      user.calendarPreferences = { view: 'week', calendars: [] };
    }

    if (body.view !== undefined) {
      user.calendarPreferences.view = body.view;
    }

    if (body.calendars) {
      if (!user.calendarPreferences.calendars) {
        user.calendarPreferences.calendars = [];
      }

      Object.keys(body.calendars).forEach(calId => {
        const settings = body.calendars[calId];
        const existingIndex = user.calendarPreferences.calendars.findIndex((c: any) => c.calendarId === calId);

        if (existingIndex > -1) {
          if (settings.visible !== undefined) user.calendarPreferences.calendars[existingIndex].visible = settings.visible;
          if (settings.isPublic !== undefined) user.calendarPreferences.calendars[existingIndex].isPublic = settings.isPublic;
          if (settings.publicSlug !== undefined) user.calendarPreferences.calendars[existingIndex].publicSlug = settings.publicSlug;
        } else {
          user.calendarPreferences.calendars.push({
            calendarId: calId,
            visible: settings.visible !== undefined ? settings.visible : true,
            isPublic: settings.isPublic || false,
            publicSlug: settings.publicSlug || ''
          });
        }
      });
    }

    await user.save();

    return NextResponse.json({
      success: true,
      timezone: user.timezone,
      view: user.calendarPreferences?.view,
      calendars: calendarsToDict(user.calendarPreferences?.calendars),
    });
  } catch (error) {
    console.error('Failed to update calendar settings', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
