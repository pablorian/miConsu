import { NextRequest, NextResponse } from 'next/server';
import { Patient, ServiceRecord, Payment } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const patients = await Patient.find({ userId: user._id }).select('name lastName _id').lean() as any[];
    const patientIds = patients.map((p: any) => p._id);

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
