import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Consultorio, ConsultorioBooking } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

// ─── Recurrence expansion helpers ────────────────────────────────────────────

function addDaysToDate(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** First occurrence of `weekday` (0=Sun) on or after `from` */
function firstOccurrenceOnOrAfter(from: Date, weekday: number): Date {
  const d = startOfUTCDay(from);
  const diff = (weekday - d.getUTCDay() + 7) % 7;
  return addDaysToDate(d, diff);
}

/** N-th occurrence (1-based) of `weekday` in the given year/month (UTC) */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  // Find first occurrence of weekday in this month
  const first = new Date(Date.UTC(year, month, 1));
  const diff = (weekday - first.getUTCDay() + 7) % 7;
  const day = 1 + diff + (nth - 1) * 7;
  if (day > new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) return null; // month overflow
  return new Date(Date.UTC(year, month, day));
}

interface BookingDoc {
  _id: string;
  consultorioId: string;
  professionalId?: string;
  professionalName: string;
  date: Date;
  startTime: string;
  endTime: string;
  monthlyPrice: number;
  recurrenceType: string;
  daysOfWeek: number[];
  endDate?: Date;
  notes?: string;
}

interface ExpandedBooking {
  _id: string;
  bookingId: string;
  consultorioId: string;
  professionalId?: string;
  professionalName: string;
  /** The specific occurrence date (ISO string YYYY-MM-DD) */
  date: string;
  startTime: string;
  endTime: string;
  monthlyPrice: number;
  recurrenceType: string;
  notes?: string;
}

/**
 * Expand a recurring booking into individual occurrences within [fromDate, toDate].
 * Returns an array of ExpandedBooking, one per occurrence.
 */
function expandBooking(b: BookingDoc, fromDate: Date, toDate: Date): ExpandedBooking[] {
  const results: ExpandedBooking[] = [];
  const startDate = startOfUTCDay(b.date);
  const endDate = b.endDate ? startOfUTCDay(b.endDate) : addDaysToDate(toDate, 1); // inclusive end
  const from = startOfUTCDay(fromDate);
  const to   = startOfUTCDay(toDate);

  const mkOccurrence = (d: Date): ExpandedBooking => ({
    _id:               `${b._id}_${d.toISOString().slice(0, 10)}`,
    bookingId:         b._id.toString(),
    consultorioId:     b.consultorioId.toString(),
    professionalId:    b.professionalId?.toString(),
    professionalName:  b.professionalName,
    date:              d.toISOString().slice(0, 10),
    startTime:         b.startTime,
    endTime:           b.endTime,
    monthlyPrice:      b.monthlyPrice,
    recurrenceType:    b.recurrenceType,
    notes:             b.notes,
  });

  const inRange = (d: Date) =>
    d >= from && d <= to && d >= startDate && d < endDate;

  switch (b.recurrenceType) {
    case 'once': {
      if (inRange(startDate)) results.push(mkOccurrence(startDate));
      break;
    }

    case 'weekly': {
      const dows = b.daysOfWeek.length > 0 ? b.daysOfWeek : [b.date.getUTCDay()];
      for (const dow of dows) {
        // First occurrence of this weekday on or after max(from, startDate)
        const windowStart = from >= startDate ? from : startDate;
        let d = firstOccurrenceOnOrAfter(windowStart, dow);
        while (d <= to) {
          if (inRange(d)) results.push(mkOccurrence(new Date(d)));
          d = addDaysToDate(d, 7);
        }
      }
      break;
    }

    case 'biweekly': {
      const dows = b.daysOfWeek.length > 0 ? b.daysOfWeek : [b.date.getUTCDay()];
      for (const dow of dows) {
        // Anchor: first occurrence of this weekday >= startDate
        let anchor = firstOccurrenceOnOrAfter(startDate, dow);
        // Advance in 2-week steps until we reach `from`
        while (anchor < from) anchor = addDaysToDate(anchor, 14);
        // But we may have overshot by 1 step; check the previous occurrence too
        const prev = addDaysToDate(anchor, -14);
        let d = inRange(prev) ? prev : anchor;
        while (d <= to) {
          if (inRange(d)) results.push(mkOccurrence(new Date(d)));
          d = addDaysToDate(d, 14);
        }
      }
      break;
    }

    case 'monthly': {
      // Repeat on the same N-th weekday of each month as startDate
      const weekday = startDate.getUTCDay();
      const nth = Math.ceil(startDate.getUTCDate() / 7); // 1st–4th occurrence

      let year  = from.getUTCFullYear();
      let month = from.getUTCMonth();
      // Also check the month before `from` in case there's an occurrence in range
      if (month === 0) { year -= 1; month = 11; } else month -= 1;

      while (true) {
        const occ = nthWeekdayOfMonth(year, month, weekday, nth);
        if (occ && occ > to) break;
        if (occ && inRange(occ)) results.push(mkOccurrence(occ));
        month++;
        if (month > 11) { year++; month = 0; }
        // Safety: if we've gone 2 years past `to`, stop
        if (year > to.getUTCFullYear() + 2) break;
      }
      break;
    }
  }

  return results;
}

