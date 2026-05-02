import { NextRequest, NextResponse } from 'next/server';
import { Consultorio } from '@repo/database';
import { getGoogleCalendarClient } from '@/lib/google-calendar-sync';
import { requireUser } from '@/lib/auth';

/**
 * POST /api/consultorios/sync-from-google
 * Upserts one Consultorio per Google Calendar (selected or primary).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    if (!user.googleCalendarRefreshToken) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const calendar = getGoogleCalendarClient(user);

    const { data } = await calendar.calendarList.list({ maxResults: 250 });
    const calendarItems = data.items || [];

    const synced: any[] = [];

    for (const cal of calendarItems) {
      if (!cal.id || !cal.summary) continue;
      // Skip calendars not visible in Google UI (unselected secondaries / holidays); always sync primary.
      if (!cal.selected && !cal.primary) continue;

      const color = cal.backgroundColor || '#6366f1';

      const existing = await (Consultorio as any).findOne({
        userId: user._id,
        googleCalendarId: cal.id,
      });

      let consultorio;
      if (existing) {
        existing.name = cal.summary;
        existing.color = color;
        if (cal.description && !existing.description) {
          existing.description = cal.description;
        }
        await existing.save();
        consultorio = existing;
      } else {
        consultorio = await (Consultorio as any).create({
          userId: user._id,
          name: cal.summary,
          description: cal.description || '',
          hourlyRate: 0,
          color,
          googleCalendarId: cal.id,
        });
      }

      synced.push(consultorio);
    }

    const allConsultorios = await (Consultorio as any).find({ userId: user._id }).sort({ name: 1 });
    return NextResponse.json({ synced: synced.length, consultorios: allConsultorios });
  } catch (e: any) {
    console.error('[sync-from-google] Error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
