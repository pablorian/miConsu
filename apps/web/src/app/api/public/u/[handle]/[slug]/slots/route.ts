import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, BookingPage, Appointment } from '@repo/database';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * GET /api/public/u/[handle]/[slug]/slots?date=YYYY-MM-DD&serviceTypeId=xxx
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string; slug: string }> },
) {
  try {
    const { handle, slug } = await params;
    const { searchParams } = new URL(req.url);
    const dateParam     = searchParams.get('date');
    const serviceTypeId = searchParams.get('serviceTypeId');

    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await (User as any).findOne({ publicId: handle }, { _id: 1 }).lean();
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const bp = await (BookingPage as any)
      .findOne({ userId: user._id, publicSlug: slug, isEnabled: true })
      .lean();
    if (!bp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const config     = bp;
    const ownerId    = user._id;
    const calendarId = bp._id.toString();

    const [year, month, day] = dateParam.split('-').map(Number);

    // Max advance guard
    const maxAdvanceDays = config.maxAdvanceDays ?? 60;
    if (maxAdvanceDays > 0) {
      const now     = new Date();
      const maxDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + maxAdvanceDays));
      if (new Date(Date.UTC(year, month - 1, day)) > maxDate) {
        return NextResponse.json({ slots: [], date: dateParam, duration: config.slotDurationMinutes ?? 60 });
      }
    }

    // Working hours
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dow     = dateObj.getUTCDay();
    const wh      = config.workingHours?.[dow.toString()];
    if (!wh?.enabled) {
      return NextResponse.json({ slots: [], date: dateParam, duration: config.slotDurationMinutes ?? 60 });
    }

    // Service type + duration
    const serviceType   = serviceTypeId
      ? (config.serviceTypes ?? []).find((st: any) => st.id === serviceTypeId)
      : null;
    const duration      = serviceType?.durationMinutes ?? config.slotDurationMinutes ?? 60;
    const bufferMinutes = config.bufferMinutes ?? 0;

    const startMin = timeToMinutes(wh.startTime);
    const endMin   = timeToMinutes(wh.endTime);

    // Existing appointments
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEnd   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    const existingAppts = await (Appointment as any).find({
      userId: ownerId, calendarId,
      start: { $lte: dayEnd }, end: { $gte: dayStart },
    }).lean();

    // Max per day guard
    const maxBookingsPerDay = config.maxBookingsPerDay ?? 0;
    if (maxBookingsPerDay > 0 && existingAppts.length >= maxBookingsPerDay) {
      return NextResponse.json({ slots: [], date: dateParam, duration });
    }

    // Min advance
    const now             = new Date();
    const minAdvanceHours = config.minAdvanceHours ?? 4;
    const earliestMs      = now.getTime() + minAdvanceHours * 60 * 60 * 1000;

    // Generate slots
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
  } catch (e) {
    console.error('[GET /api/public/u/:handle/:slug/slots]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
