'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DateRangeFilter from './DateRangeFilter';

interface ServiceRecordRow {
  _id: string;
  date: string;
  patientId: string | null;
  patientName: string;
  obraSocial: string | null;
  service: string;
  price: number;
  paid: number;
  percentage: number | null;
  gananciaProf: number | null;
}

interface LiquidationRow {
  _id: string;
  amount: number;
  date: string;
  notes: string | null;
}

interface ProfRow {
  _id: string;
  name: string;
  color: string;
  percentage: number | null;
  atenciones: number;
  ingresos: number;
  cobrado: number;
  pendiente: number;
  totalGananciaProf: number | null;
  pendienteProfesional: number | null;
  liquidacionDisponible: number | null;
  yaLiquidado: number;
  saldoALiquidar: number | null;
  gastos: number;
  ganancia: number;
  liquidacion: number | null;
  serviceRecords: ServiceRecordRow[];
  liquidations: LiquidationRow[];
}

interface LiquidationModalProps {
  prof: ProfRow;
  from: string;
  to: string;
  onClose: () => void;
  onSaved: () => void;
}

function LiquidationModal({ prof, from, to, onClose, onSaved }: LiquidationModalProps) {
  const [amount, setAmount] = useState<number>(prof.pendienteProfesional ?? prof.saldoALiquidar ?? 0);
  const [date, setDate]   = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSave = async () => {
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/professionals/${prof._id}/liquidations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date, periodFrom: from, periodTo: to, notes: notes || undefined }),
      });
      if (res.ok) { onSaved(); onClose(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (liquidationId: string) => {
    if (!confirm('¿Eliminar este pago registrado?')) return;
    setDeleting(liquidationId);
    try {
      const res = await fetch(`/api/professionals/${prof._id}/liquidations/${liquidationId}`, { method: 'DELETE' });
      if (res.ok) onSaved();
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const inputClass = 'w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: prof.color }}>
                {getInitials(prof.name)}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Liquidar a {prof.name}</h3>
                <p className="text-xs text-muted-foreground">Registrar pago al profesional</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Total ganancia</p>
              <p className="font-bold text-sm text-foreground">{prof.totalGananciaProf !== null ? formatARS(prof.totalGananciaProf) : '—'}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">Ya pagado</p>
              <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{formatARS(prof.yaLiquidado)}</p>
            </div>
            <div className={`rounded-xl p-3 ${prof.pendienteProfesional && prof.pendienteProfesional > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-violet-50 dark:bg-violet-900/20'}`}>
              <p className={`text-xs mb-1 ${prof.pendienteProfesional && prof.pendienteProfesional > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-violet-700 dark:text-violet-400'}`}>Pend. al prof.</p>
              <p className={`font-bold text-sm ${prof.pendienteProfesional && prof.pendienteProfesional > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {prof.pendienteProfesional !== null ? (prof.pendienteProfesional > 0 ? formatARS(prof.pendienteProfesional) : '✓ Al día') : '—'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Monto a pagar</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} min="0" step="0.01" className={inputClass + ' pl-7'} />
              </div>
              {prof.pendienteProfesional !== null && prof.pendienteProfesional > 0 && (
                <button type="button" onClick={() => setAmount(prof.pendienteProfesional!)} className="mt-1 text-xs text-primary hover:underline">
                  Pagar pendiente completo ({formatARS(prof.pendienteProfesional)})
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha del pago</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notas (opcional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Transferencia banco, efectivo..." className={inputClass} />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !amount || amount <= 0} className="w-full py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 text-sm">
            {saving ? 'Guardando...' : `Registrar pago de ${formatARS(amount || 0)}`}
          </button>

          {prof.liquidations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pagos registrados en el período</h4>
              <div className="space-y-2">
                {prof.liquidations.map(liq => (
                  <div key={liq._id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatARS(liq.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(liq.date)}
                        {liq.notes && <span className="ml-2 italic">{liq.notes}</span>}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(liq._id)} disabled={deleting === liq._id} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
                      {deleting === liq._id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayStr()    { return new Date().toISOString().split('T')[0]; }
function firstOfMonth(){ const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; }
function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}
function getInitials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// ─── ProfCard ────────────────────────────────────────────────────────────────

type TableRow =
  | { kind: 'sr';  data: ServiceRecordRow }
  | { kind: 'liq'; data: LiquidationRow   };

function ProfCard({ prof, onLiquidar }: { prof: ProfRow; onLiquidar: (p: ProfRow) => void }) {
  const [expanded, setExpanded] = useState(true);

  const hasSaldo = prof.saldoALiquidar !== null && prof.saldoALiquidar > 0;
  const hasGanancia = prof.serviceRecords.some(sr => sr.percentage !== null);

  // Merge prestaciones + pagos sorted by date
  const merged: TableRow[] = [
    ...prof.serviceRecords.map(sr  => ({ kind: 'sr'  as const, data: sr  })),
    ...prof.liquidations.map(  liq => ({ kind: 'liq' as const, data: liq })),
  ].sort((a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime());

  // Total cols: Fecha | Paciente | Obra social | Prestación | Facturado | Cobrado | % | Ganancia prof. | Pago
  // = 9 columns (% and Ganancia only if hasGanancia)
  const colSpanMiddle = hasGanancia ? 6 : 4; // for the "pago" row spanning

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: prof.color }}>
          {getInitials(prof.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{prof.name}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{prof.atenciones} prestación{prof.atenciones !== 1 ? 'es' : ''}</span>
            {prof.percentage !== null && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                {prof.percentage}% genérico
              </span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="hidden sm:flex items-center gap-4 text-right">
          <div>
            <p className="text-xs text-muted-foreground">Facturado</p>
            <p className="text-sm font-semibold text-foreground">{formatARS(prof.ingresos)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cobrado</p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatARS(prof.cobrado)}</p>
          </div>
          {hasGanancia && (
            <div>
              <p className="text-xs text-muted-foreground">Ganancia prof.</p>
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">{formatARS(prof.liquidacionDisponible ?? 0)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`text-sm font-bold ${hasSaldo ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {hasSaldo ? formatARS(prof.saldoALiquidar!) : '✓ Al día'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onLiquidar(prof)} className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition whitespace-nowrap">
            Liquidar
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title={expanded ? 'Colapsar' : 'Expandir'}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          {merged.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">Sin movimientos en el período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-zinc-800/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Paciente</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Obra social</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Prestación</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Facturado</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Cobrado</th>
                  {hasGanancia && <>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">%</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Ganancia prof.</th>
                  </>}
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">Pago prof.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {merged.map((row, i) => {
                  if (row.kind === 'liq') {
                    const liq = row.data;
                    return (
                      <tr key={`liq-${liq._id}`} className="bg-emerald-50/40 dark:bg-emerald-900/10">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(liq.date)}</td>
                        <td className="px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-400 italic" colSpan={colSpanMiddle}>
                          Pago registrado al profesional{liq.notes ? ` · ${liq.notes}` : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatARS(liq.amount)}
                        </td>
                      </tr>
                    );
                  }

                  const sr = row.data;
                  return (
                    <tr key={`sr-${sr._id}`} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(sr.date)}</td>
                      <td className="px-4 py-2.5">
                        {sr.patientId ? (
                          <Link href={`/dashboard/patients/${sr.patientId}`} className="text-sm text-foreground hover:text-primary hover:underline transition-colors">
                            {sr.patientName}
                          </Link>
                        ) : (
                          <span className="text-sm text-foreground">{sr.patientName}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {sr.obraSocial || <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-foreground">{sr.service}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-foreground">{formatARS(sr.price)}</td>
                      <td className="px-4 py-2.5 text-right text-sm">
                        <span className={sr.paid >= sr.price ? 'text-emerald-600 dark:text-emerald-400' : sr.paid > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/50'}>
                          {formatARS(sr.paid)}
                        </span>
                      </td>
                      {hasGanancia && <>
                        <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                          {sr.percentage !== null ? `${sr.percentage}%` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-violet-600 dark:text-violet-400">
                          {sr.gananciaProf !== null ? formatARS(sr.gananciaProf) : '—'}
                        </td>
                      </>}
                      <td className="px-4 py-2.5 text-right text-sm text-muted-foreground/30">—</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-zinc-800/30 font-semibold">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground" colSpan={4}>Total</td>
                  <td className="px-4 py-2.5 text-right text-sm text-foreground">{formatARS(prof.ingresos)}</td>
                  <td className="px-4 py-2.5 text-right text-sm text-emerald-600 dark:text-emerald-400">{formatARS(prof.cobrado)}</td>
                  {hasGanancia && <>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-right text-sm text-violet-600 dark:text-violet-400">{formatARS(prof.liquidacionDisponible ?? 0)}</td>
                  </>}
                  <td className="px-4 py-2.5 text-right text-sm text-emerald-600 dark:text-emerald-400">
                    {prof.yaLiquidado > 0 ? formatARS(prof.yaLiquidado) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ProfessionalPaymentsClient() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to,   setTo]   = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProfRow[]>([]);
  const [modalProf, setModalProf] = useState<ProfRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/balances/professionalPayments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.professionals || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalFacturado   = rows.reduce((s, r) => s + r.ingresos, 0);
  const totalCobrado     = rows.reduce((s, r) => s + r.cobrado, 0);
  const totalYaLiquidado = rows.reduce((s, r) => s + r.yaLiquidado, 0);
  const totalSaldo       = rows.reduce((s, r) => s + (r.saldoALiquidar ?? 0), 0);
  const totalPendienteProf = rows.reduce((s, r) => s + (r.pendienteProfesional ?? 0), 0);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Liquidación a profesionales</h1>
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl text-sm text-blue-700 dark:text-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>
          <strong>Ganancia prof.</strong> = cobrado × porcentaje del profesional.{' '}
          El <em>saldo</em> descuenta los pagos ya registrados en el período.
        </span>
      </div>

      {/* Global summary */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Facturado total</p>
            <p className="text-base font-bold text-foreground">{formatARS(totalFacturado)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Cobrado (pacientes)</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatARS(totalCobrado)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Disp. a liquidar</p>
            <p className="text-base font-bold text-violet-600 dark:text-violet-400">{formatARS(totalSaldo)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Ya liquidado</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{formatARS(totalYaLiquidado)}</p>
          </div>
          <div className={`rounded-xl p-3 border ${totalPendienteProf > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800'}`}>
            <p className={`text-xs mb-1 ${totalPendienteProf > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>Pend. al profesional</p>
            <p className={`text-base font-bold ${totalPendienteProf > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {totalPendienteProf > 0 ? formatARS(totalPendienteProf) : '✓ Al día'}
            </p>
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl px-5 py-4 text-sm text-amber-700 dark:text-amber-400">
          Sin datos. Asegurate de tener{' '}
          <Link href="/dashboard/settings/professionals" className="font-semibold underline">profesionales configurados</Link>
          {' '}y prestaciones registradas en el período.
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(prof => (
            <ProfCard key={prof._id} prof={prof} onLiquidar={p => setModalProf(p)} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        El porcentaje de liquidación se configura en{' '}
        <Link href="/dashboard/settings/professionals" className="text-primary hover:underline">Configuración › Profesionales</Link>.
        {' '}<strong>Cobrado</strong> = suma de pagos de pacientes.{' '}
        <strong>Ganancia prof.</strong> = Cobrado × %.{' '}
        <strong>Saldo</strong> = lo que queda por pagar al profesional.
      </p>

      {modalProf && (
        <LiquidationModal
          prof={modalProf}
          from={from}
          to={to}
          onClose={() => setModalProf(null)}
          onSaved={() => { fetchData(); setModalProf(null); }}
        />
      )}
    </div>
  );
}
