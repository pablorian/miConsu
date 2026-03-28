import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Patient, ServiceRecord, Payment } from '@repo/database';

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

    // Get all patients for this user
    const patients = await Patient.find({ userId: user._id }).select('name lastName _id').lean() as any[];
    const patientIds = patients.map((p: any) => p._id);

    // Build date query for service records
    const srQuery: any = { patientId: { $in: patientIds } };
    if (from || to) {
      srQuery.date = {};
      if (from) srQuery.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        srQuery.date.$lte = toDate;
      }
    }

    // Aggregate service records by patient
    const srByPatient = await (ServiceRecord as any).aggregate([
      { $match: srQuery },
      {
        $group: {
          _id: '$patientId',
          costoTotal: { $sum: '$price' },
          pagadoEnPrestacion: { $sum: '$paid' },
        }
      }
    ]);

    // Get payments (separate payment records)
    const paymentsByPatient = await (Payment as any).aggregate([
      { $match: { patientId: { $in: patientIds }, userId: user._id } },
      { $group: { _id: '$patientId', pagado: { $sum: '$amount' } } }
    ]);

    const paymentMap: Record<string, number> = {};
    paymentsByPatient.forEach((p: any) => {
      paymentMap[p._id.toString()] = p.pagado;
    });

    const patientMap: Record<string, string> = {};
    patients.forEach((p: any) => {
      patientMap[p._id.toString()] = [p.lastName, p.name].filter(Boolean).join(', ');
    });

    // Build result — only include patients with debt
    const result = srByPatient
      .map((sr: any) => {
        const id = sr._id.toString();
        const costoTotal = sr.costoTotal;
        const pagadoEnPrestacion = sr.pagadoEnPrestacion || 0;
        const pagadoExtra = paymentMap[id] || 0;
        const pagado = pagadoEnPrestacion + pagadoExtra;
        const deuda = costoTotal - pagado;
        return {
          patientId: id,
          patientName: patientMap[id] || '—',
          costoTotal,
          pagado,
          deuda,
        };
      })
      .filter((r: any) => r.deuda > 0)
      .sort((a: any, b: any) => b.deuda - a.deuda);

    return NextResponse.json({ patients: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
