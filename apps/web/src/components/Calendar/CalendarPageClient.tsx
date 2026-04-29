'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, isBefore, isToday, isTomorrow, isYesterday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import NewAppointmentWizard from './NewAppointmentWizard';

interface Appointment {
  _id: string;
  start: string;
  end: string;
  patientName: string;
  patientId?: string;
  reason: string;
  status: string;
  patientPhone?: string;
  patientEmail?: string;
}

interface ServiceRecordSummary {
  _id: string;
  service: string;
  price: number;
  paid: number;
  professional: string;
}

interface Consultorio {
  _id: string;
  name: string;
}

interface Professional {
  _id: string;
  name: string;
  color?: string;
  consultorioId?: string;
}

interface PrestacionTemplate {
  _id: string;
  name: string;
  price: number;
  description: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:          { label: 'Pendiente',          color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',  dot: 'bg-yellow-400' },
  confirmed:        { label: 'Confirmado',          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',    dot: 'bg-green-500'  },
  'user confirmed': { label: 'Conf. por paciente',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',       dot: 'bg-blue-500'   },
  'user waiting':   { label: 'En espera',           color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-400' },
  done:             { label: 'Realizado',           color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', dot: 'bg-violet-500' },
  cancelled:        { label: 'Cancelado',           color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           dot: 'bg-red-400'    },
};

function StatusSelect({ appId, status, onUpdate }: { appId: string; status: string; onUpdate: (id: string, s: string) => void }) {
  const [busy, setBusy] = useState(false);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];

  const handleChange = async (newStatus: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/appointments/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) onUpdate(appId, newStatus);
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  return (
    <div className="relative">
      <select
        value={status}
        onChange={e => handleChange(e.target.value)}
        disabled={busy}
        className={`text-xs pl-2.5 pr-6 py-1 rounded-full appearance-none cursor-pointer border-transparent focus:ring-2 focus:ring-primary/50 disabled:opacity-50 ${cfg.color}`}
      >
        {Object.entries(STATUS_CONFIG).map(([val, c]) => (
          <option key={val} value={val} className="bg-white dark:bg-zinc-800 text-foreground">{c.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center opacity-60">
        <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
}

function getDurationMin(start: string, end: string) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

// ─── Create Prestación Modal ──────────────────────────────────────────────────

interface CreatePrestacionModalProps {
  appointment: Appointment;
  onClose: () => void;
  onSaved: (appId: string, sr: ServiceRecordSummary) => void;
}

function CreatePrestacionModal({ appointment, onClose, onSaved }: CreatePrestacionModalProps) {
  const [professionals, setProfessionals]         = useState<Professional[]>([]);
  const [consultorios, setConsultorios]           = useState<Consultorio[]>([]);
  const [templates, setTemplates]                 = useState<PrestacionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate]   = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    date: new Date(appointment.start).toISOString().split('T')[0],
    service: appointment.reason || '',
    professional: '',
    professionalId: '',
    consultorioId: '',
    price: 0,
    paid: 0,
  });

  useEffect(() => {
    fetch('/api/professionals')
      .then(r => r.json())
      .then(d => setProfessionals(d.professionals || []))
      .catch(() => {});
    fetch('/api/consultorios')
      .then(r => r.json())
      .then(d => setConsultorios(d.consultorios || []))
      .catch(() => {});
    fetch('/api/prestaciones')
      .then(r => r.json())
      .then(d => setTemplates(d.items || []))
      .catch(() => {});
  }, []);

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    if (!id) return;
    const tpl = templates.find(t => t._id === id);
    if (tpl) {
      setForm(prev => ({ ...prev, service: tpl.name, price: tpl.price }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleProfSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') {
      setForm(prev => ({ ...prev, professionalId: '', professional: '', consultorioId: '' }));
    } else if (val === '__manual__') {
      setForm(prev => ({ ...prev, professionalId: '', consultorioId: '' }));
    } else {
      const prof = professionals.find(p => p._id === val);
      if (prof) setForm(prev => ({
        ...prev,
        professionalId: prof._id,
        professional: prof.name,
        consultorioId: prof.consultorioId || '',
      }));
    }
  };

  const selectValue = form.professionalId
    ? form.professionalId
    : form.professional ? '__manual__' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment.patientId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${appointment.patientId}/service-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          service: form.service,
          professional: form.professional,
          professionalId: form.professionalId || null,
          consultorioId: form.consultorioId || null,
          price: form.price,
          paid: form.paid,
          appointmentId: appointment._id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(true);
        onSaved(appointment._id, {
          _id: data.record._id,
          service: form.service,
          price: form.price,
          paid: form.paid,
          professional: form.professional,
        });
        setTimeout(() => onClose(), 1200);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-foreground">Nueva prestación</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{appointment.patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!appointment.patientId ? (
          <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Turno sin paciente vinculado</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Este turno no está asociado a un paciente del sistema. Para crear una prestación, primero vinculá el turno a un paciente desde su ficha.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : saved ? (
          <div className="flex flex-col items-center gap-3 py-10 px-6">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">Prestación creada</p>
            <p className="text-xs text-muted-foreground text-center">
              Podés verla en el perfil del paciente.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">

            {/* Selector de catálogo */}
            {templates.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Seleccionar del catálogo
                </label>
                <select
                  value={selectedTemplate}
                  onChange={e => handleTemplateSelect(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Nueva prestación manual —</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name} · ${t.price.toLocaleString('es-AR')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha</label>
                <input type="date" name="date" value={form.date} onChange={handleChange} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Prestación</label>
                <input type="text" name="service" value={form.service} onChange={handleChange} required placeholder="Ej: Consulta general" className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Profesional <span className="opacity-60">(opcional)</span>
                </label>
                {professionals.length > 0 ? (
                  <div className="space-y-1.5">
                    <select value={selectValue} onChange={handleProfSelect} className={inputCls}>
                      <option value="">Sin profesional</option>
                      {professionals.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                      <option value="__manual__">Otro (ingresar manualmente)</option>
                    </select>
                    {(selectValue === '__manual__' || (!form.professionalId && form.professional)) && (
                      <input type="text" name="professional" value={form.professional} onChange={handleChange} placeholder="Nombre del profesional" className={inputCls} />
                    )}
                  </div>
                ) : (
                  <input type="text" name="professional" value={form.professional} onChange={handleChange} placeholder="Nombre del profesional" className={inputCls} />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Consultorio <span className="opacity-60">(opcional)</span>
                </label>
                <select
                  value={form.consultorioId}
                  onChange={e => setForm(prev => ({ ...prev, consultorioId: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Sin consultorio</option>
                  {consultorios.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Precio</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                  <input type="number" name="price" value={form.price} onChange={handleChange} min="0" step="0.01" className={inputCls + ' pl-7'} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Seña / Pago</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                  <input type="number" name="paid" value={form.paid} onChange={handleChange} min="0" step="0.01" className={inputCls + ' pl-7'} />
                </div>
              </div>
            </div>

            {form.paid > 0 && form.price > 0 && form.paid < form.price && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>Saldo pendiente: <strong>${(form.price - form.paid).toFixed(2)}</strong>. El profesional podrá liquidarse sobre lo cobrado.</span>
              </div>
            )}

            {form.professionalId && (
              <div className="flex items-start gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 rounded-lg text-xs text-violet-700 dark:text-violet-400">
                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Este profesional aparecerá en <strong>Liquidación a profesionales</strong>.</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading || !form.service} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {loading ? 'Guardando…' : 'Guardar prestación'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

interface ListViewProps {
  appointments: Appointment[];
  serviceRecordsByAppointment: Record<string, ServiceRecordSummary>;
  whatsappTemplate?: string;
}

function buildWhatsAppUrl(phone: string, template: string, patientName: string, date: Date): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const fecha = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hora = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const message = template
    .replace(/\{nombre\}/g, patientName)
    .replace(/\{fecha\}/g, fecha)
    .replace(/\{hora\}/g, hora);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function ListView({ appointments: initialApps, serviceRecordsByAppointment: initialSRMap, whatsappTemplate }: ListViewProps) {
  const [apps, setApps] = useState(initialApps);
  const [srMap, setSrMap] = useState<Record<string, ServiceRecordSummary>>(initialSRMap);

  useEffect(() => {
    setApps(prev => {
      const prevIds = new Set(prev.map(a => a._id));
      const newOnes = initialApps.filter(a => !prevIds.has(a._id));
      return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
    });
  }, [initialApps]);

  const [subTab, setSubTab] = useState<'proximos' | 'pasados'>('proximos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [modalApp, setModalApp] = useState<Appointment | null>(null);

  const now = startOfDay(new Date());

  const upcoming = apps
    .filter(a => !isBefore(new Date(a.start), now))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const past = apps
    .filter(a => isBefore(new Date(a.start), now))
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  const list = (subTab === 'proximos' ? upcoming : past).filter(a =>
    statusFilter === 'todos' || a.status === statusFilter
  );

  const grouped: { key: string; label: string; items: Appointment[] }[] = [];
  for (const app of list) {
    const d = new Date(app.start);
    const key = format(d, 'yyyy-MM-dd');
    let label: string;
    if (isToday(d))           label = `Hoy · ${format(d, "d 'de' MMMM", { locale: es })}`;
    else if (isTomorrow(d))   label = `Mañana · ${format(d, "d 'de' MMMM", { locale: es })}`;
    else if (isYesterday(d))  label = `Ayer · ${format(d, "d 'de' MMMM", { locale: es })}`;
    else                      label = format(d, "EEEE d 'de' MMMM yyyy", { locale: es });
    label = label.charAt(0).toUpperCase() + label.slice(1);

    const existing = grouped.find(g => g.key === key);
    if (existing) existing.items.push(app);
    else grouped.push({ key, label, items: [app] });
  }

  const handleUpdate = useCallback((id: string, newStatus: string) => {
    setApps(prev => prev.map(a => a._id === id ? { ...a, status: newStatus } : a));
  }, []);

  const handleSaved = useCallback((appId: string, sr: ServiceRecordSummary) => {
    setSrMap(prev => ({ ...prev, [appId]: sr }));
  }, []);

  const [completing, setCompleting] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const handleComplete = useCallback(async (app: Appointment) => {
    setCompleting(app._id);
    try {
      const res = await fetch(`/api/appointments/${app._id}/complete`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setApps(prev => prev.map(a => a._id === app._id ? { ...a, status: 'done' } : a));
        setCompletedIds(prev => new Set(prev).add(app._id));
        if (data.taskCreated) {
          // Brief visual feedback — optional toast could go here
        }
      }
    } catch (e) { console.error(e); }
    finally { setCompleting(null); }
  }, []);

  const tabCls = (active: boolean) =>
    `px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${active
      ? 'bg-primary text-white'
      : 'text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800'}`;

  return (
    <>
      {modalApp && (
        <CreatePrestacionModal
          appointment={modalApp}
          onClose={() => setModalApp(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button className={tabCls(subTab === 'proximos')} onClick={() => setSubTab('proximos')}>
              Próximos <span className="ml-1 text-xs opacity-70">({upcoming.length})</span>
            </button>
            <button className={tabCls(subTab === 'pasados')} onClick={() => setSubTab('pasados')}>
              Pasados <span className="ml-1 text-xs opacity-70">({past.length})</span>
            </button>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="todos">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([val, c]) => (
              <option key={val} value={val}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-5">
          {list.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl">
              No hay turnos {subTab === 'proximos' ? 'próximos' : 'pasados'}{statusFilter !== 'todos' ? ' con ese estado' : ''}.
            </div>
          ) : (
            <>
              {grouped.map(group => (
                <div key={group.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? 'turno' : 'turnos'}
                    </span>
                  </div>

                  {group.items.map(app => {
                    const start = new Date(app.start);
                    const durMin = getDurationMin(app.start, app.end);
                    const sr = srMap[app._id];
                    const balance = sr ? sr.price - sr.paid : null;
                    const isPaid = balance !== null && balance <= 0;
                    const isAlreadyDone = app.status === 'done' || completedIds.has(app._id);
                    const showCompleteBtn = subTab === 'pasados' && !!sr && !isAlreadyDone;

                    return (
                      <div
                        key={app._id}
                        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-4 px-4 py-3 flex-wrap">
                          <div className="w-20 shrink-0">
                            <p className="text-sm font-semibold text-foreground tabular-nums">{format(start, 'HH:mm')}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{durMin} min</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{app.patientName}</p>
                            {app.patientPhone && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-muted-foreground">{app.patientPhone}</span>
                                {whatsappTemplate && (
                                  <a
                                    href={buildWhatsAppUrl(app.patientPhone, whatsappTemplate, app.patientName, start)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Enviar recordatorio por WhatsApp"
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors flex-shrink-0"
                                  >
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="hidden sm:block flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{app.reason || '—'}</p>
                          </div>
                          <div className="shrink-0">
                            <StatusSelect appId={app._id} status={app.status} onUpdate={handleUpdate} />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!sr && (
                              <button
                                onClick={() => setModalApp(app)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/8 hover:bg-primary/15 border border-primary/20 rounded-lg transition-colors whitespace-nowrap"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Prestación
                              </button>
                            )}
                            {app.patientId && (
                              <Link href={`/dashboard/patients/${app.patientId}`} className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap">
                                Ver paciente →
                              </Link>
                            )}
                          </div>
                        </div>

                        {sr && (
                          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-dashed border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-zinc-800/30 flex-wrap">
                            <div className="w-20 shrink-0 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Prest.</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{sr.service}</p>
                            </div>
                            <div className="hidden sm:block flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground truncate">{sr.professional || '—'}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs shrink-0 text-muted-foreground">
                              <span>Seña</span>
                              <span className="font-medium text-foreground">${(sr.paid ?? 0).toFixed(0)}</span>
                              <span>/</span>
                              <span>${(sr.price ?? 0).toFixed(0)}</span>
                            </div>
                            <div className="shrink-0">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
                                isPaid
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {isPaid ? '✓ Pagado' : `Debe $${(balance ?? 0).toFixed(0)}`}
                              </span>
                            </div>
                            {showCompleteBtn && (
                              <button
                                disabled={completing === app._id}
                                onClick={() => handleComplete(app)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                              >
                                {completing === app._id ? (
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                                Completar
                              </button>
                            )}
                            {isAlreadyDone && subTab === 'pasados' && !!sr && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 whitespace-nowrap">
                                ✓ Completado
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              <p className="text-xs text-muted-foreground px-1">
                {list.length} {list.length === 1 ? 'turno' : 'turnos'} en {grouped.length} {grouped.length === 1 ? 'día' : 'días'}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────

interface CalendarPageClientProps {
  appointments: Appointment[];
  serviceRecordsByAppointment: Record<string, ServiceRecordSummary>;
  whatsappTemplate?: string;
}

export default function CalendarPageClient({ appointments, serviceRecordsByAppointment, whatsappTemplate }: CalendarPageClientProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [allAppointments, setAllAppointments] = useState(appointments);

  const handleCreated = (app: any) => {
    setAllAppointments(prev => [...prev, app]);
  };

  return (
    <div className="flex flex-col gap-0 h-full">
      {showWizard && (
        <NewAppointmentWizard
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-foreground">Turnos</h1>
        <button
          onClick={() => setShowWizard(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo turno
        </button>
      </div>

      <ListView appointments={allAppointments} serviceRecordsByAppointment={serviceRecordsByAppointment} whatsappTemplate={whatsappTemplate} />
    </div>
  );
}
