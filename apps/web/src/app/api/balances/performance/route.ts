import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Patient, Appointment, ServiceRecord } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value) as any;
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: session.id }).lean() as any;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    // Total patients
    const totalPatients = await Patient.countDocuments({ userId: user._id });

    // New patients in range
    const newPatientsQuery: any = { userId: user._id };
    if (from || to) newPatientsQuery.createdAt = dateQuery;
    const newPatients = await Patient.countDocuments(newPatientsQuery);

    // Appointments in range
    const apptQuery: any = { userId: user._id };
    if (from || to) apptQuery.start = dateQuery;
    const totalAppointments = await Appointment.countDocuments(apptQuery);

    // Appointments by professional (from service records)
    const srQuery: any = { patientId: { $in: await Patient.find({ userId: user._id }).distinct('_id') } };
    if (from || to) srQuery.date = dateQuery;

    const byProfessional = await (ServiceRecord as any).aggregate([
      { $match: srQuery },
      { $group: { _id: '$professional', count: { $sum: 1 }, ingresos: { $sum: '$price' } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly attendance (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyData = await (ServiceRecord as any).aggregate([
      {
        $match: {
          ...srQuery,
          date: { $gte: twelveMonthsAgo },
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
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
