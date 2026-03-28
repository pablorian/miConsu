'use client';

import { useState, useEffect, useCallback } from 'react';
import DateRangeFilter from './DateRangeFilter';
import BarChart from './BarChart';

interface KPIs { totalPatients: number; newPatients: number; activePatients: number; totalAppointments: number; }
interface ProfData { professional: string; count: number; ingresos: number; }
interface MonthlyPoint { label: string; count: number; ingresos: number; }

function todayStr() { return new Date().toISOString().split('T')[0]; }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; }
function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function PerformanceClient() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({ totalPatients: 0, newPatients: 0, activePatients: 0, totalAppointments: 0 });
  const [byProfessional, setByProfessional] = useState<ProfData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/balances/performance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setByProfessional(data.byProfessional || []);
        setMonthly(data.monthlyChart || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const profBarData = byProfessional.map((p, i) => ({
    label: p.professional,
    value: p.count,
    color: COLORS[i % COLORS.length],
  }));

  const monthlyBarData = monthly.map((m, i) => ({
    label: m.label,
    value: m.ingresos,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Rendimiento</h1>
        <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Turnos totales" value={kpis.totalAppointments} sub="en el período" />
            <KpiCard label="Total pacientes" value={kpis.totalPatients} sub="registrados" />
            <KpiCard label="Pacientes activos" value={kpis.activePatients} sub="anteriores al período" />
            <KpiCard label="Pacientes nuevos" value={kpis.newPatients} sub="en el período" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Atenciones por profesional */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Atenciones por profesional</h2>
              {profBarData.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Sin datos de prestaciones</div>
              ) : (
                <BarChart horizontal data={profBarData} formatValue={v => `${v} aten.`} />
              )}
            </div>

            {/* Tipos de paciente */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Distribución de pacientes</h2>
              <div className="space-y-3 mt-6">
                {[
                  { label: 'Pacientes activos (anteriores)', value: kpis.activePatients, color: '#6366f1' },
                  { label: 'Pacientes nuevos', value: kpis.newPatients, color: '#10b981' },
                ].map(item => {
                  const total = kpis.activePatients + kpis.newPatients || 1;
                  const pct = Math.round((item.value / total) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{item.value} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Monthly chart */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Ingresos mensuales (últimos 12 meses)</h2>
            {monthlyBarData.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Sin datos de prestaciones</div>
            ) : (
              <BarChart data={monthlyBarData} formatValue={v => `$${(v / 1000).toFixed(0)}k`} />
            )}
          </div>

          {/* Professional breakdown table */}
          {byProfessional.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-foreground">Desglose por profesional</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['Profesional', 'Atenciones', 'Ingresos'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {byProfessional.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                            {p.professional.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{p.professional}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.count}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{formatARS(p.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
