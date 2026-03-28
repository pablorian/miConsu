import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectToDatabase, { BookingPage, Consultorio, Appointment, User } from '@repo/database';

/**
 * POST /api/public/booking/[slug]/book
 * Creates an appointment. No auth required.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    // Resolve config from BookingPage or legacy Consultorio
    let config: any    = null;
    let ownerId: any   = null;
    let calendarId     = '';

    const bp = await (BookingPage as any).findOne({ publicSlug: slug, isEnabled: true }).lean();
    if (bp) {
      config     = bp;
      ownerId    = bp.userId;
      calendarId = bp.consultorioId.toString();
    } else {
      const c = await (Consultorio as any).findOne({ publicSlug: slug, bookingEnabled: true }).lean();
      if (!c) return NextResponse.json({ error: 'Consultorio no encontrado' }, { status: 404 });
      config     = c;
      ownerId    = c.userId;
      calendarId = c.googleCalendarId || c._id.toString();
    }

    const { date, time, patientName, patientEmail, patientPhone, reason, serviceTypeId } = await req.json();
    if (!date || !time || !patientName) {
      return NextResponse.json({ error: 'date, time, patientName requeridos' }, { status: 400 });
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute]     = time.split(':').map(Number);

    const serviceType  = serviceTypeId
      ? (config.serviceTypes ?? []).find((st: any) => st.id === serviceTypeId)
      : null;
    const slotDuration  = serviceType?.durationMinutes ?? config.slotDurationMinutes ?? 60;
    const bufferMinutes = config.bufferMinutes ?? 0;

    const start = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const end   = new Date(start.getTime() + slotDuration * 60 * 1000);

    // ── Min advance hours ─────────────────────────────────────────────────────
    const minAdvanceHours = config.minAdvanceHours ?? 4;
    const earliestBookable = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000);
    if (start < earliestBookable) {
      return NextResponse.json({ error: 'Este horario requiere más tiempo de antelación' }, { status: 409 });
    }

    // ── Max advance days ──────────────────────────────────────────────────────
    const maxAdvanceDays = config.maxAdvanceDays ?? 60;
    if (maxAdvanceDays > 0) {
      const now     = new Date();
      const maxDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + maxAdvanceDays));
      if (start > maxDate) {
        return NextResponse.json({ error: 'La fecha está fuera del rango disponible' }, { status: 409 });
      }
    }

    // ── Max bookings per day ──────────────────────────────────────────────────
    const maxBookingsPerDay = config.maxBookingsPerDay ?? 0;
    if (maxBookingsPerDay > 0) {
      const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const dayEnd   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
      const countToday = await (Appointment as any).countDocuments({
        userId: ownerId, calendarId,
        start: { $lte: dayEnd }, end: { $gte: dayStart },
        status: { $nin: ['cancelled'] },
      });
      if (countToday >= maxBookingsPerDay) {
        return NextResponse.json({ error: 'No quedan turnos disponibles para este día' }, { status: 409 });
      }
    }

    // ── Conflict check (+ buffer) ─────────────────────────────────────────────
    const bufMs    = bufferMinutes * 60 * 1000;
    const winStart = new Date(start.getTime() - bufMs);
    const winEnd   = new Date(end.getTime() + bufMs);
    const conflict = await (Appointment as any).findOne({
      userId: ownerId, calendarId,
      start: { $lt: winEnd }, end: { $gt: winStart },
      status: { $nin: ['cancelled'] },
    });
    if (conflict) {
      return NextResponse.json({ error: 'Este horario ya no está disponible' }, { status: 409 });
    }

    // ── Create appointment ────────────────────────────────────────────────────
    const appointment = await (Appointment as any).create({
      userId: ownerId,
      calendarId,
      start,
      end,
      patientName:  patientName.trim(),
      patientEmail: patientEmail?.trim() || '',
      patientPhone: patientPhone?.trim() || '',
      reason:       reason?.trim() || 'Consulta',
      status:       'pending',
      ...(serviceType ? { serviceType: { id: serviceType.id, name: serviceType.name } } : {}),
    });

    // ── Google Calendar sync (BookingPage path only) ───────────────────────────
    if (bp && bp.syncToGoogleCalendar && bp.googleCalendarId) {
      try {
        const owner = await (User as any).findById(ownerId).lean();
        if (owner?.googleCalendarRefreshToken) {
          const oauth2 = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
          );
          oauth2.setCredentials({
            access_token:  owner.googleCalendarAccessToken,
            refresh_token: owner.googleCalendarRefreshToken,
            expiry_date:   owner.googleCalendarTokenExpiry
              ? new Date(owner.googleCalendarTokenExpiry).getTime()
              : undefined,
          });

          // Persist any token refresh
          oauth2.on('tokens', async (tokens) => {
            if (tokens.access_token) {
              await (User as any).findByIdAndUpdate(ownerId, {
                googleCalendarAccessToken: tokens.access_token,
                googleCalendarTokenExpiry: new Date(tokens.expiry_date || Date.now() + 3500 * 1000),
              });
            }
          });

          const gcal = google.calendar({ version: 'v3', auth: oauth2 });

          const serviceLabel = serviceType?.name ? ` — ${serviceType.name}` : '';
          const eventTitle   = `${reason?.trim() || 'Consulta'}${serviceLabel}: ${patientName.trim()}`;

          const eventBody = {
            summary: eventTitle,
            description: [
              `Paciente: ${patientName.trim()}`,
              patientPhone ? `Tel: ${patientPhone.trim()}` : null,
              patientEmail ? `Email: ${patientEmail.trim()}` : null,
              reason ? `Motivo: ${reason.trim()}` : null,
            ].filter(Boolean).join('\n'),
            start: { dateTime: start.toISOString() },
            end:   { dateTime: end.toISOString() },
            extendedProperties: {
              private: { miConsuAppointmentId: appointment._id.toString() },
            },
          };

          const gcalRes = await gcal.events.insert({
            calendarId: bp.googleCalendarId,
            requestBody: eventBody,
          });

          // Store the Google event ID on the appointment and mark as confirmed
          await (Appointment as any).findByIdAndUpdate(appointment._id, {
            googleEventId: gcalRes.data.id,
            status: 'confirmed',
          });
        }
      } catch (gcalErr) {
        // Non-fatal: appointment is already saved, just log the error
        console.error('[public/booking/book] Google Calendar sync failed:', gcalErr);
      }
    }

    return NextResponse.json({ ok: true, appointmentId: appointment._id });
  } catch (e: any) {
    console.error('[public/booking/book]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
