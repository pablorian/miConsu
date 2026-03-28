'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkingDay {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface ServiceType {
  id: string;
  name: string;
  description?: string;
  durationMinutes?: number;
  color?: string;
  // legacy field — kept for backward compat but no longer used in UI
  googleScheduleId?: string;
}

interface Consultorio {
  _id: string;
  name: string;
  description?: string;
  hourlyRate?: number;
  color: string;
  googleCalendarId?: string;
  bookingEnabled?: boolean;
  publicSlug?: string;
  bookingTitle?: string;
  slotDurationMinutes?: number;
  workingHours?: Record<string, WorkingDay>;
  maxAdvanceDays?: number;
  minAdvanceHours?: number;
  bufferMinutes?: number;
  maxBookingsPerDay?: number;
  serviceTypes?: ServiceType[];
}

type RecurrenceType = 'once' | 'weekly' | 'biweekly' | 'monthly';

/** A booking rule stored in DB */
interface BookingRule {
  _id: string;
  consultorioId: string;
  professionalId?: string;
  professionalName: string;
  date: string;          // ISO date string — start date of recurrence
  startTime: string;
  endTime: string;
  monthlyPrice: number;
  recurrenceType: RecurrenceType;
  daysOfWeek: number[];
  endDate?: string;
  notes?: string;
}

/** An expanded occurrence returned for the weekly grid */
interface BookingOccurrence {
  _id: string;           // composite key: bookingId + date
  bookingId: string;
  consultorioId: string;
  professionalId?: string;
  professionalName: string;
  date: string;          // "YYYY-MM-DD" — the specific occurrence date
  startTime: string;
  endTime: string;
  monthlyPrice: number;
  recurrenceType: RecurrenceType;
  notes?: string;
}

interface Professional {
  _id: string;
  name: string;
  color?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'once',      label: 'Una vez' },
  { value: 'weekly',    label: 'Semanal' },
  { value: 'biweekly',  label: 'Quincenal' },
  { value: 'monthly',   label: 'Mensual' },
];

