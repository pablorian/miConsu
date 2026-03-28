import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, Appointment, Consultorio } from '@repo/database';
import { getGoogleCalendarClient } from '@/lib/google-calendar-sync';
import { matchPatient } from '@/lib/patient-matching';

/** Parse structured patient info from a Google Calendar event description */
function parseEventDescription(description: string | null | undefined): {
  name?: string; phone?: string; email?: string;
} {
  if (!description) return {};
  const result: { name?: string; phone?: string; email?: string } = {};

  // ── Format 1: our booking/create ─────────────────────────────────────────
  // "Paciente: X\nTel: X\nEmail: X\nMotivo: X"
  const nameMatch = description.match(/Paciente:\s*(.+)/i);
  const telMatch  = description.match(/Tel(?:éfono|efono|\.)?:\s*(.+)/i);
  const emailMatch = description.match(/Email:\s*(.+)/i);
  if (nameMatch)  result.name  = nameMatch[1].trim();
  if (telMatch)   result.phone = telMatch[1].trim();
  if (emailMatch) result.email = emailMatch[1].trim();

  // ── Format 2: Google Calendar Appointment Scheduling ─────────────────────
  // "<b>Reservada por</b>\n{name}\n{email}\n{phone}\n<br>..."
  // The three lines right after the header are name, email, phone in fixed order.
  if (!result.name || !result.email || !result.phone) {
    const gcalMatch = description.match(/<b>Reservada\s+por<\/b>\n([^\n]+)\n([^\n]+)\n([^\n<]+)/i);
    if (gcalMatch) {
      const [, l1, l2, l3] = gcalMatch;
      if (!result.name)  result.name  = l1.trim();
      if (!result.email) result.email = l2.trim();
      if (!result.phone) result.phone = l3.trim();
    }
  }

  // ── Fallback: any email address anywhere in the description ──────────────
  if (!result.email) {
    const m = description.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (m) result.email = m[0];
  }

  return result;
}

/**
 * Try to extract a patient name from the event summary.
 * Handles two formats:
 *   - "Consulta: {name} ({reason})"  ← created by booking/create
 *   - "{reason} ({name})"            ← manually created in Google Calendar
 */
function parseNameFromSummary(summary: string | null | undefined): string | undefined {
  if (!summary) return undefined;
  // Format: "Consulta: {name} ({reason})" → capture name before the last parenthesis group
  const bookingFormat = summary.match(/^Consulta:\s+(.+?)\s+\(.+\)$/i);
  if (bookingFormat) return bookingFormat[1].trim();
  // Format: "{anything} ({name})" → capture content inside last parentheses
  const parenFormat = summary.match(/\(([^)]+)\)$/);
  if (parenFormat) return parenFormat[1].trim();
  return undefined;
}

const PLACEHOLDER_NAMES = ['google calendar event', 'busy', ''];

function isPlaceholder(value: string | undefined): boolean {
  return !value || PLACEHOLDER_NAMES.includes(value.toLowerCase().trim());
}

