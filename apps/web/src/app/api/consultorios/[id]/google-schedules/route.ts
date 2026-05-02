import { NextRequest, NextResponse } from 'next/server';
import { Consultorio } from '@repo/database';
import { getGoogleAuthClient, getGoogleCalendarClient } from '@/lib/google-calendar-sync';
import { requireUser } from '@/lib/auth';

/**
 * GET /api/consultorios/[id]/google-schedules
 *
 * Returns ALL Google Calendar Appointment Schedules across every calendar
 * the user owns, each annotated with the calendarId and calendarName it
 * belongs to.  The client uses this to warn when a selected schedule belongs
 * to a different calendar than the consultorio's linked googleCalendarId.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    if (!user.googleCalendarRefreshToken) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const { id } = await params;
    const consultorio = await (Consultorio as any).findOne({ _id: id, userId: user._id }).lean();
    if (!consultorio) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const auth     = getGoogleAuthClient(user);
    const calendar = getGoogleCalendarClient(user);

    // 1. Get the full list of calendars the user has write access to
    const calListRes = await calendar.calendarList.list({ minAccessRole: 'writer' });
    const calList    = calListRes.data.items ?? [];

    // Build a quick lookup: calendarId → calendarName
    const calNameMap: Record<string, string> = {};
    for (const cal of calList) {
      if (cal.id) calNameMap[cal.id] = cal.summary || cal.id;
    }

    // 2. For each calendar, try to fetch its appointment schedules.
    //    We fan-out in parallel; 404 / empty results are silently ignored.
    const calendarIds = calList.map(c => c.id).filter(Boolean) as string[];

    const results = await Promise.allSettled(
      calendarIds.map(calId =>
        auth.request<{
          appointmentSchedules?: Array<{
            id: string;
            name: string;
            description?: string;
            appointmentDuration?: string; // "1800s"
          }>;
        }>({
          url:    'https://www.googleapis.com/calendar/v3/appointmentSchedules',
          params: { calendarId: calId, maxResults: 50 },
        }).then(res => ({ calId, schedules: res.data.appointmentSchedules ?? [] }))
      )
    );

    // 3. Flatten results and attach calendar metadata
    const schedules: Array<{
      id:              string;
      name:            string;
      description:     string;
      durationMinutes: number | null;
      calendarId:      string;
      calendarName:    string;
    }> = [];

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const { calId, schedules: raw } = result.value;
      for (const s of raw) {
        schedules.push({
          id:              s.id,
          name:            s.name,
          description:     s.description ?? '',
          durationMinutes: s.appointmentDuration
            ? Math.round(parseInt(s.appointmentDuration) / 60)
            : null,
          calendarId:   calId,
          calendarName: calNameMap[calId] ?? calId,
        });
      }
    }

    return NextResponse.json({ schedules });
  } catch (e: any) {
    console.error('[GET /google-schedules]', e?.response?.data ?? e);
    return NextResponse.json({ error: 'Error fetching schedules from Google' }, { status: 500 });
  }
}
