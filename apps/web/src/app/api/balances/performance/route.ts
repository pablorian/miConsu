import { NextRequest, NextResponse } from 'next/server';
import { Patient, Appointment, ServiceRecord } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateQuery: any = {};
    if (from) dateQuery.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateQuery.$lte = toDate;
    }

    const totalPatients = await Patient.countDocuments({ userId: user._id });

    const newPatientsQuery: any = { userId: user._id };
    if (from || to) newPatientsQuery.createdAt = dateQuery;
    const newPatients = await Patient.countDocuments(newPatientsQuery);

    const apptQuery: any = { userId: user._id };
    if (from || to) apptQuery.start = dateQuery;
    const totalAppointments = await Appointment.countDocuments(apptQuery);

    const srQuery: any = { patientId: { $in: await Patient.find({ userId: user._id }).distinct('_id') } };
    if (from || to) srQuery.date = dateQuery;

    const byProfessional = await (ServiceRecord as any).aggregate([
      { $match: srQuery },
      { $group: { _id: '$professional', count: { $sum: 1 }, ingresos: { $sum: '$price' } } },
      { $sort: { count: -1 } },
    ]);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyData = await (ServiceRecord as any).aggregate([
      { $match: { ...srQuery, date: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          count: { $sum: 1 },
          ingresos: { $sum: '$price' },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthlyChart = monthlyData.map((d: any) => ({
      label: `${d._id.year}-${String(d._id.month).padStart(2, '0')}`,
      count: d.count,
      ingresos: d.ingresos,
    }));

    return NextResponse.json({
      kpis: {
        totalPatients,
        newPatients,
        totalAppointments,
        activePatients: totalPatients - newPatients,
      },
      byProfessional: byProfessional.map((d: any) => ({
        professional: d._id || 'Sin profesional',
        count: d.count,
        ingresos: d.ingresos,
      })),
      monthlyChart,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
