'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DateRangeFilter from './DateRangeFilter';

interface DebtRow { patientId: string; patientName: string; costoTotal: number; pagado: number; deuda: number; }

function todayStr() { return new Date().toISOString().split('T')[0]; }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; }
function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
}

export default function PatientDebtsClient() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DebtRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/balances/patientDebts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.patients || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalDeuda = rows.reduce((s, r) => s + r.deuda, 0);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Pacientes deudores</h1>
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {/* Summary card */}
      {rows.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Deuda total pendiente</p>
            <p className="text-xs text-muted-foreground mt-0.5">{rows.length} {rows.length === 1 ? 'paciente con saldo pendiente' : 'pacientes con saldo pendiente'}</p>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatARS(totalDeuda)}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-foreground">Detalle de pagos</h2>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p className="text-muted-foreground text-sm">Sin información · No hay pacientes con deuda en este período.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['Paciente', 'Costo Total', 'Pagado', 'Deuda'].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide ${h === 'Paciente' ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                    <th className="w-20 px-4 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {rows.map(r => (
                    <tr key={r.patientId} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{r.patientName}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatARS(r.costoTotal)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatARS(r.pagado)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">{formatARS(r.deuda)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/patients/${r.patientId}?tab=billetera`} className="text-xs text-primary hover:underline whitespace-nowrap">
                          Ver billetera
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-zinc-800/30">
                    <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatARS(rows.reduce((s, r) => s + r.costoTotal, 0))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatARS(rows.reduce((s, r) => s + r.pagado, 0))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">{formatARS(totalDeuda)}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
