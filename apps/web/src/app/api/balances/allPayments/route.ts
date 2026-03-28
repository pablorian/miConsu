import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Payment, Patient, ServiceRecord, Professional, ProfessionalLiquidation } from '@repo/database';

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
    const professionalFilter = searchParams.get('professional');
    const currency = searchParams.get('currency');

    // Date filter
    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = toDate;
    }

    // ─── Patient payments (ingresos) ────────────────────────────────────────
    const payQuery: any = { userId: user._id };
    if (from || to) payQuery.date = dateFilter;
    if (currency && currency !== 'Todos') payQuery.currency = currency;

    const rawPayments = await (Payment as any).find(payQuery).sort({ date: -1 }).lean();

    const patientIds = [...new Set(rawPayments.map((p: any) => p.patientId?.toString()).filter(Boolean))];
    const patients = await Patient.find({ _id: { $in: patientIds } }).select('name lastName').lean() as any[];
    const patientMap: Record<string, string> = {};
    patients.forEach((p: any) => {
      patientMap[p._id.toString()] = [p.lastName, p.name].filter(Boolean).join(', ');
    });

    const incomeRows = rawPayments.map((p: any) => ({
      _id: p._id.toString(),
      date: p.date,
      amount: p.amount,
      paymentMethod: p.paymentMethod || 'efectivo',
      currency: p.currency || 'ARS',
      concept: p.concept || 'Pago a cuenta',
      patientId: p.patientId?.toString() || null,
      patientName: p.patientId ? (patientMap[p.patientId.toString()] || '—') : '—',
      professionalName: null as string | null,
      professionalColor: null as string | null,
      isIncome: true,
    }));

    // ─── Professional liquidations (egresos) ────────────────────────────────
    const liqQuery: any = { userId: user._id };
    if (from || to) liqQuery.date = dateFilter;

    const liquidations = await (ProfessionalLiquidation as any).find(liqQuery).sort({ date: -1 }).lean();

    const profIds = [...new Set(liquidations.map((l: any) => l.professionalId?.toString()).filter(Boolean))];
    const profsForLiq = await Professional.find({ _id: { $in: profIds } }).select('name color').lean() as any[];
    const liqProfMap: Record<string, any> = {};
    profsForLiq.forEach((p: any) => { liqProfMap[p._id.toString()] = p; });

    const egresoRows = liquidations.map((l: any) => ({
      _id: l._id.toString(),
      date: l.date,
      amount: l.amount,
      paymentMethod: 'liquidación',
      currency: 'ARS',
      concept: l.notes || 'Liquidación a profesional',
      patientId: null as string | null,
      patientName: '—',
      professionalName: liqProfMap[l.professionalId?.toString()]?.name || '—',
      professionalColor: liqProfMap[l.professionalId?.toString()]?.color || '#6366f1',
      isIncome: false,
    }));

    // ─── Merge all rows ──────────────────────────────────────────────────────
    let allRows = [...incomeRows, ...egresoRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // ─── Ingresos por profesional (from ServiceRecords) ──────────────────────
    const allPatients = await Patient.find({ userId: user._id }).select('_id').lean() as any[];
    const allPatientIds = allPatients.map((p: any) => p._id);

    const srQuery: any = { patientId: { $in: allPatientIds } };
    if (from || to) srQuery.date = dateFilter;
    const periodSRs = await (ServiceRecord as any).find(srQuery).lean() as any[];

    const allProfs = await Professional.find({ userId: user._id }).lean() as any[];
    const profById: Record<string, any> = {};
    const profByName: Record<string, any> = {};
    allProfs.forEach((p: any) => {
      profById[p._id.toString()] = p;
      profByName[p.name.toLowerCase()] = p;
    });

    const ingresosPorProfMap: Record<string, { name: string; color: string; facturado: number; cobrado: number }> = {};
    for (const sr of periodSRs) {
      let prof: any = null;
      if (sr.professionalId) prof = profById[sr.professionalId.toString()];
      if (!prof && sr.professional) prof = profByName[sr.professional.toLowerCase()];
      if (!prof) continue;

      const key = prof._id.toString();
      if (!ingresosPorProfMap[key]) {
        ingresosPorProfMap[key] = { name: prof.name, color: prof.color || '#6366f1', facturado: 0, cobrado: 0 };
      }
      ingresosPorProfMap[key].facturado += sr.price || 0;
      ingresosPorProfMap[key].cobrado += sr.paid || 0;
    }

    // ─── Build daily chart data ───────────────────────────────────────────────
    const dailyMap: Record<string, { date: string; ingresos: number; egresos: number }> = {};
    allRows.forEach((p) => {
      const day = new Date(p.date).toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, ingresos: 0, egresos: 0 };
      if (p.isIncome) dailyMap[day].ingresos += p.amount;
      else dailyMap[day].egresos += p.amount;
    });
    const chartData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const totalIngresos = allRows.filter(r => r.isIncome).reduce((s, r) => s + r.amount, 0);
    const totalEgresos = allRows.filter(r => !r.isIncome).reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({
      payments: allRows,
      chartData,
      totals: { ingresos: totalIngresos, egresos: totalEgresos, ganancia: totalIngresos - totalEgresos },
      ingresosPorProf: Object.values(ingresosPorProfMap),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