const recurrenceLabel: Record<RecurrenceType, string> = {
  once:     'Una vez',
  weekly:   'Semanal',
  biweekly: 'Quincenal',
  monthly:  'Mensual',
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50';
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

function weekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

interface BookingModalProps {
  consultorio: Consultorio;
  initialDate?: Date;
  /** When set, the modal is in edit mode */
  editingBooking?: BookingRule | null;
  professionals: Professional[];
  onClose: () => void;
  onSaved: (booking: BookingRule) => void;
}

function BookingModal({ consultorio, initialDate, editingBooking, professionals, onClose, onSaved }: BookingModalProps) {
  const isEditing = !!editingBooking;
  const initialDow = editingBooking
    ? (editingBooking.daysOfWeek?.[0] ?? (new Date(editingBooking.date).getDay()))
    : (initialDate ? initialDate.getDay() : new Date().getDay());

  const [form, setForm] = useState({
    date:             editingBooking
                        ? editingBooking.date.slice(0, 10)
                        : (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
    startTime:        editingBooking?.startTime || '09:00',
    endTime:          editingBooking?.endTime   || '10:00',
    professionalId:   editingBooking?.professionalId || '',
    professionalName: editingBooking?.professionalName || '',
    monthlyPrice:     editingBooking?.monthlyPrice ?? 0,
    recurrenceType:   (editingBooking?.recurrenceType || 'once') as RecurrenceType,
    daysOfWeek:       editingBooking?.daysOfWeek?.length ? editingBooking.daysOfWeek : [initialDow] as number[],
    endDate:          editingBooking?.endDate ? editingBooking.endDate.slice(0, 10) : '',
    notes:            editingBooking?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }));

  const handleProfSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') { set({ professionalId: '', professionalName: '' }); return; }
    if (val === '__manual__') { set({ professionalId: '' }); return; }
    const prof = professionals.find(p => p._id === val);
    if (prof) set({ professionalId: prof._id, professionalName: prof.name });
  };

  const selectVal = form.professionalId || (form.professionalName && !form.professionalId ? '__manual__' : '');

  const toggleDow = (dow: number) => {
    set({
      daysOfWeek: form.daysOfWeek.includes(dow)
        ? form.daysOfWeek.filter(d => d !== dow)
        : [...form.daysOfWeek, dow].sort(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.professionalName) { setError('Ingresá el nombre del profesional'); return; }
    if (form.recurrenceType !== 'once' && form.daysOfWeek.length === 0) {
      setError('Seleccioná al menos un día de la semana'); return;
    }
    setLoading(true); setError('');
    try {
      const body = {
        professionalId:   form.professionalId || null,
        professionalName: form.professionalName,
        date:             form.date,
        startTime:        form.startTime,
        endTime:          form.endTime,
        monthlyPrice:     form.monthlyPrice,
        recurrenceType:   form.recurrenceType,
        daysOfWeek:       form.recurrenceType === 'once' ? [] : form.daysOfWeek,
        endDate:          form.endDate || null,
        notes:            form.notes,
      };

      let url: string;
      let method: string;
      if (isEditing && editingBooking) {
        url    = `/api/consultorios/${consultorio._id}/bookings/${editingBooking._id}`;
        method = 'PUT';
      } else {
        url    = `/api/consultorios/${consultorio._id}/bookings`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const { booking } = await res.json();
      onSaved(booking);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const showDaysOfWeek = form.recurrenceType === 'weekly' || form.recurrenceType === 'biweekly';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: consultorio.color }} />
            <div>
              <p className="text-sm font-semibold text-foreground">{isEditing ? 'Editar reserva' : 'Nueva reserva'}</p>
              <p className="text-xs text-muted-foreground">{consultorio.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Professional */}
          <div>
            <label className={labelCls}>Profesional <span className="text-red-400">*</span></label>
            {professionals.length > 0 ? (
              <div className="space-y-1.5">
                <select value={selectVal} onChange={handleProfSelect} className={inputCls}>
                  <option value="">Seleccionar profesional</option>
                  {professionals.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  <option value="__manual__">Ingresar manualmente</option>
                </select>
                {selectVal === '__manual__' && (
                  <input type="text" value={form.professionalName} onChange={e => set({ professionalName: e.target.value })} placeholder="Nombre del profesional" className={inputCls} />
                )}
              </div>
            ) : (
              <input type="text" value={form.professionalName} onChange={e => set({ professionalName: e.target.value })} placeholder="Nombre del profesional" className={inputCls} />
            )}
          </div>

          {/* Recurrence type */}
          <div>
            <label className={labelCls}>Frecuencia</label>
            <div className="grid grid-cols-2 gap-1.5">
              {RECURRENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set({ recurrenceType: opt.value })}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    form.recurrenceType === opt.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-transparent text-muted-foreground border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day-of-week selector (weekly & biweekly) */}
          {showDaysOfWeek && (
            <div>
              <label className={labelCls}>Días de la semana <span className="text-red-400">*</span></label>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_LABELS.map((lbl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDow(i)}
                    className={`w-9 h-9 rounded-full text-xs font-semibold border transition-colors ${
                      form.daysOfWeek.includes(i)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-transparent text-muted-foreground border-gray-200 dark:border-gray-700 hover:border-primary/40'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly info */}
          {form.recurrenceType === 'monthly' && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
              </svg>
              Se repetirá el mismo día relativo del mes (p.ej. el 2.° martes).
            </div>
          )}

          {/* Start date */}
          <div>
            <label className={labelCls}>{form.recurrenceType === 'once' ? 'Fecha' : 'Fecha de inicio'} <span className="text-red-400">*</span></label>
            <input type="date" value={form.date} onChange={e => set({ date: e.target.value })} className={inputCls} />
          </div>

          {/* End date (only for recurring) */}
          {form.recurrenceType !== 'once' && (
            <div>
              <label className={labelCls}>Fecha de fin <span className="opacity-60">(opcional)</span></label>
              <input type="date" value={form.endDate} onChange={e => set({ endDate: e.target.value })} className={inputCls} min={form.date} />
            </div>
          )}

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Desde</label>
              <input type="time" value={form.startTime} onChange={e => set({ startTime: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Hasta</label>
              <input type="time" value={form.endTime} onChange={e => set({ endTime: e.target.value })} className={inputCls} />
            </div>
          </div>

          {/* Monthly price */}
          <div>
            <label className={labelCls}>Precio mensual ($)</label>
            <input
              type="number" min="0" step="0.01"
              value={form.monthlyPrice}
              onChange={e => set({ monthlyPrice: parseFloat(e.target.value) || 0 })}
              className={inputCls}
              placeholder="0"
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notas <span className="opacity-60">(opcional)</span></label>
            <input type="text" value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Observaciones..." className={inputCls} />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear reserva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Consultorio Form Modal ───────────────────────────────────────────────────

interface ConsultorioFormProps {
  initial?: Consultorio | null;
  onClose: () => void;
  onSaved: (c: Consultorio) => void;
}

function ConsultorioForm({ initial, onClose, onSaved }: ConsultorioFormProps) {
  const [form, setForm] = useState({
    name:        initial?.name || '',
    description: initial?.description || '',
    color:       initial?.color || COLORS[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError('El nombre es requerido'); return; }
    setLoading(true); setError('');
    try {
      const url = initial ? `/api/consultorios/${initial._id}` : '/api/consultorios';
      const method = initial ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Error al guardar');
      const { consultorio } = await res.json();
      onSaved(consultorio);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-semibold text-foreground">{initial ? 'Editar consultorio' : 'Nuevo consultorio'}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Nombre <span className="text-red-400">*</span></label>
            <input type="text" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Ej: Consultorio A, Sala 1..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <input type="text" value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Ej: Planta baja, equipado..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => set({ color: c })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }}
                />
              ))}
              <input type="color" value={form.color} onChange={e => set({ color: e.target.value })}
                className="w-7 h-7 rounded-full cursor-pointer border-0 p-0 bg-transparent" title="Color personalizado" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Weekly Grid ──────────────────────────────────────────────────────────────

interface WeeklyGridProps {
  consultorios: Consultorio[];
  occurrences: BookingOccurrence[];
  professionals: Professional[];
  weekStart: Date;
  onAddBooking: (consultorio: Consultorio, date: Date) => void;
  onEditBooking: (bookingId: string, consultorioId: string) => void;
  onDeleteBooking: (bookingId: string) => void;
}

function WeeklyGrid({ consultorios, occurrences, professionals, weekStart, onAddBooking, onEditBooking, onDeleteBooking }: WeeklyGridProps) {
  const days = weekDays(weekStart);

  if (consultorios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
        <p className="text-sm font-medium">No hay consultorios</p>
        <p className="text-xs mt-1">Creá un consultorio desde la pestaña "Consultorios"</p>
      </div>
    );
  }

  const getOccurrences = (consultorioId: string, day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return occurrences.filter(o => o.consultorioId === consultorioId && o.date === dayStr);
  };

  const profMap = Object.fromEntries(professionals.map(p => [p._id, p]));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50/80 dark:bg-zinc-800/50">
            <th className="sticky left-0 z-10 w-36 px-4 py-3 text-left text-xs font-medium text-muted-foreground bg-gray-50/80 dark:bg-zinc-800/50 border-b border-r border-gray-200 dark:border-gray-800 uppercase tracking-wide">
              Consultorio
            </th>
            {days.map(day => (
              <th key={day.toISOString()} className={`px-3 py-3 text-center border-b border-gray-200 dark:border-gray-800 min-w-[120px] ${isToday(day) ? 'bg-primary/5' : ''}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'EEE', { locale: es })}
                </p>
                <p className={`text-lg font-bold mt-0.5 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </p>
                {isToday(day) && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {consultorios.map((c, ci) => (
            <tr key={c._id} className={ci % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-zinc-800/10'}>
              <td className="sticky left-0 z-10 px-4 py-3 border-r border-gray-200 dark:border-gray-800" style={{ background: `${c.color}08` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                </div>
              </td>
              {days.map(day => {
                const dayOccs = getOccurrences(c._id, day);
                return (
                  <td key={day.toISOString()} className={`px-2 py-2 align-top ${isToday(day) ? 'bg-primary/[0.02]' : ''}`}>
                    <div className="flex flex-col gap-1.5 min-h-[60px]">
                      {dayOccs.map(o => {
                        const prof = o.professionalId ? profMap[o.professionalId] : null;
                        const isRecurring = o.recurrenceType !== 'once';
                        return (
                          <div
                            key={o._id}
                            className="group relative rounded-lg text-white text-xs leading-tight cursor-pointer hover:brightness-110 transition-all"
                            style={{ background: prof?.color || c.color }}
                            onClick={() => onEditBooking(o.bookingId, o.consultorioId)}
                          >
                            <div className="px-2.5 py-1.5 pr-6">
                              <p className="font-semibold truncate">{o.professionalName}</p>
                              <p className="opacity-80 text-[10px]">{o.startTime} – {o.endTime}</p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {o.monthlyPrice > 0 && (
                                  <span className="opacity-80 text-[10px]">${o.monthlyPrice.toFixed(0)}/mes</span>
                                )}
                                {isRecurring && (
                                  <span className="opacity-80 text-[9px] px-1 py-0.5 rounded bg-white/20">
                                    {recurrenceLabel[o.recurrenceType]}
                                  </span>
                                )}
                              </div>
                              {o.notes && <p className="opacity-70 text-[10px] truncate">{o.notes}</p>}
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); onDeleteBooking(o.bookingId); }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded bg-black/20 hover:bg-black/40 flex items-center justify-center"
                              title="Eliminar reserva"
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => onAddBooking(c, day)}
                        className="w-full flex items-center justify-center py-1.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors opacity-0 hover:opacity-100 text-[10px] gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Reservar
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Google Calendar Badge ────────────────────────────────────────────────────

function GoogleCalendarBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
        <path d="M12 2C6.48 2 2 6.48 2 12h3c0-3.86 3.14-7 7-7V2z" fill="#EA4335"/>
        <path d="M2 12c0 5.52 4.48 10 10 10v-3c-3.86 0-7-3.14-7-7H2z" fill="#34A853"/>
        <path d="M22 12c0-5.52-4.48-10-10-10v3c3.86 0 7 3.14 7 7h3z" fill="#FBBC05"/>
      </svg>
      Google Calendar
    </span>
  );
}

// ─── Booking Settings Modal ───────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


// ─── Reservas Online Tab ──────────────────────────────────────────────────────

interface BookingPageItem {
  _id: string;
  consultorioId: string;
  name: string;
  publicSlug: string;
  isEnabled: boolean;
  bookingTitle?: string;
  slotDurationMinutes: number;
}

interface ConsultorioMini {
  _id: string;
  name: string;
  color: string;
}

function BookingPagesTab({ locale }: { locale: string }) {
  const [pages,        setPages]        = useState<BookingPageItem[]>([]);
  const [consultorios, setConsultorios] = useState<ConsultorioMini[]>([]);
  const [userHandle,   setUserHandle]   = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [copied,       setCopied]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/booking-pages');
      const d = await r.json();
      setPages(d.pages || []);
      setConsultorios(d.consultorios || []);
      setUserHandle(d.publicId ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta página de reservas?')) return;
    setDeleting(id);
    await fetch(`/api/booking-pages/${id}`, { method: 'DELETE' });
    setPages(prev => prev.filter(p => p._id !== id));
    setDeleting(null);
  };

  const toggleEnabled = async (page: BookingPageItem) => {
    const res = await fetch(`/api/booking-pages/${page._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled: !page.isEnabled }),
    });
    if (res.ok) {
      setPages(prev => prev.map(p => p._id === page._id ? { ...p, isEnabled: !page.isEnabled } : p));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="w-6 h-6 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const profileUrl = userHandle ? `${appUrl}/${locale}/book/${userHandle}` : null;

  const handleCopyProfile = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Profile URL banner */}
      {profileUrl ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-0.5">Tu perfil público</p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 truncate font-mono">{profileUrl}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleCopyProfile}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-white dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/60 transition-colors"
              title="Copiar enlace"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </>
              )}
            </button>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-white dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/60 transition-colors"
              title="Abrir perfil"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Abrir
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-amber-700 dark:text-amber-300 flex-1">
            Configurá tu identificador público (handle) en{' '}
            <Link href={`/${locale}/dashboard/settings`} className="font-semibold underline underline-offset-2">
              Configuración
            </Link>{' '}
            para obtener tu enlace de perfil.
          </p>
        </div>
      )}

      {/* Header row: count + new button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pages.length === 0
            ? 'Sin páginas de reserva'
            : `${pages.length} página${pages.length !== 1 ? 's' : ''} de reserva`}
        </p>
        <Link
          href={`/${locale}/dashboard/consultorios/reservas/nueva`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva página
        </Link>
      </div>

      {/* Flat pages list */}
      {pages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Sin páginas de reserva</p>
            <p className="text-xs text-muted-foreground mt-1">Creá tu primera página para comenzar a recibir turnos</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
          {pages.map(page => (
            <div key={page._id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
              {/* Enable toggle */}
              <button
                type="button"
                onClick={() => toggleEnabled(page)}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${page.isEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${page.isEnabled ? 'translate-x-4' : ''}`} />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {page.bookingTitle || page.name}
                  </p>
                  {!page.isEnabled && (
                    <span className="text-[10px] font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full flex-shrink-0">desactivada</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    {userHandle ? `…/book/${userHandle}/${page.publicSlug}` : `…/book/${page.publicSlug}`}
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">·</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{page.slotDurationMinutes} min</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={userHandle
                    ? `/${locale}/book/${userHandle}/${page.publicSlug}`
                    : `/${locale}/book/${page.publicSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Ver página pública"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
                <Link
                  href={`/${locale}/dashboard/consultorios/reservas/${page._id}`}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Link>
                <button
                  onClick={() => handleDelete(page._id)}
                  disabled={deleting === page._id}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-40"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Consultorios Manager Tab ─────────────────────────────────────────────────

function ConsultoriosManager({ consultorios, onAdd, onEdit, onDelete }: {
  consultorios: Consultorio[];
  onAdd: () => void;
  onEdit: (c: Consultorio) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este consultorio y todas sus reservas?')) return;
    setDeleting(id);
    await fetch(`/api/consultorios/${id}`, { method: 'DELETE' });
    onDelete(id);
    setDeleting(null);
  };

  return (
    <div className="space-y-3">
      {consultorios.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Sin consultorios</p>
            <p className="text-xs text-muted-foreground mt-1">Agregá tu primer consultorio para comenzar</p>
          </div>
          <button onClick={onAdd} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar consultorio
          </button>
        </div>
      ) : (
        consultorios.map(c => (
          <div key={c._id} className="flex items-center gap-4 px-4 py-3.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
            <div className="w-4 h-10 rounded-md flex-shrink-0" style={{ background: c.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                {c.googleCalendarId && <GoogleCalendarBadge />}
              </div>
              {c.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description}</p>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(c)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => handleDelete(c._id)} disabled={deleting === c._id} className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-40">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Bookings List Tab ────────────────────────────────────────────────────────

function RecurrenceBadge({ rule }: { rule: BookingRule }) {
  if (rule.recurrenceType === 'once') return null;
  const dowNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
  const days = (rule.daysOfWeek || []).map(d => dowNames[d]).join(', ');
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {recurrenceLabel[rule.recurrenceType]}{days ? ` · ${days}` : ''}
    </span>
  );
}

function BookingsList({ bookingRules, consultorios, onEdit, onDelete }: {
  bookingRules: BookingRule[];
  consultorios: Consultorio[];
  onEdit: (bookingId: string, consultorioId: string) => void;
  onDelete: (id: string) => void;
}) {
  const cMap = Object.fromEntries(consultorios.map(c => [c._id, c]));
  const sorted = [...bookingRules].sort((a, b) => a.professionalName.localeCompare(b.professionalName));

  if (sorted.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl">
        No hay reservas registradas aún.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map(b => {
        const c = cMap[b.consultorioId];
        return (
          <div
            key={b._id}
            className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
            onClick={() => onEdit(b._id, b.consultorioId)}
          >
            {c && <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: c.color }} />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{b.professionalName}</p>
                <RecurrenceBadge rule={b} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {c?.name} · {b.startTime} – {b.endTime}
                {b.recurrenceType === 'once'
                  ? ` · ${format(new Date(b.date), "d 'de' MMMM yyyy", { locale: es })}`
                  : ` · desde ${format(new Date(b.date), "d 'de' MMM yyyy", { locale: es })}`
                }
                {b.endDate && ` hasta ${format(new Date(b.endDate), "d 'de' MMM yyyy", { locale: es })}`}
              </p>
              {b.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{b.notes}</p>}
            </div>
            <div className="text-right shrink-0">
              {(b.monthlyPrice > 0) && (
                <p className="text-sm font-semibold text-foreground">
                  ${b.monthlyPrice.toFixed(0)}<span className="text-xs text-muted-foreground font-normal">/mes</span>
                </p>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDelete(b._id); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ConsultoriosClientProps {
  isGoogleConnected?: boolean;
}

export default function ConsultoriosClient({ isGoogleConnected = false }: ConsultoriosClientProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'es';
  const [tab, setTab] = useState<'semana' | 'consultorios' | 'reservas' | 'online'>('semana');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [consultorios, setConsultorios] = useState<Consultorio[]>([]);
  const [occurrences, setOccurrences] = useState<BookingOccurrence[]>([]);
  const [bookingRules, setBookingRules] = useState<BookingRule[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [bookingModal, setBookingModal] = useState<{ consultorio: Consultorio; date: Date } | null>(null);
  const [editModal, setEditModal] = useState<{ consultorio: Consultorio; booking: BookingRule } | null>(null);
  const [consForm, setConsForm] = useState<{ open: boolean; editing: Consultorio | null }>({ open: false, editing: null });

  useEffect(() => {
    fetch('/api/consultorios').then(r => r.json()).then(d => setConsultorios(d.consultorios || []));
    fetch('/api/professionals').then(r => r.json()).then(d => setProfessionals(d.professionals || []));
  }, []);

  const fetchWeekOccurrences = useCallback(async () => {
    if (consultorios.length === 0) return;
    setLoadingWeek(true);
    try {
      const days = weekDays(weekStart);
      const from = format(days[0], 'yyyy-MM-dd');
      const to   = format(days[6], 'yyyy-MM-dd');
      const all: BookingOccurrence[] = [];
      await Promise.all(
        consultorios.map(async c => {
          const r = await fetch(`/api/consultorios/${c._id}/bookings?from=${from}&to=${to}`);
          const d = await r.json();
          all.push(...(d.bookings || []));
        })
      );
      setOccurrences(all);
    } finally {
      setLoadingWeek(false);
    }
  }, [weekStart, consultorios]);

  useEffect(() => {
    fetchWeekOccurrences();
  }, [fetchWeekOccurrences]);

  const fetchBookingRules = useCallback(async () => {
    if (consultorios.length === 0) return;
    setLoadingRules(true);
    try {
      const all: BookingRule[] = [];
      await Promise.all(
        consultorios.map(async c => {
          const r = await fetch(`/api/consultorios/${c._id}/bookings`);
          const d = await r.json();
          all.push(...(d.bookings || []));
        })
      );
      setBookingRules(all);
    } finally {
      setLoadingRules(false);
    }
  }, [consultorios]);

  useEffect(() => {
    if (tab === 'reservas') fetchBookingRules();
  }, [tab, fetchBookingRules]);

  const handleBookingSaved = (_b: BookingRule) => {
    fetchWeekOccurrences();
    fetchBookingRules();
  };

  const handleEditBooking = async (bookingId: string, consultorioId: string) => {
    const con = consultorios.find(c => c._id === consultorioId);
    if (!con) return;
    try {
      const res = await fetch(`/api/consultorios/${consultorioId}/bookings/${bookingId}`);
      if (!res.ok) return;
      const { booking } = await res.json();
      setEditModal({ consultorio: con, booking });
    } catch { /* ignore */ }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const occ = occurrences.find(o => o.bookingId === bookingId);
    const rule = bookingRules.find(r => r._id === bookingId);
    const consultorioId = occ?.consultorioId || rule?.consultorioId;
    if (!consultorioId) return;
    await fetch(`/api/consultorios/${consultorioId}/bookings/${bookingId}`, { method: 'DELETE' });
    setOccurrences(prev => prev.filter(o => o.bookingId !== bookingId));
    setBookingRules(prev => prev.filter(r => r._id !== bookingId));
  };

  const handleSyncFromGoogle = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/consultorios/sync-from-google', { method: 'POST' });
      if (!res.ok) throw new Error('Error al sincronizar');
      const { consultorios: updated, synced } = await res.json();
      setConsultorios(updated || []);
      alert(`¡Sincronización exitosa! ${synced} calendario${synced !== 1 ? 's' : ''} importado${synced !== 1 ? 's' : ''}.`);
    } catch (e: any) {
      alert(e.message || 'Error al sincronizar con Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const tabCls = (active: boolean) =>
    `px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${active
      ? 'border-primary text-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600'}`;

  return (
    <div className="flex flex-col h-full">
      {bookingModal && (
        <BookingModal
          consultorio={bookingModal.consultorio}
          initialDate={bookingModal.date}
          professionals={professionals}
          onClose={() => setBookingModal(null)}
          onSaved={handleBookingSaved}
        />
      )}
      {editModal && (
        <BookingModal
          consultorio={editModal.consultorio}
          editingBooking={editModal.booking}
          professionals={professionals}
          onClose={() => setEditModal(null)}
          onSaved={handleBookingSaved}
        />
      )}
      {consForm.open && (
        <ConsultorioForm
          initial={consForm.editing}
          onClose={() => setConsForm({ open: false, editing: null })}
          onSaved={c => {
            if (consForm.editing) setConsultorios(prev => prev.map(x => x._id === c._id ? c : x));
            else setConsultorios(prev => [...prev, c]);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-foreground">Consultorios</h1>
        <div className="flex items-center gap-2">
          {isGoogleConnected && (
            <button
              onClick={handleSyncFromGoogle}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {syncing ? (
                <svg className="w-4 h-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4"/>
                  <path d="M12 2C6.48 2 2 6.48 2 12h3c0-3.86 3.14-7 7-7V2z" fill="#EA4335"/>
                  <path d="M2 12c0 5.52 4.48 10 10 10v-3c-3.86 0-7-3.14-7-7H2z" fill="#34A853"/>
                  <path d="M22 12c0-5.52-4.48-10-10-10v3c3.86 0 7 3.14 7 7h3z" fill="#FBBC05"/>
                </svg>
              )}
              {syncing ? 'Sincronizando…' : 'Sync Google'}
            </button>
          )}
          {tab === 'consultorios' && (
            <button
              onClick={() => setConsForm({ open: true, editing: null })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo consultorio
            </button>
          )}
          {tab === 'semana' && consultorios.length > 0 && (
            <button
              onClick={() => setBookingModal({ consultorio: consultorios[0], date: new Date() })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva reserva
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-5">
        <button className={tabCls(tab === 'semana')} onClick={() => setTab('semana')}>Vista semanal</button>
        <button className={tabCls(tab === 'consultorios')} onClick={() => setTab('consultorios')}>Consultorios</button>
        <button className={tabCls(tab === 'reservas')} onClick={() => setTab('reservas')}>Reservas</button>
        <button className={tabCls(tab === 'online')} onClick={() => setTab('online')}>Reservas online</button>
      </div>

      {tab === 'semana' && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekStart(w => subWeeks(w, 1))} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm font-medium text-foreground min-w-[200px] text-center">
              {format(weekStart, "d 'de' MMM", { locale: es })} – {format(addDays(weekStart, 6), "d 'de' MMM yyyy", { locale: es })}
            </div>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/8 border border-primary/20 rounded-lg hover:bg-primary/15 transition-colors">
              Hoy
            </button>
          </div>

          {loadingWeek ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Cargando…</div>
          ) : (
            <WeeklyGrid
              consultorios={consultorios}
              occurrences={occurrences}
              professionals={professionals}
              weekStart={weekStart}
              onAddBooking={(c, d) => setBookingModal({ consultorio: c, date: d })}
              onEditBooking={handleEditBooking}
              onDeleteBooking={handleDeleteBooking}
            />
          )}
        </div>
      )}

      {tab === 'consultorios' && (
        <ConsultoriosManager
          consultorios={consultorios}
          onAdd={() => setConsForm({ open: true, editing: null })}
          onEdit={c => setConsForm({ open: true, editing: c })}
          onDelete={id => setConsultorios(prev => prev.filter(c => c._id !== id))}
        />
      )}

      {tab === 'reservas' && (
        loadingRules ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Cargando…</div>
        ) : (
          <BookingsList
            bookingRules={bookingRules}
            consultorios={consultorios}
            onEdit={handleEditBooking}
            onDelete={handleDeleteBooking}
          />
        )
      )}

      {tab === 'online' && <BookingPagesTab locale={locale} />}
    </div>
  );
}
