import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { BookingPage, Consultorio, Appointment } from '@repo/database';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h  = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * GET /api/public/booking/[slug]/slots?date=YYYY-MM-DD&serviceTypeId=xxx
 * Returns available time slots for the requested date. No auth required.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const dateParam     = searchParams.get('date');
    const serviceTypeId = searchParams.get('serviceTypeId');

    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 });
    }

    await connectToDatabase();

    // Resolve config from BookingPage or legacy Consultorio
    let config: any = null;
    let ownerId: any = null;
    let calendarId: string | null = null;

    const bp = await (BookingPage as any).findOne({ publicSlug: slug, isEnabled: true }).lean();
    if (bp) {
      config     = bp;
      ownerId    = bp.userId;
      calendarId = bp.consultorioId.toString();
    } else {
      const c = await (Consultorio as any).findOne({ publicSlug: slug, bookingEnabled: true }).lean();
      if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      config     = c;
      ownerId    = c.userId;
      calendarId = c.googleCalendarId || c._id.toString();
    }

    const [year, month, day] = dateParam.split('-').map(Number);

    // ── Max advance days guard ────────────────────────────────────────────────
    const maxAdvanceDays = config.maxAdvanceDays ?? 60;
    if (maxAdvanceDays > 0) {
      const requestedDate = new Date(Date.UTC(year, month - 1, day));
      const now           = new Date();
      const maxDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + maxAdvanceDays));
      if (requestedDate > maxDate) {
        return NextResponse.json({ slots: [], date: dateParam, duration: config.slotDurationMinutes ?? 60 });
      }
    }

    // ── Working hours for the requested day ───────────────────────────────────
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dow     = dateObj.getUTCDay();
    const wh      = config.workingHours?.[dow.toString()];
    if (!wh?.enabled) {
      return NextResponse.json({ slots: [], date: dateParam, duration: config.slotDurationMinutes ?? 60 });
    }

    // ── Resolve service type and duration ─────────────────────────────────────
    const serviceType   = serviceTypeId
      ? (config.serviceTypes ?? []).find((st: any) => st.id === serviceTypeId)
      : null;
    const duration      = serviceType?.durationMinutes ?? config.slotDurationMinutes ?? 60;
    const bufferMinutes = config.bufferMinutes ?? 0;

    const startMin = timeToMinutes(wh.startTime);
    const endMin   = timeToMinutes(wh.endTime);

    // ── Existing appointments that day ────────────────────────────────────────
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEnd   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    const existingAppts = await (Appointment as any).find({
      userId:     ownerId,
      calendarId,
      start:      { $lte: dayEnd },
      end:        { $gte: dayStart },
    }).lean();

    // ── Max bookings per day guard ────────────────────────────────────────────
    const maxBookingsPerDay = config.maxBookingsPerDay ?? 0;
    if (maxBookingsPerDay > 0 && existingAppts.length >= maxBookingsPerDay) {
      return NextResponse.json({ slots: [], date: dateParam, duration });
    }

    // ── Min advance hours guard ───────────────────────────────────────────────
    const now             = new Date();
    const minAdvanceHours = config.minAdvanceHours ?? 4;
    const earliestMs      = now.getTime() + minAdvanceHours * 60 * 60 * 1000;

    // ── Generate slots ────────────────────────────────────────────────────────
    const slots: string[] = [];
    for (let slotStart = startMin; slotStart + duration <= endMin; slotStart += duration) {
      const slotStartDate = new Date(Date.UTC(year, month - 1, day, Math.floor(slotStart / 60), slotStart % 60));
      if (slotStartDate.getTime() < earliestMs) continue;

      const slotEnd     = slotStart + duration;
      const slotEndDate = new Date(Date.UTC(year, month - 1, day, Math.floor(slotEnd / 60), slotEnd % 60));
      const bufMs       = bufferMinutes * 60 * 1000;

      const blocked = existingAppts.some((appt: any) => {
        const aStart = new Date(appt.start).getTime();
        const aEnd   = new Date(appt.end).getTime();
        return (aStart - bufMs) < slotEndDate.getTime() && (aEnd + bufMs) > slotStartDate.getTime();
      });

      if (!blocked) slots.push(minutesToTime(slotStart));
    }

    return NextResponse.json({ slots, date: dateParam, duration });
  } catch (e: any) {
    console.error('[public/booking/slots]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
