'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isBefore, isToday,
  startOfWeek, addDays, isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { use } from 'react';

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
}

interface ConsultorioPublic {
  _id: string;
  name: string;
  description: string;
  color: string;
  bookingTitle?: string | null;
  slotDurationMinutes: number;
  workingHours: Record<string, WorkingDay>;
  serviceTypes: ServiceType[];
  maxAdvanceDays: number;
  minAdvanceHours: number;
  bufferMinutes: number;
  maxBookingsPerDay: number;
}

type Step = 'service' | 'calendar' | 'slots' | 'form' | 'confirm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOW_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

function isDayEnabled(consultorio: ConsultorioPublic, date: Date): boolean {
  const dow = date.getDay();
  return !!(consultorio.workingHours?.[dow.toString()]?.enabled);
}

// ─── ServicePicker ────────────────────────────────────────────────────────────

function ServicePicker({
  consultorio,
  selected,
  onSelect,
}: {
  consultorio: ConsultorioPublic;
  selected: ServiceType | null;
  onSelect: (s: ServiceType) => void;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
      <h2 className="text-base font-semibold text-gray-800 mb-4">¿Qué servicio necesitás?</h2>
      <div className="space-y-2.5">
        {consultorio.serviceTypes.map(st => {
          const color     = st.color || consultorio.color;
          const isSelected = selected?.id === st.id;
          const duration  = st.durationMinutes ?? consultorio.slotDurationMinutes;
          return (
            <button
              key={st.id}
              onClick={() => onSelect(st)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                isSelected
                  ? 'shadow-sm'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
              style={isSelected ? { borderColor: color, background: `${color}08` } : {}}
            >
              <div
                className="w-3 h-10 rounded-full flex-shrink-0"
                style={{ background: color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{st.name}</p>
                {st.description && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{st.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{duration} min</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? 'border-transparent' : 'border-gray-300'
                }`}
                style={isSelected ? { background: color } : {}}
              >
                {isSelected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CalendarPicker ───────────────────────────────────────────────────────────

function CalendarPicker({
  consultorio,
  selected,
  onSelect,
  accentColor,
}: {
  consultorio: ConsultorioPublic;
  selected: Date | null;
  onSelect: (d: Date) => void;
  accentColor: string;
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const today = new Date();

  // Compute the max bookable date based on maxAdvanceDays
  const maxDate = consultorio.maxAdvanceDays > 0
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + consultorio.maxAdvanceDays)
    : null;

  const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
  const end   = addDays(startOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 }), 6);
  const days  = eachDayOfInterval({ start, end });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth(m => subMonths(m, 1))}
          disabled={isBefore(endOfMonth(subMonths(viewMonth, 1)), today)}
          className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-800 capitalize">
          {format(viewMonth, 'MMMM yyyy', { locale: es })}
        </span>
        <button
          onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DOW_SHORT.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map(day => {
          const inMonth    = isSameMonth(day, viewMonth);
          const isPast     = isBefore(day, today) && !isToday(day);
          const isTooFar   = maxDate !== null && day > maxDate;
          const enabled    = inMonth && !isPast && !isTooFar && isDayEnabled(consultorio, day);
          const isSelected = selected ? isSameDay(day, selected) : false;

          return (
            <button
              key={day.toISOString()}
              disabled={!enabled}
              onClick={() => onSelect(day)}
              className={`
                mx-auto w-9 h-9 rounded-xl text-sm font-medium transition-all
                ${!inMonth ? 'invisible' : ''}
                ${enabled && !isSelected ? 'hover:bg-gray-100 text-gray-800 cursor-pointer' : ''}
                ${!enabled && inMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                ${isSelected ? 'text-white shadow-md' : ''}
                ${isToday(day) && !isSelected ? 'ring-2 ring-offset-1 ring-gray-300' : ''}
              `}
              style={isSelected ? { background: accentColor } : {}}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SlotGrid ─────────────────────────────────────────────────────────────────

function SlotGrid({
  slots,
  duration,
  selected,
  color,
  onSelect,
  loading,
}: {
  slots: string[];
  duration: number;
  selected: string | null;
  color: string;
  onSelect: (s: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        <svg className="w-5 h-5 animate-spin mr-2 text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Cargando horarios…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center text-sm text-gray-400">
        <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        No hay turnos disponibles para este día.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map(slot => {
        const isSelected = slot === selected;
        return (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className={`
              py-2.5 px-2 rounded-xl text-sm font-medium border-2 transition-all
              ${isSelected
                ? 'text-white border-transparent shadow-md'
                : 'text-gray-700 border-gray-100 hover:border-gray-300 bg-gray-50 hover:bg-white'
              }
            `}
            style={isSelected ? { background: color, borderColor: color } : {}}
          >
            {slot}
            <span className={`block text-[10px] mt-0.5 ${isSelected ? 'opacity-75' : 'text-gray-400'}`}>
              {duration} min
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main booking page ────────────────────────────────────────────────────────

export default function PublicBookingPage({
  params,
}: {
  params: Promise<{ handle: string; slug: string; locale: string }>;
}) {
  const { handle, slug, locale } = use(params);

  const [consultorio,   setConsultorio]   = useState<ConsultorioPublic | null>(null);
  const [notFound,      setNotFound]      = useState(false);
  const [loadingInfo,   setLoadingInfo]   = useState(true);

  const [step,          setStep]          = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedDate,  setSelectedDate]  = useState<Date | null>(null);
  const [slots,         setSlots]         = useState<string[]>([]);
  const [loadingSlots,  setLoadingSlots]  = useState(false);
  const [selectedSlot,  setSelectedSlot]  = useState<string | null>(null);

  const [form, setForm] = useState({
    patientName:  '',
    patientEmail: '',
    patientPhone: '',
    reason:       '',
  });
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState('');
  const [confirmed,    setConfirmed]    = useState(false);

  // Load consultorio info
  useEffect(() => {
    fetch(`/api/public/u/${handle}/${slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => {
        if (!d) return;
        const c: ConsultorioPublic = d.consultorio;
        setConsultorio(c);
        // If no service types, skip that step
        if (!c.serviceTypes || c.serviceTypes.length === 0) {
          setStep('calendar');
        }
      })
      .finally(() => setLoadingInfo(false));
  }, [handle, slug]);

  // The accent color is the selected service's color (if set), otherwise the consultorio color
  const accentColor = selectedService?.color || consultorio?.color || '#6366f1';

  // The effective duration for the selected service
  const effectiveDuration = selectedService?.durationMinutes ?? consultorio?.slotDurationMinutes ?? 60;

  // Fetch slots when date changes
  const fetchSlots = useCallback(async (date: Date, serviceTypeId?: string) => {
    if (!consultorio) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const url     = `/api/public/u/${handle}/${slug}/slots?date=${dateStr}${serviceTypeId ? `&serviceTypeId=${serviceTypeId}` : ''}`;
      const res     = await fetch(url);
      const data    = await res.json();
      setSlots(data.slots || []);
    } finally {
      setLoadingSlots(false);
    }
  }, [handle, slug, consultorio]);

  const handleServiceSelect = (service: ServiceType) => {
    setSelectedService(service);
    setStep('calendar');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep('slots');
    fetchSlots(date, selectedService?.id);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/public/u/${handle}/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date:          format(selectedDate, 'yyyy-MM-dd'),
          time:          selectedSlot,
          patientName:   form.patientName,
          patientEmail:  form.patientEmail,
          patientPhone:  form.patientPhone,
          reason:        form.reason,
          serviceTypeId: selectedService?.id,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al confirmar el turno');
      }
      setConfirmed(true);
      setStep('confirm');
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / not found states ───────────────────────────────────────────────

  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (notFound || !consultorio) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-800 mb-1">Página no encontrada</h1>
        <p className="text-sm text-gray-500">Este consultorio no tiene reservas habilitadas o no existe.</p>
      </div>
    );
  }

  // ── Confirmation screen ───────────────────────────────────────────────────

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${accentColor}20` }}>
            <svg className="w-8 h-8" fill="none" stroke={accentColor} strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">¡Turno confirmado!</h2>
          <p className="text-sm text-gray-500 mb-5">Tu solicitud fue recibida. Te esperamos.</p>
          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Consultorio</span>
              <span className="font-medium text-gray-800">{consultorio.name}</span>
            </div>
            {selectedService && (
              <div className="flex justify-between">
                <span className="text-gray-500">Servicio</span>
                <span className="font-medium text-gray-800">{selectedService.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha</span>
              <span className="font-medium text-gray-800 capitalize">
                {selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Horario</span>
              <span className="font-medium text-gray-800">{selectedSlot} ({effectiveDuration} min)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nombre</span>
              <span className="font-medium text-gray-800">{form.patientName}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step definitions (dynamic based on whether we have service types) ────────

  const hasServices = consultorio.serviceTypes.length > 0;
  const visibleSteps: Step[] = hasServices
    ? ['service', 'calendar', 'slots', 'form']
    : ['calendar', 'slots', 'form'];
  const stepLabels: Record<Step, string> = {
    service:  'Servicio',
    calendar: 'Fecha',
    slots:    'Horario',
    form:     'Datos',
    confirm:  '',
  };
  const stepIndex = visibleSteps.indexOf(step);

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-1">
          <a
            href={`/${locale}/book/${handle}`}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver al perfil
          </a>
        </div>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: consultorio.color }} />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-800 truncate">
              {consultorio.bookingTitle || consultorio.name}
            </h1>
            {consultorio.description && (
              <p className="text-xs text-gray-500 truncate">{consultorio.description}</p>
            )}
          </div>
        </div>
        {/* Step indicator */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex items-center gap-2">
          {visibleSteps.map((s, i) => {
            const isDone    = i < stepIndex;
            const isCurrent = i === stepIndex;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 ${isCurrent ? 'flex-1' : ''}`}>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                      isDone || isCurrent ? '' : 'bg-gray-100 text-gray-400'
                    }`}
                    style={isDone || isCurrent ? { background: accentColor, color: '#fff' } : {}}
                  >
                    {isDone
                      ? <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      : i + 1
                    }
                  </div>
                  {isCurrent && <span className="text-xs font-medium text-gray-700">{stepLabels[s]}</span>}
                </div>
                {i < visibleSteps.length - 1 && (
                  <div className={`h-px flex-1 ${isDone ? '' : 'bg-gray-200'}`} style={isDone ? { background: accentColor } : {}} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* STEP 0 — Service selection */}
        {step === 'service' && hasServices && (
          <ServicePicker
            consultorio={consultorio}
            selected={selectedService}
            onSelect={handleServiceSelect}
          />
        )}

        {/* STEP — Calendar */}
        {step === 'calendar' && (
          <div className="space-y-4">
            {hasServices && (
              <button
                onClick={() => setStep('service')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Cambiar servicio
              </button>
            )}
            {selectedService && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: `${accentColor}10`, color: accentColor }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                {selectedService.name} · {effectiveDuration} min
              </div>
            )}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Elegí una fecha</h2>
              <CalendarPicker
                consultorio={consultorio}
                selected={selectedDate}
                onSelect={handleDateSelect}
                accentColor={accentColor}
              />
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: accentColor }} />
                  Disponible
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                  No disponible
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP — Slots */}
        {step === 'slots' && selectedDate && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('calendar')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Cambiar fecha
            </button>

            {selectedService && (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: `${accentColor}10`, color: accentColor }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                {selectedService.name} · {effectiveDuration} min
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                  <svg className="w-4 h-4" fill="none" stroke={accentColor} strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 capitalize">
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </p>
                  <p className="text-xs text-gray-400">Seleccioná un horario</p>
                </div>
              </div>
              <SlotGrid
                slots={slots}
                duration={effectiveDuration}
                selected={selectedSlot}
                color={accentColor}
                onSelect={handleSlotSelect}
                loading={loadingSlots}
              />
            </div>
          </div>
        )}

        {/* STEP — Patient form */}
        {step === 'form' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('slots')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Cambiar horario
            </button>

            {/* Summary pill */}
            <div className="flex items-center gap-2 flex-wrap px-4 py-3 rounded-2xl border-2 text-sm font-medium" style={{ borderColor: accentColor, color: accentColor, background: `${accentColor}08` }}>
              {selectedService && (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                  <span>{selectedService.name}</span>
                  <span className="opacity-50">·</span>
                </>
              )}
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="capitalize">{selectedDate && format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}</span>
              <span className="opacity-50">·</span>
              <span>{selectedSlot} ({effectiveDuration} min)</span>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Tus datos</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                {[
                  { key: 'patientName',  label: 'Nombre completo',    type: 'text',  required: true,  placeholder: 'Ej: María García' },
                  { key: 'patientEmail', label: 'Email',              type: 'email', required: false, placeholder: 'Ej: maria@email.com' },
                  { key: 'patientPhone', label: 'Teléfono',           type: 'tel',   required: false, placeholder: 'Ej: +54 9 11 1234-5678' },
                  { key: 'reason',       label: 'Motivo de consulta', type: 'text',  required: false, placeholder: 'Ej: Primera consulta, seguimiento…' },
                ].map(({ key, label, type, required, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {label} {required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={type}
                      required={required}
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 placeholder:text-gray-300 transition-all"
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    />
                  </div>
                ))}

                {submitError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-xl text-xs text-red-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                    </svg>
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !form.patientName}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all mt-2"
                  style={{ background: accentColor }}
                >
                  {submitting ? 'Confirmando…' : 'Confirmar turno'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
