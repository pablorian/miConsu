'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

type RecurrenceType = 'once' | 'weekly' | 'biweekly' | 'monthly';

interface BookingEntry {
  _id: string;
  consultorioName?: string;
  professionalName?: string;
  startTime: string;
  endTime: string;
  recurrenceType: RecurrenceType;
  daysOfWeek: number[];
  monthlyPrice: number;
}

interface ProfessionalGroup {
  name: string;
  professionalId: string | null;
  total: number;
  bookings: BookingEntry[];
}

interface ConsultorioGroup {
  name: string;
  consultorioId: string;
  color: string;
  total: number;
  bookings: BookingEntry[];
}

interface RentalData {
  month: string;
  total: number;
  byProfessional: ProfessionalGroup[];
  byConsultorio: ConsultorioGroup[];
}

const recurrenceLabel: Record<RecurrenceType, string> = {
  once:     'Una vez',
  weekly:   'Semanal',
  biweekly: 'Quincenal',
  monthly:  'Mensual',
};

const dowNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function RecurrenceTag({ type, dows }: { type: RecurrenceType; dows: number[] }) {
  if (type === 'once') return null;
  const days = dows.map(d => dowNames[d]).join(', ');
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
      {recurrenceLabel[type]}{days ? ` · ${days}` : ''}
    </span>
  );
}

function MonthNavigator({ current, onChange }: { current: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(subMonths(current, 1))} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-sm font-semibold text-foreground min-w-[140px] text-center capitalize">
        {format(current, "MMMM yyyy", { locale: es })}
      </span>
      <button onClick={() => onChange(addMonths(current, 1))} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export default function RentalIncomePage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [data, setData] = useState<RentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'professional' | 'consultorio'>('professional');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const monthParam = format(currentMonth, 'yyyy-MM');
    setLoading(true);
    fetch(`/api/balances/rental-income?month=${monthParam}`)
      .then(r => r.json())
      .then(d => { setData(d); setExpanded(new Set()); })
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groups = groupBy === 'professional'
    ? (data?.byProfessional || [])
    : (data?.byConsultorio || []);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/balances" className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Ingresos por alquileres</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Ingresos mensuales por alquiler de consultorios</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <MonthNavigator current={currentMonth} onChange={setCurrentMonth} />
        {/* Group by toggle */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
          <button
            onClick={() => setGroupBy('professional')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${groupBy === 'professional' ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Por profesional
          </button>
          <button
            onClick={() => setGroupBy('consultorio')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${groupBy === 'consultorio' ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Por consultorio
          </button>
        </div>
      </div>

      {/* Total card */}
      {data && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total del mes</p>
            <p className="text-2xl font-bold text-foreground mt-1">${data.total.toFixed(0)}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
        </div>
      )}

      {/* Groups */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Cargando…</div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18" />
          </svg>
          <p className="text-sm font-medium text-foreground">Sin ingresos en este mes</p>
          <p className="text-xs text-muted-foreground mt-1">No hay reservas activas con precio en este período.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g: any) => {
            const key = g.professionalId ?? g.consultorioId ?? g.name;
            const isOpen = expanded.has(key);
            const pct = data ? Math.round((g.total / data.total) * 100) : 0;
            return (
              <div key={key} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                >
                  {groupBy === 'consultorio' && (
                    <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: (g as ConsultorioGroup).color }} />
                  )}
                  {groupBy === 'professional' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{g.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {/* Progress bar */}
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden max-w-[120px]">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{pct}% del total</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-foreground">${g.total.toFixed(0)}</p>
                    <p className="text-[11px] text-muted-foreground">{g.bookings.length} reserva{g.bookings.length !== 1 ? 's' : ''}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded bookings */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800/50">
                    {g.bookings.map((b: BookingEntry) => (
                      <div key={b._id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-medium text-foreground">
                              {groupBy === 'professional' ? b.consultorioName : b.professionalName}
                            </p>
                            <RecurrenceTag type={b.recurrenceType} dows={b.daysOfWeek} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{b.startTime} – {b.endTime}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground shrink-0">${b.monthlyPrice.toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
