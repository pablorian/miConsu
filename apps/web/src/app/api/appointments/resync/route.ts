import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@repo/database';
import { getGoogleCalendarClient } from '@/lib/google-calendar-sync';
import { matchPatient } from '@/lib/patient-matching';
import { requireUser } from '@/lib/auth';

const PLACEHOLDER_NAMES = ['google calendar event', 'busy', ''];
function isPlaceholder(v: string | undefined) {
  return !v || PLACEHOLDER_NAMES.includes(v.toLowerCase().trim());
}
function parseEventDescription(description: string | null | undefined) {
  if (!description) return {};
  const result: { name?: string; phone?: string; email?: string } = {};
  const nameMatch = description.match(/Paciente:\s*(.+)/i);
  const telMatch = description.match(/Tel:\s*(.+)/i);
  const emailMatch = description.match(/Email:\s*(.+)/i);
  if (nameMatch) result.name = nameMatch[1].trim();
  if (telMatch) result.phone = telMatch[1].trim();
  if (emailMatch) result.email = emailMatch[1].trim();
  return result;
}
function parseNameFromSummary(summary: string | null | undefined): string | undefined {
  if (!summary) return undefined;
  const bookingFormat = summary.match(/^Consulta:\s+(.+?)\s+\(.+\)$/i);
  if (bookingFormat) return bookingFormat[1].trim();
  const parenFormat = summary.match(/\(([^)]+)\)$/);
  if (parenFormat) return parenFormat[1].trim();
  return undefined;
}

/**
 * POST /api/appointments/resync
 * Re-fetches all Google Calendar events and updates appointments that have
 * placeholder patient names ("Google Calendar Event") with real extracted data.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    if (!user.googleCalendarRefreshToken) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const calendar = getGoogleCalendarClient(user);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data } = await calendar.events.list({
      calendarId: 'primary',
      singleEvents: true,
      maxResults: 500,
      timeMin: threeMonthsAgo.toISOString(),
    });

    const events = data.items || [];
    let updated = 0;
    let matched = 0;

    for (const event of events) {
      if (!event.id) continue;
      if (event.status === 'cancelled') continue;
      if (event.eventType && event.eventType !== 'default') continue;
      if (event.transparency === 'transparent') continue;

      const appt = await (Appointment as any).findOne({ googleEventId: event.id, userId: user._id });
      if (!appt) continue;

      const parsedInfo = parseEventDescription(event.description);
      const nameFromSummary = parseNameFromSummary(event.summary);
      const resolvedName = parsedInfo.name || nameFromSummary;

      const updates: any = {};

      if (isPlaceholder(appt.patientName) && resolvedName && !isPlaceholder(resolvedName)) {
        updates.patientName = resolvedName;
      }
      if (!appt.patientEmail && parsedInfo.email) {
        updates.patientEmail = parsedInfo.email;
      }
      if (!appt.patientPhone && parsedInfo.phone) {
        updates.patientPhone = parsedInfo.phone;
      }

      if (!appt.patientId) {
        const matchName = parsedInfo.name || nameFromSummary;
        const matchedPatient = await matchPatient(user._id, {
          email: parsedInfo.email,
          phone: parsedInfo.phone,
          name: matchName,
        });
        if (matchedPatient) {
          updates.patientId = matchedPatient._id;
          matched++;
        }
      }

      if (Object.keys(updates).length > 0) {
        await (Appointment as any).findByIdAndUpdate(appt._id, { $set: updates });
        updated++;
      }
    }

    return NextResponse.json({ success: true, scanned: events.length, updated, matched });
  } catch (error: any) {
    console.error('[Resync] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
