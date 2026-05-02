import { NextRequest, NextResponse } from 'next/server';
import { Consultorio, ConsultorioBooking } from '@repo/database';
import { requireUser } from '@/lib/auth';

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
    const { user, error } = await requireUser();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');
    const now = new Date();
    const year  = monthParam ? parseInt(monthParam.split('-')[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split('-')[1]) - 1 : now.getMonth();

    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay  = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

    const consultorios = await (Consultorio as any).find({ userId: user._id }).lean();
    const consultorioMap: Record<string, any> = Object.fromEntries(
      consultorios.map((c: any) => [c._id.toString(), c])
    );

    const rawBookings = await (ConsultorioBooking as any).find({
      userId: user._id,
      $or: [
        { recurrenceType: 'once', date: { $gte: firstDay, $lte: lastDay } },
        { recurrenceType: { $exists: false }, date: { $gte: firstDay, $lte: lastDay } },
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

    const byProfessional: Record<string, { name: string; professionalId: string | null; total: number; bookings: any[] }> = {};
    const byConsultorio:  Record<string, { name: string; consultorioId: string; color: string; total: number; bookings: any[] }> = {};
    let total = 0;

    for (const b of rawBookings as any[]) {
      const price = b.monthlyPrice ?? b.totalCost ?? 0;
      if (price === 0) continue;

      const cId = b.consultorioId?.toString() || '';
      const con = consultorioMap[cId];

      const profKey = b.professionalId?.toString() || `__name__${b.professionalName}`;
      if (!byProfessional[profKey]) {
        byProfessional[profKey] = {
          name: b.professionalName,
          professionalId: b.professionalId?.toString() || null,
          total: 0,
          bookings: [],
        };
      }
      byProfessional[profKey].total += price;
      byProfessional[profKey].bookings.push({
        _id: b._id.toString(),
        consultorioName: con?.name || 'Desconocido',
        startTime: b.startTime,
        endTime: b.endTime,
        recurrenceType: b.recurrenceType || 'once',
        daysOfWeek: b.daysOfWeek || [],
        monthlyPrice: price,
      });

      if (!byConsultorio[cId]) {
        byConsultorio[cId] = {
          name: con?.name || 'Desconocido',
          consultorioId: cId,
          color: con?.color || '#6366f1',
          total: 0,
          bookings: [],
        };
      }
      byConsultorio[cId].total += price;
      byConsultorio[cId].bookings.push({
        _id: b._id.toString(),
        professionalName: b.professionalName,
        startTime: b.startTime,
        endTime: b.endTime,
        recurrenceType: b.recurrenceType || 'once',
        daysOfWeek: b.daysOfWeek || [],
        monthlyPrice: price,
      });

      total += price;
    }

    return NextResponse.json({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      total,
      byProfessional: Object.values(byProfessional).sort((a, b) => b.total - a.total),
      byConsultorio: Object.values(byConsultorio).sort((a, b) => b.total - a.total),
    });
  } catch (e) {
    console.error('[rental-income]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
