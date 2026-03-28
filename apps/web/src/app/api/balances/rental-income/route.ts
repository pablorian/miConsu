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

/**
 * GET /api/balances/rental-income?month=YYYY-MM
 *
 * Returns rental income for the given month, grouped by:
 *   - byProfessional: [ { name, professionalId, total, bookings[] } ]
 *   - byConsultorio:  [ { name, consultorioId, color, total, bookings[] } ]
 *   - total: number
 *
 * "Active bookings in this month" means:
 *   - 'once': date falls in the month
 *   - 'weekly'/'biweekly'/'monthly': startDate <= last day of month AND (endDate is null OR endDate >= first day of month)
 *   - For these recurring bookings we count 1× their monthlyPrice as they represent a monthly slot fee
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month'); // "YYYY-MM"
    const now = new Date();
    const year  = monthParam ? parseInt(monthParam.split('-')[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split('-')[1]) - 1 : now.getMonth();

    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay  = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    // Fetch all consultorios for this user
    const consultorios = await (Consultorio as any).find({ userId: user._id }).lean();
    const consultorioMap: Record<string, any> = Object.fromEntries(
      consultorios.map((c: any) => [c._id.toString(), c])
    );

    // Fetch bookings that are active in this month
    const rawBookings = await (ConsultorioBooking as any).find({
      userId: user._id,
      $or: [
        // One-time: date in this month
        { recurrenceType: 'once', date: { $gte: firstDay, $lte: lastDay } },
        // Legacy (no recurrenceType): date in this month
        { recurrenceType: { $exists: false }, date: { $gte: firstDay, $lte: lastDay } },
        // Recurring: started before or during this month, not ended before this month
        {
          recurrenceType: { $in: ['weekly', 'biweekly', 'monthly'] },
          date: { $lte: lastDay },
          $or: [
            { endDate: null },
            { endDate: { $exists: false } },
            { endDate: { $gte: firstDay } },
          ],
        },
      ],
    }).lean();

    // Aggregate by professional and consultorio
    const byProfessional: Record<string, { name: string; professionalId: string | null; total: number; bookings: any[] }> = {};
    const byConsultorio:  Record<string, { name: string; consultorioId: string; color: string; total: number; bookings: any[] }> = {};
    let total = 0;

    for (const b of rawBookings as any[]) {
      const price = b.monthlyPrice ?? b.totalCost ?? 0;
      if (price === 0) continue;

      const cId = b.consultorioId?.toString() || '';
      const con = consultorioMap[cId];

      // ── By professional ──────────────────────────────────────────────────
      const profKey = b.professionalId?.toString() || `__name__${b.professionalName}`;
      if (!byProfessional[profKey]) {
        byProfessional[profKey] = {
          name:           b.professionalName,
          professionalId: b.professionalId?.toString() || null,
          total:          0,
          bookings:       [],
        };
      }
      byProfessional[profKey].total += price;
      byProfessional[profKey].bookings.push({
        _id:             b._id.toString(),
        consultorioName: con?.name || 'Desconocido',
        startTime:       b.startTime,
        endTime:         b.endTime,
        recurrenceType:  b.recurrenceType || 'once',
        daysOfWeek:      b.daysOfWeek || [],
        monthlyPrice:    price,
      });

      // ── By consultorio ───────────────────────────────────────────────────
      if (!byConsultorio[cId]) {
        byConsultorio[cId] = {
          name:         con?.name || 'Desconocido',
          consultorioId: cId,
          color:        con?.color || '#6366f1',
          total:        0,
          bookings:     [],
        };
      }
      byConsultorio[cId].total += price;
      byConsultorio[cId].bookings.push({
        _id:             b._id.toString(),
        professionalName: b.professionalName,
        startTime:        b.startTime,
        endTime:          b.endTime,
        recurrenceType:   b.recurrenceType || 'once',
        daysOfWeek:       b.daysOfWeek || [],
        monthlyPrice:     price,
      });

      total += price;
    }

    return NextResponse.json({
      month:          `${year}-${String(month + 1).padStart(2, '0')}`,
      total,
      byProfessional: Object.values(byProfessional).sort((a, b) => b.total - a.total),
      byConsultorio:  Object.values(byConsultorio).sort((a, b) => b.total - a.total),
    });
  } catch (e) {
    console.error('[rental-income]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
