import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Consultorio } from '@repo/database';
import { getGoogleCalendarClient } from '@/lib/google-calendar-sync';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

/**
 * POST /api/consultorios/sync-from-google
 *
 * Fetches the user's Google Calendar list and upserts one Consultorio per calendar.
 * Uses the calendar's summary as the name and backgroundColor as the color.
 * Stores the calendar's id as googleCalendarId on each Consultorio.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!user.googleCalendarRefreshToken) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const calendar = getGoogleCalendarClient(user);

    // Fetch the full calendar list
    const { data } = await calendar.calendarList.list({ maxResults: 250 });
    const calendarItems = data.items || [];

    const synced: any[] = [];

    for (const cal of calendarItems) {
      if (!cal.id || !cal.summary) continue;

      // Skip calendars that are not selected / visible in Google Calendar UI
      // (e.g. other people's calendars that were unselected, holiday calendars, etc.)
      // We still sync if it's the primary calendar.
      if (!cal.selected && !cal.primary) continue;

      // Use the backgroundColor provided by Google, falling back to a default
      const color = cal.backgroundColor || '#6366f1';

      // Upsert: if a consultorio with this googleCalendarId already exists, update name/color.
      // If not, create a new one — but only if there isn't already a manually created one with the same name.
      const existing = await (Consultorio as any).findOne({
        userId: user._id,
        googleCalendarId: cal.id,
      });

      let consultorio;
      if (existing) {
        // Update name and color to stay in sync with Google Calendar
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

    // Return the full updated list of consultorios
    const allConsultorios = await (Consultorio as any).find({ userId: user._id }).sort({ name: 1 });

    return NextResponse.json({ synced: synced.length, consultorios: allConsultorios });
  } catch (e: any) {
    console.error('[sync-from-google] Error:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