// ─── GET /api/consultorios/[id]/bookings ─────────────────────────────────────
// With ?from&to  → returns expanded occurrences for the weekly grid
// Without range  → returns raw booking rules (for the list view)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    if (from && to) {
      // ── Expanded mode for weekly grid ──────────────────────────────────────
      const fromDate = new Date(from);
      const toDate   = new Date(to);

      // Fetch all bookings for this consultorio whose recurrence could overlap [from, to]:
      // - once: date in range
      // - weekly/biweekly/monthly: startDate <= toDate AND (endDate is null OR endDate >= fromDate)
      const rawBookings = await (ConsultorioBooking as any).find({
        userId:        user._id,
        consultorioId: id,
        $or: [
          { recurrenceType: 'once',   date: { $gte: fromDate, $lte: toDate } },
          {
            recurrenceType: { $in: ['weekly', 'biweekly', 'monthly'] },
            date:    { $lte: toDate },
            $or: [
              { endDate: null },
              { endDate: { $exists: false } },
              { endDate: { $gte: fromDate } },
            ],
          },
          // Legacy bookings with no recurrenceType
          { recurrenceType: { $exists: false }, date: { $gte: fromDate, $lte: toDate } },
        ],
      }).lean();

      const expanded: ExpandedBooking[] = [];
      for (const b of rawBookings) {
        const type = (b as any).recurrenceType || 'once';
        if (type === 'once' || !['weekly', 'biweekly', 'monthly'].includes(type)) {
          // Treat as one-time
          const d = startOfUTCDay((b as any).date);
          if (d >= startOfUTCDay(fromDate) && d <= startOfUTCDay(toDate)) {
            expanded.push({
              _id:              `${(b as any)._id}_once`,
              bookingId:        (b as any)._id.toString(),
              consultorioId:    (b as any).consultorioId.toString(),
              professionalId:   (b as any).professionalId?.toString(),
              professionalName: (b as any).professionalName,
              date:             d.toISOString().slice(0, 10),
              startTime:        (b as any).startTime,
              endTime:          (b as any).endTime,
              monthlyPrice:     (b as any).monthlyPrice ?? (b as any).totalCost ?? 0,
              recurrenceType:   'once',
              notes:            (b as any).notes,
            });
          }
        } else {
          const occs = expandBooking(b as any, fromDate, toDate);
          expanded.push(...occs);
        }
      }

      expanded.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
      return NextResponse.json({ bookings: expanded });
    }

    // ── Raw rules mode for list view ──────────────────────────────────────────
    const bookings = await (ConsultorioBooking as any)
      .find({ userId: user._id, consultorioId: id })
      .sort({ date: 1, startTime: 1 });
    return NextResponse.json({ bookings });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST /api/consultorios/[id]/bookings ────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: consultorioId } = await params;

    const consultorio = await Consultorio.findOne({ _id: consultorioId, userId: user._id });
    if (!consultorio) return NextResponse.json({ error: 'Consultorio not found' }, { status: 404 });

    const {
      professionalId, professionalName,
      date, startTime, endTime,
      monthlyPrice,
      recurrenceType = 'once',
      daysOfWeek = [],
      endDate,
      notes,
    } = await req.json();

    if (!professionalName || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'professionalName, date, startTime, endTime required' }, { status: 400 });
    }

    const booking = await (ConsultorioBooking as any).create({
      userId:          user._id,
      consultorioId,
      professionalId:  professionalId || null,
      professionalName,
      date:            new Date(date),
      startTime,
      endTime,
      monthlyPrice:    monthlyPrice ?? 0,
      recurrenceType,
      daysOfWeek:      recurrenceType === 'once' ? [] : daysOfWeek,
      endDate:         endDate ? new Date(endDate) : null,
      notes,
    });

    return NextResponse.json({ booking });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
