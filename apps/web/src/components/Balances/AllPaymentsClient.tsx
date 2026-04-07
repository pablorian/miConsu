'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DateRangeFilter from './DateRangeFilter';
import LineChart from './LineChart';

interface Professional { _id: string; name: string; color?: string; }
interface PaymentRow {
  _id: string; date: string; amount: number; paymentMethod: string;
  currency: string; concept: string; patientId?: string | null;
  patientName: string; professionalName: string | null;
  professionalColor: string | null; isIncome: boolean;
  source: 'payment' | 'serviceRecord' | 'liquidation' | 'generic';
  category?: string | null;
}
interface ChartPoint { date: string; ingresos: number; egresos: number; }
interface IngresoProf { name: string; color: string; facturado: number; cobrado: number; }
interface Totals {
  ingresos: number; egresos: number; ganancia: number;
  ingresosPayments: number; ingresosPrestaciones: number;
  ingresosGenericos: number; egresosGenericos: number;
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; }

export default function AllPaymentsClient({ professionals }: { professionals: Professional[] }) {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [profFilter, setProfFilter] = useState('Todos');
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [totals, setTotals] = useState<Totals>({ ingresos: 0, egresos: 0, ganancia: 0, ingresosPayments: 0, ingresosPrestaciones: 0, ingresosGenericos: 0, egresosGenericos: 0 });
  const [ingresosPorProf, setIngresosPorProf] = useState<IngresoProf[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (profFilter !== 'Todos') params.set('professional', profFilter);
      const res = await fetch(`/api/balances/allPayments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments || []);
        setChartData(data.chartData || []);
        setTotals(data.totals || { ingresos: 0, egresos: 0, ganancia: 0 });
        setIngresosPorProf(data.ingresosPorProf || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to, profFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectClass = 'px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

  // Max value for bar chart normalization
  const maxFacturado = Math.max(...ingresosPorProf.map(p => p.facturado), 1);

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Todos los pagos</h1>
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Profesional</label>
          <select value={profFilter} onChange={e => setProfFilter(e.target.value)} className={selectClass}>
            <option>Todos</option>
            {professionals.map(p => <option key={p._id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Evolución de ingresos y egresos</h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <LineChart data={chartData} />
        )}
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ingresos por profesional */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Ingresos por profesional</h2>
          {loading ? (
            <div className="text-xs text-muted-foreground py-4 text-center">Cargando...</div>
          ) : ingresosPorProf.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              Sin prestaciones en el período.{' '}
              <Link href="/dashboard/settings/professionals" className="text-primary hover:underline">Configurar profesionales</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ingresosPorProf.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="font-medium text-foreground">{p.name}</span>
                    </div>
                    <div className="flex gap-3 text-right">
                      <span className="text-muted-foreground">Fact. {formatARS(p.facturado)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Cob. {formatARS(p.cobrado)}</span>
                    </div>
                  </div>
                  {/* Bar: facturado (light) + cobrado (filled) */}
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(p.cobrado / maxFacturado) * 100}%`,
                        backgroundColor: p.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingresos/Egresos totales */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Ingresos/Egresos totales</h2>
          <div className="space-y-3">
            {/* Ingresos con desglose */}
            <div className="px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Ingresos</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatARS(totals.ingresos)}</span>
              </div>
              {(totals.ingresosPayments > 0 || totals.ingresosPrestaciones > 0 || totals.ingresosGenericos > 0) && (
                <div className="mt-2 space-y-1 border-t border-blue-100 dark:border-blue-800/40 pt-2">
                  {totals.ingresosPrestaciones > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground/70">
                      <span>· Prestaciones cobradas</span>
                      <span>{formatARS(totals.ingresosPrestaciones)}</span>
                    </div>
                  )}
                  {totals.ingresosPayments > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground/70">
                      <span>· Pagos a cuenta</span>
                      <span>{formatARS(totals.ingresosPayments)}</span>
                    </div>
                  )}
                  {totals.ingresosGenericos > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground/70">
                      <span>· Otros ingresos</span>
                      <span>{formatARS(totals.ingresosGenericos)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Egresos</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatARS(totals.egresos)}</span>
              </div>
              {totals.egresosGenericos > 0 && (
                <div className="mt-2 space-y-1 border-t border-red-100 dark:border-red-800/40 pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground/70">
                    <span>· Liquidaciones a profesionales</span>
                    <span>{formatARS(totals.egresos - totals.egresosGenericos)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground/70">
                    <span>· Otros egresos</span>
                    <span>{formatARS(totals.egresosGenericos)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${totals.ganancia >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`} title="Ingresos − Egresos">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Ganancia neta</span>
                <p className="text-xs text-muted-foreground/60">Ingresos − Egresos</p>
              </div>
              <span className={`text-sm font-bold ${totals.ganancia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>{formatARS(totals.ganancia)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-foreground">Detalle de movimientos</h2>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : payments.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">Sin movimientos en el período seleccionado.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['I/E', 'Método', 'Fecha', 'Monto', 'Paciente / Profesional', 'Detalle'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                    <th className="w-12 px-4 py-3"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {payments.map(p => (
                    <tr key={`${p.source}-${p._id}`} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${p.isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                          {p.isIncome ? '↑' : '↓'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.source === 'serviceRecord' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">prestación</span>
                        ) : p.source === 'generic' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            {(p as any).category || 'general'}
                          </span>
                        ) : (
                          <span className="capitalize text-sm">{p.paymentMethod}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(p.date), 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className={`px-4 py-3 font-medium whitespace-nowrap ${p.isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {p.isIncome ? '+' : '-'} {formatARS(p.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-foreground">{p.patientName !== '—' ? p.patientName : ''}</span>
                          {p.professionalName && (
                            <div className="flex items-center gap-1.5">
                              {p.professionalColor && (
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.professionalColor }} />
                              )}
                              <span className="text-xs text-muted-foreground">{p.professionalName}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{p.concept}</td>
                      <td className="px-4 py-3">
                        {p.patientId && (
                          <Link href={`/dashboard/patients/${p.patientId}`} className="text-xs text-primary hover:underline whitespace-nowrap">
                            Ver paciente
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground bg-gray-50/50 dark:bg-zinc-800/30">
              {payments.length} {payments.length === 1 ? 'movimiento' : 'movimientos'} —{' '}
              <span className="text-emerald-600">{payments.filter(p => p.isIncome && p.source === 'serviceRecord').length} prestaciones</span>
              {' · '}
              <span className="text-emerald-600">{payments.filter(p => p.isIncome && p.source === 'payment').length} pagos a cuenta</span>
              {' · '}
              <span className="text-red-500">{payments.filter(p => !p.isIncome).length} egresos</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
