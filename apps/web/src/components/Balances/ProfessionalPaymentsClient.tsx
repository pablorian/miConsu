'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DateRangeFilter from './DateRangeFilter';

interface ProfRow {
  _id: string;
  name: string;
  color: string;
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
  atenciones: number;
  percentage: number | null;
  liquidacion: number | null;
}

interface Liquidation {
  _id: string;
  amount: number;
  date: string;
  notes?: string;
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Liquidation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/professionals/${prof._id}/liquidations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.liquidations || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  }, [prof._id, from, to]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleSave = async () => {
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/professionals/${prof._id}/liquidations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          date,
          periodFrom: from,
          periodTo: to,
          notes: notes || undefined,
        }),
      });
      if (res.ok) {
        onSaved();
        fetchHistory();
        setAmount(0);
        setNotes('');
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (liquidationId: string) => {
    if (!confirm('¿Eliminar este pago registrado?')) return;
    setDeleting(liquidationId);
    try {
      const res = await fetch(`/api/professionals/${prof._id}/liquidations/${liquidationId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onSaved();
        fetchHistory();
      }
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const inputClass = 'w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: prof.color }}
              >
                {prof.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Liquidar a {prof.name}</h3>
                <p className="text-xs text-muted-foreground">Registrar pago al profesional</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1" title="Ganancia total del profesional (facturado × %)">Total ganancia</p>
              <p className="font-bold text-sm text-foreground">
                {prof.totalGananciaProf !== null ? formatARS(prof.totalGananciaProf) : '—'}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">Ya pagado</p>
              <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{formatARS(prof.yaLiquidado)}</p>
            </div>
            <div className={`rounded-xl p-3 ${prof.pendienteProfesional && prof.pendienteProfesional > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-violet-50 dark:bg-violet-900/20'}`}>
              <p className={`text-xs mb-1 ${prof.pendienteProfesional && prof.pendienteProfesional > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-violet-700 dark:text-violet-400'}`}>
                Pend. al prof.
              </p>
              <p className={`font-bold text-sm ${prof.pendienteProfesional && prof.pendienteProfesional > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {prof.pendienteProfesional !== null
                  ? (prof.pendienteProfesional > 0 ? formatARS(prof.pendienteProfesional) : '✓ Al día')
                  : '—'}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Monto a pagar</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className={inputClass + ' pl-7'}
                />
              </div>
              {prof.pendienteProfesional !== null && prof.pendienteProfesional > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(prof.pendienteProfesional!)}
                  className="mt-1 text-xs text-primary hover:underline"
                >
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
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej: Transferencia banco, efectivo..."
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !amount || amount <= 0}
            className="w-full py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 disabled:opacity-50 text-sm"
          >
            {saving ? 'Guardando...' : `Registrar pago de ${formatARS(amount || 0)}`}
          </button>

          {/* History */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Pagos registrados en el período
            </h4>
            {loadingHistory ? (
              <p className="text-xs text-muted-foreground text-center py-3">Cargando...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Sin pagos registrados en este período</p>
            ) : (
              <div className="space-y-2">
                {history.map(liq => (
                  <div key={liq._id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatARS(liq.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(liq.date).toLocaleDateString('es-AR')}
                        {liq.notes && <span className="ml-2 italic">{liq.notes}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(liq._id)}
                      disabled={deleting === liq._id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {deleting === liq._id ? '...' : 'Eliminar'}
                    </button>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 text-xs font-semibold">
                  <span className="text-muted-foreground">Total pagado</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatARS(history.reduce((s, l) => s + l.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; }
function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}
function getInitials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function ProfessionalPaymentsClient() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
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

  const totalFacturado = rows.reduce((s, r) => s + r.ingresos, 0);
  const totalCobrado = rows.reduce((s, r) => s + r.cobrado, 0);
  const totalYaLiquidado = rows.reduce((s, r) => s + r.yaLiquidado, 0);
  const totalDisponible = rows.reduce((s, r) => s + (r.liquidacionDisponible ?? 0), 0);
  const totalSaldo = rows.reduce((s, r) => s + (r.saldoALiquidar ?? 0), 0);
  // Pend. al profesional: what professionals are still owed overall (facturado*% - ya liquidado)
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
          <strong>A liquidar</strong> = lo que el paciente abonó × porcentaje del profesional.{' '}
          El <em>pendiente</em> muestra el saldo que el paciente aún debe — se liquidará cuando abone.
        </span>
      </div>

      {/* Summary cards */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total billed to patients */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Facturado</p>
            <p className="text-base font-bold text-foreground">{formatARS(totalFacturado)}</p>
          </div>
          {/* 2. Collected from patients */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Cobrado (pacientes)</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatARS(totalCobrado)}</p>
          </div>
          {/* 3. Available to pay right now (cobrado * % - ya liquidado) */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1" title="Cobrado × % del profesional, descontando lo ya pagado">Disp. a liquidar ahora</p>
            <p className="text-base font-bold text-violet-600 dark:text-violet-400">{formatARS(totalSaldo)}</p>
          </div>
          {/* 4. Already paid to professionals */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Ya liquidado</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{formatARS(totalYaLiquidado)}</p>
          </div>
          {/* 5. Pending owed to professionals overall (facturado*% - ya liquidado) */}
          <div className={`rounded-xl p-3 border ${totalPendienteProf > 0 ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800'}`}>
            <p className={`text-xs mb-1 ${totalPendienteProf > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}
               title="Lo que el consultorio aún le debe al profesional (facturado × % − ya liquidado)">
              Pend. al profesional
            </p>
            <p className={`text-base font-bold ${totalPendienteProf > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {totalPendienteProf > 0 ? formatARS(totalPendienteProf) : '✓ Al día'}
            </p>
          </div>
          {/* 6. Total earned by professionals when all patients pay (facturado * %) */}
          <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1" title="Ganancia total del profesional al cobrar todas las prestaciones">Total ganancia prof.</p>
            <p className="text-base font-bold text-foreground">{formatARS(rows.reduce((s, r) => s + (r.totalGananciaProf ?? 0), 0))}</p>
          </div>
        </div>
      )}

      {/* Note if no professionals configured */}
      {!loading && rows.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl px-5 py-4 text-sm text-amber-700 dark:text-amber-400">
          Sin datos. Asegurate de tener{' '}
          <Link href="/dashboard/settings/professionals" className="font-semibold underline">profesionales configurados</Link>
          {' '}y prestaciones registradas en el período.
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">Sin datos en el período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Profesional</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Prest.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Facturado</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span title="Lo que el paciente abonó" className="cursor-help">Cobrado ⓘ</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">% Liq.</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span title="Cobrado × % (total disponible para pagar al profesional)" className="cursor-help">Disp. liquidar ⓘ</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span title="Pagos ya registrados al profesional en este período" className="cursor-help">Ya pagado ⓘ</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span title="Lo que queda por pagar al profesional" className="cursor-help">Saldo ⓘ</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: r.color }}
                        >
                          {getInitials(r.name)}
                        </div>
                        <span className="font-medium text-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{r.atenciones}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatARS(r.ingresos)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatARS(r.cobrado)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.percentage !== null ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                          {r.percentage}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-violet-600 dark:text-violet-400 font-medium">
                        {r.liquidacionDisponible !== null ? formatARS(r.liquidacionDisponible) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.yaLiquidado > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">{formatARS(r.yaLiquidado)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {r.saldoALiquidar !== null ? (
                        r.saldoALiquidar > 0
                          ? <span className="text-violet-700 dark:text-violet-400">{formatARS(r.saldoALiquidar)}</span>
                          : <span className="text-emerald-600 text-xs">✓ Al día</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.saldoALiquidar !== null && (
                        <button
                          onClick={() => setModalProf(r)}
                          className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition whitespace-nowrap"
                        >
                          Liquidar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-zinc-800/30">
                  <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{rows.reduce((s, r) => s + r.atenciones, 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{formatARS(totalFacturado)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatARS(totalCobrado)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-right font-semibold text-violet-600 dark:text-violet-400">{formatARS(totalDisponible)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">{formatARS(totalYaLiquidado)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-violet-700 dark:text-violet-400">{formatARS(totalSaldo)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        El porcentaje de liquidación se configura en{' '}
        <Link href="/dashboard/settings/professionals" className="text-primary hover:underline">Configuración › Profesionales</Link>.
        {' '}<strong>Cobrado</strong> = suma de pagos de pacientes.{' '}
        <strong>Disp. liquidar</strong> = Cobrado × %.{' '}
        <strong>Saldo</strong> = lo que queda por pagar al profesional.
      </p>

      {/* Liquidation Modal */}
      {modalProf && (
        <LiquidationModal
          prof={modalProf}
          from={from}
          to={to}
          onClose={() => setModalProf(null)}
          onSaved={() => { fetchData(); }}
        />
      )}
    </div>
  );
}
