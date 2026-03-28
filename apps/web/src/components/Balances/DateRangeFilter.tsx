'use client';

import { useState } from 'react';

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

function toDateInput(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    onChange(toDateInput(first), toDateInput(last));
  };

  const setLastMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    onChange(toDateInput(first), toDateInput(last));
  };

  const setThisYear = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), 0, 1);
    const last = new Date(now.getFullYear(), 11, 31);
    onChange(toDateInput(first), toDateInput(last));
  };

  const inputClass = 'px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary';
  const btnClass = 'px-3 py-2 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-muted-foreground hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-foreground transition-colors';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Desde</label>
        <input type="date" value={from} onChange={e => onChange(e.target.value, to)} className={inputClass} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">Hasta</label>
        <input type="date" value={to} onChange={e => onChange(from, e.target.value)} className={inputClass} />
      </div>
      <button type="button" onClick={setThisMonth} className={btnClass}>Este mes</button>
      <button type="button" onClick={setLastMonth} className={btnClass}>Mes anterior</button>
      <button type="button" onClick={setThisYear} className={btnClass}>Este año</button>
    </div>
  );
}
