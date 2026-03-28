'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  _id: string;
  name: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

interface Professional {
  _id: string;
  name: string;
  color?: string;
}

interface CreatedAppointment {
  _id: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  reason: string;
  status: string;
  start: string;
  end: string;
}

interface NewAppointmentWizardProps {
  onClose: () => void;
  onCreated: (appointment: CreatedAppointment) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];
const timeIn30 = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50';
const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Paciente', 'Turno', 'Prestación'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-0 flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                done    ? 'bg-primary text-white' :
                active  ? 'bg-primary text-white ring-4 ring-primary/20' :
                          'bg-gray-100 dark:bg-zinc-800 text-muted-foreground'
              }`}>
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 transition-colors ${done ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Paciente ─────────────────────────────────────────────────────────

interface Step1Data {
  mode: 'existing' | 'new';
  selectedPatient: Patient | null;
  newName: string;
  newLastName: string;
  newPhone: string;
  newEmail: string;
}

function Step1({ data, onChange }: { data: Step1Data; onChange: (d: Step1Data) => void }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState(
    data.selectedPatient ? `${data.selectedPatient.name}${data.selectedPatient.lastName ? ' ' + data.selectedPatient.lastName : ''}` : ''
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/patients')
      .then(r => r.json())
      .then(d => setPatients(d.patients || []))
      .catch(() => {});
  }, []);

  const filtered = search.length > 1
    ? patients.filter(p => {
        const full = `${p.name} ${p.lastName || ''} ${p.phone || ''} ${p.email || ''}`.toLowerCase();
        return full.includes(search.toLowerCase());
      }).slice(0, 8)
    : [];

  const set = (partial: Partial<Step1Data>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
        <button
          type="button"
          onClick={() => set({ mode: 'existing', selectedPatient: null })}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            data.mode === 'existing' ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Paciente existente
        </button>
        <button
          type="button"
          onClick={() => set({ mode: 'new', selectedPatient: null })}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            data.mode === 'new' ? 'bg-white dark:bg-zinc-900 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Nuevo paciente
        </button>
      </div>

      {data.mode === 'existing' ? (
        <div ref={dropdownRef} className="relative">
          <label className={labelCls}>Buscar paciente</label>
          <div className="relative">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setShowDropdown(true);
                if (!e.target.value) set({ selectedPatient: null });
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Nombre, teléfono o email..."
              className={inputCls + ' pl-9'}
            />
            {data.selectedPatient && (
              <button
                type="button"
                onClick={() => { setSearch(''); set({ selectedPatient: null }); setShowDropdown(false); }}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDropdown && filtered.length > 0 && !data.selectedPatient && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
              {filtered.map(p => (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => {
                    set({ selectedPatient: p });
                    setSearch(`${p.name}${p.lastName ? ' ' + p.lastName : ''}`);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name} {p.lastName}</p>
                    {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected patient chip */}
          {data.selectedPatient && (
            <div className="mt-2 flex items-center gap-3 px-3 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                {data.selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{data.selectedPatient.name} {data.selectedPatient.lastName}</p>
                {data.selectedPatient.phone && <p className="text-xs text-muted-foreground">{data.selectedPatient.phone}</p>}
              </div>
              <span className="text-xs text-primary font-medium">✓ Seleccionado</span>
            </div>
          )}

          {search.length > 1 && filtered.length === 0 && !data.selectedPatient && (
            <p className="mt-2 text-xs text-muted-foreground px-1">
              No se encontraron pacientes. ¿Querés{' '}
              <button type="button" className="text-primary underline" onClick={() => set({ mode: 'new', newName: search })}>
                crear uno nuevo
              </button>?
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre <span className="text-red-400">*</span></label>
              <input type="text" value={data.newName} onChange={e => set({ newName: e.target.value })} placeholder="Nombre" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Apellido</label>
              <input type="text" value={data.newLastName} onChange={e => set({ newLastName: e.target.value })} placeholder="Apellido" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input type="tel" value={data.newPhone} onChange={e => set({ newPhone: e.target.value })} placeholder="+54 11 1234 5678" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={data.newEmail} onChange={e => set({ newEmail: e.target.value })} placeholder="email@ejemplo.com" className={inputCls} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Turno ────────────────────────────────────────────────────────────

interface Step2Data {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: string;
}

const STATUS_OPTIONS = [
  { value: 'pending',        label: 'Pendiente' },
  { value: 'confirmed',      label: 'Confirmado' },
  { value: 'user confirmed', label: 'Conf. por paciente' },
  { value: 'user waiting',   label: 'En espera' },
  { value: 'done',           label: 'Realizado' },
  { value: 'cancelled',      label: 'Cancelado' },
];

function Step2({ data, onChange }: { data: Step2Data; onChange: (d: Step2Data) => void }) {
  const set = (partial: Partial<Step2Data>) => onChange({ ...data, ...partial });

  return (
    <div className="space-y-4">
      {/* Date */}
      <div>
        <label className={labelCls}>Fecha <span className="text-red-400">*</span></label>
        <input
          type="date"
          value={data.date}
          onChange={e => set({ date: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Hora inicio <span className="text-red-400">*</span></label>
          <input
            type="time"
            value={data.startTime}
            onChange={e => {
              const st = e.target.value;
              set({ startTime: st, endTime: timeIn30(st) });
            }}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Hora fin <span className="text-red-400">*</span></label>
          <input
            type="time"
            value={data.endTime}
            onChange={e => set({ endTime: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className={labelCls}>Motivo</label>
        <input
          type="text"
          value={data.reason}
          onChange={e => set({ reason: e.target.value })}
          placeholder="Ej: Primera consulta, Control, Cirugía..."
          className={inputCls}
        />
      </div>

      {/* Status */}
      <div>
        <label className={labelCls}>Estado</label>
        <select value={data.status} onChange={e => set({ status: e.target.value })} className={inputCls}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Step 3: Prestación ───────────────────────────────────────────────────────

interface Step3Data {
  include: boolean;
  service: string;
  professional: string;
  professionalId: string;
  price: number;
  paid: number;
}

function Step3({ data, onChange, defaultService }: { data: Step3Data; onChange: (d: Step3Data) => void; defaultService: string }) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const set = (partial: Partial<Step3Data>) => onChange({ ...data, ...partial });

  useEffect(() => {
    fetch('/api/professionals')
      .then(r => r.json())
      .then(d => setProfessionals(d.professionals || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!data.service && defaultService) set({ service: defaultService });
  }, [defaultService]);

  const selectValue = data.professionalId ? data.professionalId : data.professional ? '__manual__' : '';

  const handleProfSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') set({ professionalId: '', professional: '' });
    else if (val === '__manual__') set({ professionalId: '' });
    else {
      const prof = professionals.find(p => p._id === val);
      if (prof) set({ professionalId: prof._id, professional: prof.name });
    }
  };

  const balance = data.price - data.paid;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => set({ include: !data.include })}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-colors ${
          data.include
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            data.include ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'
          }`}>
            {data.include && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm font-medium">Agregar prestación a este turno</span>
        </div>
        <span className="text-xs opacity-60">opcional</span>
      </button>

      {data.include && (
        <div className="space-y-3 pt-1">
          {/* Service */}
          <div>
            <label className={labelCls}>Servicio / Prestación <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={data.service}
              onChange={e => set({ service: e.target.value })}
              placeholder="Ej: Consulta general, Limpieza dental..."
              className={inputCls}
            />
          </div>

          {/* Professional */}
          <div>
            <label className={labelCls}>Profesional <span className="opacity-60">(opcional)</span></label>
            {professionals.length > 0 ? (
              <div className="space-y-1.5">
                <select value={selectValue} onChange={handleProfSelect} className={inputCls}>
                  <option value="">Sin profesional</option>
                  {professionals.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  <option value="__manual__">Otro (ingresar manualmente)</option>
                </select>
                {selectValue === '__manual__' && (
                  <input
                    type="text"
                    value={data.professional}
                    onChange={e => set({ professional: e.target.value })}
                    placeholder="Nombre del profesional"
                    className={inputCls}
                  />
                )}
              </div>
            ) : (
              <input
                type="text"
                value={data.professional}
                onChange={e => set({ professional: e.target.value })}
                placeholder="Nombre del profesional"
                className={inputCls}
              />
            )}
          </div>

          {/* Price / Paid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Precio</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={data.price}
                  onChange={e => set({ price: parseFloat(e.target.value) || 0 })}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Seña / Pago</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={data.paid}
                  onChange={e => set({ paid: parseFloat(e.target.value) || 0 })}
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
          </div>

          {/* Balance hint */}
          {data.price > 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
              balance <= 0
                ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800/30'
                : 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30'
            }`}>
              {balance <= 0
                ? <><span>✓</span> Pagado completo</>
                : <><span>Saldo pendiente:</span> <strong>${balance.toFixed(2)}</strong></>
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function NewAppointmentWizard({ onClose, onCreated }: NewAppointmentWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const defaultTime = '09:00';

  const [step1, setStep1] = useState<Step1Data>({
    mode: 'existing',
    selectedPatient: null,
    newName: '', newLastName: '', newPhone: '', newEmail: '',
  });

  const [step2, setStep2] = useState<Step2Data>({
    date: today(),
    startTime: defaultTime,
    endTime: timeIn30(defaultTime),
    reason: 'Primera Consulta',
    status: 'confirmed',
  });

  const [step3, setStep3] = useState<Step3Data>({
    include: false,
    service: '',
    professional: '',
    professionalId: '',
    price: 0,
    paid: 0,
  });

  // Validation per step
  const canNext = () => {
    if (step === 0) {
      if (step1.mode === 'existing') return !!step1.selectedPatient;
      return !!step1.newName.trim();
    }
    if (step === 1) return !!step2.date && !!step2.startTime && !!step2.endTime;
    return true;
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      let patientId: string | undefined;
      let patientName: string;
      let patientPhone = '';

      if (step1.mode === 'existing' && step1.selectedPatient) {
        patientId = step1.selectedPatient._id;
        patientName = `${step1.selectedPatient.name}${step1.selectedPatient.lastName ? ' ' + step1.selectedPatient.lastName : ''}`;
        patientPhone = step1.selectedPatient.phone || '';
      } else {
        // Create patient
        const pr = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: step1.newName.trim(),
            lastName: step1.newLastName.trim() || undefined,
            phone: step1.newPhone.trim() || undefined,
            email: step1.newEmail.trim() || undefined,
          }),
        });
        if (!pr.ok) {
          const e = await pr.json();
          throw new Error(e.error || 'Error al crear paciente');
        }
        const pd = await pr.json();
        patientId = pd.patient._id;
        patientName = `${step1.newName.trim()}${step1.newLastName.trim() ? ' ' + step1.newLastName.trim() : ''}`;
        patientPhone = step1.newPhone.trim();
      }

      // Create appointment
      const start = new Date(`${step2.date}T${step2.startTime}`);
      const end   = new Date(`${step2.date}T${step2.endTime}`);

      const ar = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          patientName,
          patientPhone,
          start: start.toISOString(),
          end:   end.toISOString(),
          reason: step2.reason || 'Primera Consulta',
          status: step2.status,
        }),
      });
      if (!ar.ok) throw new Error('Error al crear turno');
      const ad = await ar.json();
      const appointmentId = ad.appointment._id;

      // Create service record (optional)
      if (step3.include && step3.service && patientId) {
        await fetch(`/api/patients/${patientId}/service-records`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: step2.date,
            service: step3.service,
            professional: step3.professional || '',
            professionalId: step3.professionalId || null,
            price: step3.price,
            paid: step3.paid,
            appointmentId,
          }),
        });
      }

      setDone(true);
      onCreated({
        _id: appointmentId,
        patientId,
        patientName,
        patientPhone,
        reason: step2.reason || 'Primera Consulta',
        status: step2.status,
        start: start.toISOString(),
        end: end.toISOString(),
      });
      setTimeout(() => onClose(), 1600);
    } catch (e: any) {
      setError(e.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Nuevo turno</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Paso {step + 1} de {STEPS.length}</p>
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

        {/* Step indicator */}
        <div className="px-5 pb-4">
          <StepIndicator current={step} />
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        {done ? (
          /* Success */
          <div className="flex flex-col items-center gap-3 py-12 px-6">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">¡Turno creado!</p>
            <p className="text-xs text-muted-foreground text-center">
              El turno fue agendado correctamente.
              {step3.include && ' La prestación también fue registrada.'}
            </p>
          </div>
        ) : (
          <>
            {/* Step content */}
            <div className="px-5 py-5 min-h-[280px]">
              {step === 0 && <Step1 data={step1} onChange={setStep1} />}
              {step === 1 && <Step2 data={step2} onChange={setStep2} />}
              {step === 2 && <Step3 data={step3} onChange={setStep3} defaultService={step2.reason} />}
            </div>

            {/* Error */}
            {error && (
              <div className="mx-5 mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-lg text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-zinc-800/20">
              <button
                type="button"
                onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {step === 0 ? 'Cancelar' : '← Anterior'}
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Guardando…' : '✓ Finalizar'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
