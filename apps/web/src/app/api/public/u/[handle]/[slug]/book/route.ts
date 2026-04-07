import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectToDatabase, { User, BookingPage, Appointment, Patient } from '@repo/database';

/**
 * POST /api/public/u/[handle]/[slug]/book
 * Creates an appointment for the given booking page. No auth required.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string; slug: string }> },
) {
  try {
    const { handle, slug } = await params;
    await connectToDatabase();

    const user = await (User as any).findOne({ publicId: handle }).lean();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const bp = await (BookingPage as any)
      .findOne({ userId: user._id, publicSlug: slug, isEnabled: true })
      .lean();
    if (!bp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const ownerId    = user._id;
    const calendarId = bp._id.toString();

    const { date, time, patientDni, patientName, contactEmail, contactPhone, reason, serviceTypeId } = await req.json();
    if (!date || !time || !patientName || !patientDni) {
      return NextResponse.json({ error: 'date, time, patientDni y patientName son requeridos' }, { status: 400 });
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute]     = time.split(':').map(Number);

    const serviceType   = serviceTypeId
      ? (bp.serviceTypes ?? []).find((st: any) => st.id === serviceTypeId)
      : null;
    const slotDuration  = serviceType?.durationMinutes ?? bp.slotDurationMinutes ?? 60;
    const bufferMinutes = bp.bufferMinutes ?? 0;

    const start = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const end   = new Date(start.getTime() + slotDuration * 60 * 1000);

    // Min advance check
    const minAdvanceHours  = bp.minAdvanceHours ?? 4;
    const earliestBookable = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000);
    if (start < earliestBookable) {
      return NextResponse.json({ error: 'Este horario requiere más tiempo de antelación' }, { status: 409 });
    }

    // Max advance check
    const maxAdvanceDays = bp.maxAdvanceDays ?? 60;
    if (maxAdvanceDays > 0) {
      const now     = new Date();
      const maxDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + maxAdvanceDays));
      if (start > maxDate) {
        return NextResponse.json({ error: 'La fecha está fuera del rango disponible' }, { status: 409 });
      }
    }

    // Max per day check
    const maxBookingsPerDay = bp.maxBookingsPerDay ?? 0;
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

    // Conflict + buffer check
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

    // ── Patient lookup / creation by DNI ──────────────────────────────────
    let patientId: string | null = null;
    const dniClean = patientDni.trim();
    if (dniClean) {
      let patient = await (Patient as any).findOne({
        userId: ownerId,
        'personalInfo.dni': dniClean,
      }).lean() as any;

      if (!patient) {
        // Split name: assume last word is lastName, rest is name
        const nameParts = patientName.trim().split(' ');
        const lastName = nameParts.length > 1 ? nameParts.pop() : undefined;
        const firstName = nameParts.join(' ') || patientName.trim();
        patient = await (Patient as any).create({
          userId: ownerId,
          name: firstName,
          lastName: lastName || undefined,
          email: contactEmail?.trim() || undefined,
          phone: contactPhone?.trim() || undefined,
          personalInfo: { dni: dniClean },
        });
      }
      patientId = patient._id.toString();
    }

    // Create appointment
    const appointment = await (Appointment as any).create({
      userId: ownerId,
      calendarId,
      start,
      end,
      patientName:  patientName.trim(),
      patientEmail: contactEmail?.trim() || '',
      patientPhone: contactPhone?.trim() || '',
      reason:       reason?.trim() || 'Consulta',
      status:       'pending',
      ...(patientId ? { patientId } : {}),
      ...(serviceType ? { serviceType: { id: serviceType.id, name: serviceType.name } } : {}),
    });

    // Google Calendar sync
    if (bp.syncToGoogleCalendar && bp.googleCalendarId) {
      try {
        if (user.googleCalendarRefreshToken) {
          const oauth2 = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
          );
          oauth2.setCredentials({
            access_token:  user.googleCalendarAccessToken,
            refresh_token: user.googleCalendarRefreshToken,
            expiry_date:   user.googleCalendarTokenExpiry
              ? new Date(user.googleCalendarTokenExpiry).getTime()
              : undefined,
          });
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
          const gcalRes = await gcal.events.insert({
            calendarId: bp.googleCalendarId,
            requestBody: {
              summary: `${reason?.trim() || 'Consulta'}${serviceLabel}: ${patientName.trim()}`,
              description: [
                `Paciente: ${patientName.trim()}`,
                contactPhone ? `Tel: ${contactPhone.trim()}` : null,
                contactEmail ? `Email: ${contactEmail.trim()}` : null,
                reason ? `Motivo: ${reason.trim()}` : null,
              ].filter(Boolean).join('\n'),
              start: { dateTime: start.toISOString() },
              end:   { dateTime: end.toISOString() },
              extendedProperties: {
                private: { miConsuAppointmentId: appointment._id.toString() },
              },
            },
          });
          await (Appointment as any).findByIdAndUpdate(appointment._id, {
            googleEventId: gcalRes.data.id,
            status: 'confirmed',
          });
        }
      } catch (gcalErr) {
        console.error('[u/:handle/:slug/book] Google Calendar sync failed:', gcalErr);
      }
    }

    return NextResponse.json({ ok: true, appointmentId: appointment._id });
  } catch (e: any) {
    console.error('[POST /api/public/u/:handle/:slug/book]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
