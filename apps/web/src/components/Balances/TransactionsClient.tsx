'use client';

import { useState, useEffect, useCallback } from 'react';
import DateRangeFilter from './DateRangeFilter';

interface Transaction {
  _id: string;
  type: 'ingreso' | 'egreso';
  date: string;
  amount: number;
  concept: string;
  category?: string;
  paymentMethod?: string;
  notes?: string;
}

const CATEGORIES = [
  'Alquiler', 'Servicios', 'Agua', 'Luz', 'Gas', 'Internet', 'Teléfono',
  'Limpieza', 'Mantenimiento', 'Suministros', 'Impuestos', 'Seguros',
  'Marketing', 'Software', 'Equipamiento', 'Capacitación', 'Honorarios',
  'Otro ingreso', 'Otro egreso',
];

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Cheque', 'Otro'];

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}
function todayStr()    { return new Date().toISOString().split('T')[0]; }
function firstOfMonth(){ const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const emptyForm = () => ({
  type:          'egreso' as 'ingreso' | 'egreso',
  date:          todayStr(),
  amount:        '',
  concept:       '',
  category:      '',
  paymentMethod: '',
  notes:         '',
});

interface FormProps {
  initial?: Partial<Transaction>;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function TransactionForm({ initial, onSave, onCancel, saving }: FormProps) {
  const [form, setForm] = useState({
    type:          (initial?.type ?? 'egreso') as 'ingreso' | 'egreso',
    date:          initial?.date ? initial.date.split('T')[0] : todayStr(),
    amount:        initial?.amount?.toString() ?? '',
    concept:       initial?.concept ?? '',
    category:      initial?.category ?? '',
    paymentMethod: initial?.paymentMethod ?? '',
    notes:         initial?.notes ?? '',
  });

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary';
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

  const valid = form.concept.trim() && Number(form.amount) > 0;

  return (
    <div className="space-y-4">
      {/* Type toggle */}
      <div>
        <label className={labelClass}>Tipo</label>
        <div className="flex gap-2">
          {(['ingreso', 'egreso'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm(f => ({ ...f, type: t }))}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                form.type === t
                  ? t === 'ingreso'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-red-500 border-red-500 text-white'
                  : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Fecha</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Monto <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
            <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} min="0" step="1" placeholder="0" className={inputClass + ' pl-7'} />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Concepto <span className="text-red-500">*</span></label>
        <input type="text" value={form.concept} onChange={e => setForm(f => ({ ...f, concept: e.target.value }))} placeholder="Ej: Pago agua bimestral" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Categoría</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputClass}>
            <option value="">Sin categoría</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Método de pago</label>
          <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className={inputClass}>
            <option value="">—</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Notas (opcional)</label>
        <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Información adicional..." className={inputClass} />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave({ ...form, amount: Number(form.amount) })}
          disabled={saving || !valid}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

export default function TransactionsClient() {
  const [from, setFrom]           = useState(firstOfMonth());
  const [to, setTo]               = useState(todayStr());
  const [transactions, setTx]     = useState<Transaction[]>([]);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'todos' | 'ingreso' | 'egreso'>('todos');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/transactions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTx(data.transactions || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (data: any) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al crear');
      await fetchData();
      setShowForm(false);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: string, data: any) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al actualizar');
      await fetchData();
      setEditingId(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, concept: string) => {
    if (!confirm(`¿Eliminar "${concept}"?`)) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchData();
    } catch (e: any) { setError(e.message); }
  };

  const filtered = transactions.filter(t => typeFilter === 'todos' || t.type === typeFilter);
  const totalIngresos = transactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const totalEgresos  = transactions.filter(t => t.type === 'egreso').reduce((s, t) => s + t.amount, 0);
  const balance       = totalIngresos - totalEgresos;

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Otros ingresos y egresos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Gastos operativos, pagos de servicios e ingresos adicionales.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangeFilter from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setError(null); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatARS(totalIngresos)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Egresos</p>
          <p className="text-lg font-bold text-red-500 dark:text-red-400">{formatARS(totalEgresos)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${balance >= 0 ? 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-gray-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40'}`}>
          <p className="text-xs text-muted-foreground mb-1">Balance neto</p>
          <p className={`text-lg font-bold ${balance >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>{formatARS(balance)}</p>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>
      )}

      {/* New transaction form */}
      {showForm && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Nuevo movimiento</p>
          <TransactionForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {/* Table header with filter */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-semibold text-foreground">Movimientos</p>
          <div className="flex gap-1">
            {(['todos', 'ingreso', 'egreso'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  typeFilter === f
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : 'Egresos'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            <p className="text-sm text-muted-foreground">Sin movimientos en el período.</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-primary hover:underline">Agregar el primero</button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map(tx => (
                <div key={tx._id}>
                  {editingId === tx._id ? (
                    <div className="p-5 bg-gray-50/50 dark:bg-zinc-800/30">
                      <p className="text-sm font-medium text-foreground mb-3">Editar movimiento</p>
                      <TransactionForm
                        initial={tx}
                        onSave={(data) => handleUpdate(tx._id, data)}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors group">
                      {/* Type indicator */}
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold flex-shrink-0 ${
                        tx.type === 'ingreso'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {tx.type === 'ingreso' ? '↑' : '↓'}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{tx.concept}</p>
                          {tx.category && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-zinc-800 text-muted-foreground">
                              {tx.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmtDate(tx.date)}
                          {tx.paymentMethod && <span className="ml-2">· {tx.paymentMethod}</span>}
                          {tx.notes && <span className="ml-2 italic">· {tx.notes}</span>}
                        </p>
                      </div>

                      {/* Amount */}
                      <p className={`text-sm font-semibold flex-shrink-0 ${
                        tx.type === 'ingreso' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {tx.type === 'ingreso' ? '+' : '-'} {formatARS(tx.amount)}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => { setEditingId(tx._id); setShowForm(false); setError(null); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(tx._id, tx.concept)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground bg-gray-50/50 dark:bg-zinc-800/30">
              {filtered.length} {filtered.length === 1 ? 'movimiento' : 'movimientos'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
