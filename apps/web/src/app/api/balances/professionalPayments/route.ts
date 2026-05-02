import { NextRequest, NextResponse } from 'next/server';
import { Patient, ServiceRecord, Professional, ProfessionalLiquidation } from '@repo/database';
import { requireUser } from '@/lib/auth';

/** Resolve effective % for a given obra social name, using per-OS overrides or falling back to generic */
function resolvePercentage(prof: any, obraSocialName: string | null): number | null {
  const generic = prof.percentage ?? null;
  if (!obraSocialName) return generic;

  const overrides: any[] = prof.obraSocialPercentages || [];
  const match = overrides.find(
    (o: any) => o.name?.toLowerCase() === obraSocialName.toLowerCase()
  );
  return match != null ? match.percentage : generic;
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    const professionals = await Professional.find({ userId: user._id }).lean() as any[];

    const allPatients = await Patient.find({ userId: user._id })
      .select('_id name lastName medicalCoverage')
      .lean() as any[];

    const patientById: Record<string, { name: string; obraSocial: string | null }> = {};
    for (const p of allPatients) {
      patientById[p._id.toString()] = {
        name: [p.name, p.lastName].filter(Boolean).join(' '),
        obraSocial: p.medicalCoverage?.name?.trim() || null,
      };
    }

    const allPatientIds = allPatients.map((p: any) => p._id);

    const profById: Record<string, any>   = {};
    const profByName: Record<string, any> = {};
    for (const p of professionals) {
      profById[p._id.toString()] = p;
      profByName[p.name.toLowerCase()] = p;
    }

    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = toDate;
    }

    const srQuery: any = { patientId: { $in: allPatientIds } };
    if (from || to) srQuery.date = dateFilter;
    const periodSRs = await (ServiceRecord as any).find(srQuery).sort({ date: 1 }).lean() as any[];

    const liqQuery: any = { userId: user._id };
    if (from || to) liqQuery.date = dateFilter;
    const periodLiquidations = await (ProfessionalLiquidation as any).find(liqQuery).sort({ date: 1 }).lean() as any[];

    const liqByProf: Record<string, any[]> = {};
    for (const liq of periodLiquidations) {
      const key = liq.professionalId.toString();
      if (!liqByProf[key]) liqByProf[key] = [];
      liqByProf[key].push({
        _id: liq._id.toString(),
        amount: liq.amount,
        date: liq.date,
        notes: liq.notes || null,
      });
    }

    const srsByProf: Record<string, any[]> = {};
    for (const sr of periodSRs) {
      let prof: any = null;
      if (sr.professionalId) prof = profById[sr.professionalId.toString()];
      if (!prof && sr.professional) prof = profByName[sr.professional.toLowerCase()];
      if (!prof) continue;

      const profKey = prof._id.toString();
      if (!srsByProf[profKey]) srsByProf[profKey] = [];

      const patientInfo = patientById[sr.patientId?.toString()] || null;
      const obraSocialName = patientInfo?.obraSocial || null;
      const effectivePct   = resolvePercentage(prof, obraSocialName);

      srsByProf[profKey].push({
        _id:          sr._id.toString(),
        date:         sr.date,
        patientId:    sr.patientId?.toString() || null,
        patientName:  patientInfo?.name || '—',
        obraSocial:   obraSocialName,
        service:      sr.service || '—',
        price:        sr.price || 0,
        paid:         sr.paid || 0,
        percentage:   effectivePct,
        gananciaProf: effectivePct !== null && effectivePct > 0
          ? Math.round(((sr.paid || 0) * effectivePct) / 100 * 100) / 100
          : null,
      });
    }

    const profKeys = new Set([
      ...Object.keys(srsByProf),
      ...Object.keys(liqByProf),
    ]);

    const result = Array.from(profKeys).map(profKey => {
      const prof = profById[profKey];
      if (!prof) return null;

      const srs          = srsByProf[profKey] || [];
      const liquidations = liqByProf[profKey] || [];

      const facturado  = srs.reduce((s: number, sr: any) => s + sr.price, 0);
      const cobrado    = srs.reduce((s: number, sr: any) => s + sr.paid, 0);
      const pendiente  = srs.reduce((s: number, sr: any) => s + Math.max(0, sr.price - sr.paid), 0);
      const atenciones = srs.length;
      const yaLiquidado = liquidations.reduce((s: number, l: any) => s + l.amount, 0);

      const liquidacionDisponible = srs.reduce((s: number, sr: any) => s + (sr.gananciaProf ?? 0), 0);
      const saldoALiquidar = Math.max(0, Math.round((liquidacionDisponible - yaLiquidado) * 100) / 100);

      // generic % used as estimate of professional total earnings when all SRs are paid
      const genericPct = prof.percentage ?? null;
      const totalGananciaProf = genericPct !== null && genericPct > 0
        ? Math.round((facturado * genericPct) / 100 * 100) / 100
        : liquidacionDisponible || null;

      const pendienteProfesional = totalGananciaProf !== null
        ? Math.max(0, Math.round((totalGananciaProf - yaLiquidado) * 100) / 100)
        : null;

      return {
        _id:                  profKey,
        name:                 prof.name,
        color:                prof.color || '#6366f1',
        percentage:           genericPct,
        atenciones,
        ingresos:             facturado,
        cobrado,
        pendiente,
        totalGananciaProf,
        pendienteProfesional,
        liquidacionDisponible,
        yaLiquidado,
        saldoALiquidar,
        gastos:               0,
        ganancia:             cobrado,
        liquidacion:          saldoALiquidar,
        serviceRecords:       srs,
        liquidations,
      };
    }).filter(Boolean).sort((a: any, b: any) => b.ingresos - a.ingresos);

    return NextResponse.json({ professionals: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