// Note: In development with local tunnel, ensure the tunnel URL is recognized by Google.
export async function POST(request: NextRequest) {
  const channelId = request.headers.get('X-Goog-Channel-ID');
  const resourceState = request.headers.get('X-Goog-Resource-State'); // 'sync', 'exists', etc.

  console.log(`[Google Webhook] Received ${request.method} request with state: ${resourceState}, channel: ${channelId}`);

  if (!channelId) {
    console.log(`[Google Webhook] Error: Missing channel ID`);
    return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
  }

  // A 'sync' state is the initial confirmation when the webhook is created
  if (resourceState === 'sync') {
    return NextResponse.json({ success: true, message: 'Webhook synced' });
  }

  try {
    await connectToDatabase();

    // Find who this channel belongs to
    const user = await User.findOne({ googleChannelId: channelId });
    if (!user) {
      console.log(`[Google Webhook] 404 Error: User for channel ${channelId} not found in DB`);

      // ZOMBIE CLEANUP: If Google is pinging us for a channel we no longer track, tell Google to STOP sending pings.
      try {
        const resourceId = request.headers.get('X-Goog-Resource-ID');
        if (resourceId) {
          const userId = channelId.split('-')[1];
          if (userId && userId.length === 24) { // Basic Mongoose ObjectId check
            const zombieUser = await User.findById(userId);
            if (zombieUser && zombieUser.googleCalendarRefreshToken) {
              const calendar = getGoogleCalendarClient(zombieUser);
              await calendar.channels.stop({
                requestBody: {
                  id: channelId,
                  resourceId: resourceId,
                }
              });
              console.log(`[Google Webhook] Successfully destroyed zombie channel ${channelId}`);
            } else {
              console.log(`[Google Webhook] Could not destroy zombie channel ${channelId} because user lacks refresh token.`);
            }
          }
        }
      } catch (cleanupError: any) {
        console.error(`[Google Webhook] Failed to destroy zombie channel ${channelId}:`, cleanupError.message);
      }

      return NextResponse.json({ error: 'User for channel not found' }, { status: 404 });
    }

    console.log(`[Google Webhook] Found user ${user.email} for channel ${channelId}`);

    const calendar = getGoogleCalendarClient(user);

    // ── Helper: sync events from one calendar ────────────────────────────────
    async function syncCalendarEvents(
      calendarId: string,
      syncToken: string | null | undefined,
      calendarLabel: string,
      onSyncToken: (token: string) => Promise<void>,
    ): Promise<number> {
      const requestOpts: any = {
        calendarId,
        singleEvents: true,
        maxResults: 2500,
      };

      if (syncToken) {
        requestOpts.syncToken = syncToken;
      } else {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        requestOpts.timeMin = oneMonthAgo.toISOString();
      }

      let data: any;
      try {
        const resp = await calendar.events.list(requestOpts);
        data = resp.data;
      } catch (err: any) {
        // 410 Gone = stale syncToken; clear it and skip this cycle
        if (err?.code === 410 || err?.status === 410) {
          await onSyncToken('');
          console.warn(`[GCal Webhook] Stale syncToken for calendar ${calendarId}, cleared.`);
          return 0;
        }
        throw err;
      }

      if (data.nextSyncToken) {
        await onSyncToken(data.nextSyncToken);
      }

      const events = data.items || [];

      for (const event of events) {
        if (event.status === 'cancelled') {
          await (Appointment as any).findOneAndDelete({ googleEventId: event.id, userId: user._id });
          continue;
        }

        const start = event.start?.dateTime || event.start?.date;
        const end   = event.end?.dateTime   || event.end?.date;
        if (!start || !end) continue;

        if (event.eventType && event.eventType !== 'default') continue;
        if (event.transparency === 'transparent') continue;

        console.log(`[GCal Webhook][${calendarLabel}] Event "${event.summary}"`);

        const parsedInfo = parseEventDescription(event.description);
        const nameFromSummary = parseNameFromSummary(event.summary);

        const attendees: Array<{ email?: string; displayName?: string; organizer?: boolean; self?: boolean }> =
          (event as any).attendees || [];
        const bookerAttendee = attendees.find(a => !a.organizer && !a.self);
        if (bookerAttendee?.email && !parsedInfo.email) parsedInfo.email = bookerAttendee.email;
        if (bookerAttendee?.displayName && !parsedInfo.name) parsedInfo.name = bookerAttendee.displayName;

        const resolvedName = parsedInfo.name || nameFromSummary || event.summary || 'Google Calendar Event';

        const existingAppt = await (Appointment as any).findOne({ googleEventId: event.id, userId: user._id });
        const existingHasGoodName = existingAppt && !isPlaceholder(existingAppt.patientName);
        const existingHasPatient  = existingAppt?.patientId != null;

        const isNew = !existingAppt;
        const patientFieldUpdates: any = {};
        if (isNew || (!existingHasGoodName && !isPlaceholder(resolvedName))) {
          patientFieldUpdates.patientName = resolvedName;
        }
        if (isNew || (!existingAppt?.patientEmail && parsedInfo.email)) {
          patientFieldUpdates.patientEmail = parsedInfo.email || '';
        }
        if (isNew || (!existingAppt?.patientPhone && parsedInfo.phone)) {
          patientFieldUpdates.patientPhone = parsedInfo.phone || '';
        }

        if (!existingHasPatient) {
          const matched = await matchPatient(user._id, {
            email: parsedInfo.email,
            phone: parsedInfo.phone,
            name: parsedInfo.name || nameFromSummary,
          });
          if (matched) patientFieldUpdates.patientId = matched._id;
        }

        const setUpdateData: any = {
          start: new Date(start),
          end:   new Date(end),
          reason: event.summary || 'Busy',
          ...patientFieldUpdates,
        };

        const setOnInsertData: any = {
          userId:        user._id,
          calendarId,          // ← real calendar ID (e.g. "primary" or the consultorio's calendarId)
          googleEventId: event.id,
          status:        'pending',
        };

        await (Appointment as any).findOneAndUpdate(
          { googleEventId: event.id, userId: user._id },
          { $set: setUpdateData, $setOnInsert: setOnInsertData },
          { upsert: true, new: true },
        );
      }

      return events.length;
    }

    // ── 1. Sync primary calendar ─────────────────────────────────────────────
    const primaryCount = await syncCalendarEvents(
      'primary',
      user.googleCalendarSyncToken,
      'primary',
      async (token) => {
        if (token) {
          user.googleCalendarSyncToken = token;
        } else {
          user.googleCalendarSyncToken = undefined;
        }
        await user.save();
      },
    );

    // ── 2. Sync each consultorio calendar ────────────────────────────────────
    const consultorios = await (Consultorio as any).find({
      userId: user._id,
      googleCalendarId: { $nin: [null, '', 'primary'] },
    });

    let consultorioCount = 0;
    for (const con of consultorios) {
      const count = await syncCalendarEvents(
        con.googleCalendarId,
        con.googleSyncToken,
        con.name,
        async (token) => {
          con.googleSyncToken = token || null;
          await con.save();
        },
      );
      consultorioCount += count;
    }

    return NextResponse.json({
      success: true,
      processed: primaryCount + consultorioCount,
      primary: primaryCount,
      consultorios: consultorioCount,
    });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    // Google occasionally triggers 410 Gone for old SyncTokens. Unset it to do full sync next time.
    if (error?.code === 410) {
      try {
        const channelId = request.headers.get('X-Goog-Channel-ID');
        await connectToDatabase();
        await User.findOneAndUpdate({ googleChannelId: channelId }, { $unset: { googleCalendarSyncToken: "" } });
      } catch (e) {
        console.error(e);
      }
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
