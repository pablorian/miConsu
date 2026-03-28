import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Patient, ServiceRecord, Professional, ProfessionalLiquidation } from '@repo/database';

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

    // Get all professionals for this user
    const professionals = await Professional.find({ userId: user._id }).lean() as any[];

    // Get all patients for this user
    const allPatients = await Patient.find({ userId: user._id }).select('_id').lean() as any[];
    const allPatientIds = allPatients.map((p: any) => p._id);

    // Build a professional lookup map
    const profById: Record<string, any> = {};
    const profByName: Record<string, any> = {};
    for (const p of professionals) {
      profById[p._id.toString()] = p;
      profByName[p.name.toLowerCase()] = p;
    }

    // Build date filter for the requested period
    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = toDate;
    }

    // Get service records in the period that belong to known patients
    const srQuery: any = { patientId: { $in: allPatientIds } };
    if (from || to) srQuery.date = dateFilter;

    const periodSRs = await (ServiceRecord as any).find(srQuery).lean() as any[];

    // Get liquidation payments made to professionals in the period
    const liqQuery: any = { userId: user._id };
    if (from || to) liqQuery.date = dateFilter;
    const periodLiquidations = await (ProfessionalLiquidation as any).find(liqQuery).lean() as any[];

    // Build per-professional liquidation totals
    const liquidadoPorProfesional: Record<string, number> = {};
    for (const liq of periodLiquidations) {
      const key = liq.professionalId.toString();
      liquidadoPorProfesional[key] = (liquidadoPorProfesional[key] || 0) + liq.amount;
    }

    // Aggregate per professional
    // cobrado  = sum of sr.paid  (what the patient actually paid for the service)
    // pendiente = sum of (sr.price - sr.paid)  (still owed by the patient)
    // a_liquidar = cobrado * percentage / 100
    const profMap: Record<string, {
      prof: any;
      facturado: number;  // total billed (sum of sr.price)
      cobrado: number;    // total collected (sum of sr.paid)
      pendiente: number;  // still owed by patients (sum of sr.price - sr.paid)
      atenciones: number;
    }> = {};

    const initProf = (prof: any) => {
      const key = prof._id.toString();
      if (!profMap[key]) {
        profMap[key] = { prof, facturado: 0, cobrado: 0, pendiente: 0, atenciones: 0 };
      }
      return key;
    };

    for (const sr of periodSRs) {
      // Only include SRs linked to a known professional
      let prof: any = null;
      if (sr.professionalId) {
        prof = profById[sr.professionalId.toString()];
      }
      if (!prof && sr.professional) {
        prof = profByName[sr.professional.toLowerCase()];
      }
      if (!prof) continue;

      const key = initProf(prof);
      const price = sr.price || 0;
      const paid = sr.paid || 0;

      profMap[key].facturado += price;
      profMap[key].cobrado += paid;
      profMap[key].pendiente += Math.max(0, price - paid);
      profMap[key].atenciones += 1;
    }

    // Build result
    const result = Object.values(profMap).map(({ prof, facturado, cobrado, pendiente, atenciones }) => {
      const percentage = prof.percentage ?? null;
      const profKey = prof._id.toString();

      // yaLiquidado: payments already made to this professional in the period
      const yaLiquidado = liquidadoPorProfesional[profKey] || 0;

      // liquidacionDisponible: cobrado * percentage (earned from collected payments)
      const liquidacionDisponible = (percentage !== null && percentage > 0)
        ? Math.round((cobrado * percentage) / 100 * 100) / 100
        : null;

      // saldoALiquidar: MAX(0, earned - already paid). If overpaid => 0
      const saldoALiquidar = liquidacionDisponible !== null
        ? Math.max(0, Math.round((liquidacionDisponible - yaLiquidado) * 100) / 100)
        : null;

      // totalGananciaProf: what the professional will earn in total (facturado * %)
      const totalGananciaProf = (percentage !== null && percentage > 0)
        ? Math.round((facturado * percentage) / 100 * 100) / 100
        : null;

      // pendienteProfesional: what the professional is still owed overall
      // = MAX(0, totalGananciaProf - yaLiquidado)
      // Accounts for pre-payments: if clinic paid more than earned so far, pending decreases
      const pendienteProfesional = totalGananciaProf !== null
        ? Math.max(0, Math.round((totalGananciaProf - yaLiquidado) * 100) / 100)
        : null;

      return {
        _id: profKey,
        name: prof.name,
        color: prof.color || '#6366f1',
        ingresos: facturado,
        cobrado,
        pendiente,
        totalGananciaProf,       // facturado * % (total the professional will earn)
        pendienteProfesional,    // MAX(0, totalGananciaProf - yaLiquidado)
        liquidacionDisponible,   // cobrado * % (earned from collected payments)
        yaLiquidado,             // already paid to professional
        saldoALiquidar,          // MAX(0, liquidacionDisponible - yaLiquidado)
        gastos: 0,
        ganancia: cobrado,
        atenciones,
        percentage,
        liquidacion: saldoALiquidar,
      };
    }).sort((a, b) => b.ingresos - a.ingresos);

    return NextResponse.json({ professionals: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
