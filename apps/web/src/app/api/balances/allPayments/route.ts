import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Payment, Patient, ServiceRecord, Professional, ProfessionalLiquidation, GenericTransaction } from '@repo/database';

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
    const to   = searchParams.get('to');
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

    // ─── All patients for this user ──────────────────────────────────────────
    const allPatients = await Patient.find({ userId: user._id })
      .select('_id name lastName')
      .lean() as any[];

    const patientMap: Record<string, string> = {};
    allPatients.forEach((p: any) => {
      patientMap[p._id.toString()] = [p.lastName, p.name].filter(Boolean).join(', ');
    });
    const allPatientIds = allPatients.map((p: any) => p._id);

    // ─── All professionals for this user ─────────────────────────────────────
    const allProfs = await Professional.find({ userId: user._id }).lean() as any[];
    const profById: Record<string, any>   = {};
    const profByName: Record<string, any> = {};
    allProfs.forEach((p: any) => {
      profById[p._id.toString()]      = p;
      profByName[p.name.toLowerCase()] = p;
    });

    // ─── 1. Generic patient payments (Payment collection) ────────────────────
    const payQuery: any = { userId: user._id };
    if (from || to) payQuery.date = dateFilter;
    if (currency && currency !== 'Todos') payQuery.currency = currency;

    const rawPayments = await (Payment as any).find(payQuery).sort({ date: -1 }).lean();

    const genericIncomeRows = rawPayments.map((p: any) => ({
      _id:               p._id.toString(),
      date:              p.date,
      amount:            p.amount,
      paymentMethod:     p.paymentMethod || 'efectivo',
      currency:          p.currency || 'ARS',
      concept:           p.concept || 'Pago a cuenta',
      patientId:         p.patientId?.toString() || null,
      patientName:       p.patientId ? (patientMap[p.patientId.toString()] || '—') : '—',
      professionalName:  null as string | null,
      professionalColor: null as string | null,
      isIncome:          true,
      source:            'payment' as const,
    }));

    // ─── 2. Service record payments (ServiceRecord.paid > 0) ─────────────────
    const srQuery: any = { patientId: { $in: allPatientIds }, paid: { $gt: 0 } };
    if (from || to) srQuery.date = dateFilter;

    const paidSRs = await (ServiceRecord as any).find(srQuery).sort({ date: -1 }).lean() as any[];

    // Apply professional filter if set
    const srIncomeRows = paidSRs
      .map((sr: any) => {
        let prof: any = null;
        if (sr.professionalId) prof = profById[sr.professionalId.toString()];
        if (!prof && sr.professional) prof = profByName[sr.professional.toLowerCase()];

        // Apply professional filter
        if (professionalFilter && professionalFilter !== 'Todos') {
          if (!prof || prof.name !== professionalFilter) return null;
        }

        return {
          _id:               sr._id.toString(),
          date:              sr.date,
          amount:            sr.paid,
          paymentMethod:     'prestación',
          currency:          'ARS',
          concept:           sr.service || 'Prestación',
          patientId:         sr.patientId?.toString() || null,
          patientName:       patientMap[sr.patientId?.toString()] || '—',
          professionalName:  prof?.name  || sr.professional || null,
          professionalColor: prof?.color || null,
          isIncome:          true,
          source:            'serviceRecord' as const,
        };
      })
      .filter(Boolean) as any[];

    // ─── 3. Professional liquidations (egresos) ──────────────────────────────
    const liqQuery: any = { userId: user._id };
    if (from || to) liqQuery.date = dateFilter;

    const liquidations = await (ProfessionalLiquidation as any).find(liqQuery).sort({ date: -1 }).lean();

    const profIds = [...new Set(liquidations.map((l: any) => l.professionalId?.toString()).filter(Boolean))];
    const profsForLiq = await Professional.find({ _id: { $in: profIds } }).select('name color').lean() as any[];
    const liqProfMap: Record<string, any> = {};
    profsForLiq.forEach((p: any) => { liqProfMap[p._id.toString()] = p; });

    const egresoRows = liquidations
      .filter((l: any) => {
        if (!professionalFilter || professionalFilter === 'Todos') return true;
        return liqProfMap[l.professionalId?.toString()]?.name === professionalFilter;
      })
      .map((l: any) => ({
        _id:               l._id.toString(),
        date:              l.date,
        amount:            l.amount,
        paymentMethod:     'liquidación',
        currency:          'ARS',
        concept:           l.notes || 'Liquidación a profesional',
        patientId:         null as string | null,
        patientName:       '—',
        professionalName:  liqProfMap[l.professionalId?.toString()]?.name  || '—',
        professionalColor: liqProfMap[l.professionalId?.toString()]?.color || '#6366f1',
        isIncome:          false,
        source:            'liquidation' as const,
      }));

    // ─── 4. Generic transactions (otros ingresos/egresos) ────────────────────
    const txQuery: any = { userId: user._id };
    if (from || to) txQuery.date = dateFilter;
    const genericTxs = await (GenericTransaction as any).find(txQuery).sort({ date: -1 }).lean() as any[];

    const genericTxRows = genericTxs
      .filter((tx: any) => {
        if (!professionalFilter || professionalFilter === 'Todos') return true;
        return false; // generic transactions are not linked to professionals
      })
      .map((tx: any) => ({
        _id:               tx._id.toString(),
        date:              tx.date,
        amount:            tx.amount,
        paymentMethod:     tx.paymentMethod || '—',
        currency:          'ARS',
        concept:           tx.concept,
        patientId:         null as string | null,
        patientName:       '—',
        professionalName:  null as string | null,
        professionalColor: null as string | null,
        isIncome:          tx.type === 'ingreso',
        source:            'generic' as const,
        category:          tx.category || null,
      }));

    // ─── Merge all rows sorted by date desc ──────────────────────────────────
    const allRows = [...genericIncomeRows, ...srIncomeRows, ...egresoRows, ...genericTxRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // ─── Ingresos por profesional (from ServiceRecords, all paid SRs) ────────
    const allSRs = await (ServiceRecord as any).find({
      patientId: { $in: allPatientIds },
      ...(from || to ? { date: dateFilter } : {}),
    }).lean() as any[];

    const ingresosPorProfMap: Record<string, { name: string; color: string; facturado: number; cobrado: number }> = {};
    for (const sr of allSRs) {
      let prof: any = null;
      if (sr.professionalId) prof = profById[sr.professionalId.toString()];
      if (!prof && sr.professional) prof = profByName[sr.professional.toLowerCase()];
      if (!prof) continue;

      const key = prof._id.toString();
      if (!ingresosPorProfMap[key]) {
        ingresosPorProfMap[key] = { name: prof.name, color: prof.color || '#6366f1', facturado: 0, cobrado: 0 };
      }
      ingresosPorProfMap[key].facturado += sr.price || 0;
      ingresosPorProfMap[key].cobrado   += sr.paid  || 0;
    }

    // ─── Daily chart data ────────────────────────────────────────────────────
    const dailyMap: Record<string, { date: string; ingresos: number; egresos: number }> = {};
    allRows.forEach((row) => {
      const day = new Date(row.date).toISOString().split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, ingresos: 0, egresos: 0 };
      if (row.isIncome) dailyMap[day].ingresos += row.amount;
      else              dailyMap[day].egresos  += row.amount;
    });
    const chartData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const totalIngresos = allRows.filter(r => r.isIncome).reduce((s, r) => s + r.amount, 0);
    const totalEgresos  = allRows.filter(r => !r.isIncome).reduce((s, r) => s + r.amount, 0);

    // Breakdown of income sources for the summary panel
    const ingresosPayments     = genericIncomeRows.reduce((s, r) => s + r.amount, 0);
    const ingresosPrestaciones = srIncomeRows.reduce((s: number, r: any) => s + r.amount, 0);
    const ingresosGenericos    = genericTxRows.filter((r: any) =>  r.isIncome).reduce((s: number, r: any) => s + r.amount, 0);
    const egresosGenericos     = genericTxRows.filter((r: any) => !r.isIncome).reduce((s: number, r: any) => s + r.amount, 0);

    return NextResponse.json({
      payments: allRows,
      chartData,
      totals: {
        ingresos:             totalIngresos,
        egresos:              totalEgresos,
        ganancia:             totalIngresos - totalEgresos,
        ingresosPayments,
        ingresosPrestaciones,
        ingresosGenericos,
        egresosGenericos,
      },
      ingresosPorProf: Object.values(ingresosPorProfMap),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
