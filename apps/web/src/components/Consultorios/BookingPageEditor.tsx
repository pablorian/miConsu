'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

interface ConsultorioMini {
  _id: string;
  name: string;
  color: string;
}

interface GoogleCalendarItem {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary: boolean;
}

interface BookingPageData {
  _id?: string;
  consultorioId: string;
  name: string;
  publicSlug: string;
  isEnabled: boolean;
  bookingTitle?: string;
  slotDurationMinutes: number;
  workingHours: Record<string, WorkingDay>;
  maxAdvanceDays: number;
  minAdvanceHours: number;
  bufferMinutes: number;
  maxBookingsPerDay: number;
  serviceTypes: ServiceType[];
  syncToGoogleCalendar?: boolean;
  googleCalendarId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const DURATION_OPTIONS = [
  { value: 15,  label: '15 minutos' },
  { value: 20,  label: '20 minutos' },
  { value: 30,  label: '30 minutos' },
  { value: 45,  label: '45 minutos' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1 hora 30 min' },
  { value: 120, label: '2 horas' },
];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

const SERVICE_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b',
  '#10b981','#3b82f6','#ef4444','#14b8a6',
];

const uid = () => Math.random().toString(36).slice(2, 10);

function toSlug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function defaultWorkingHours(): Record<string, WorkingDay> {
  return {
    '0': { enabled: false, startTime: '09:00', endTime: '18:00' },
    '1': { enabled: true,  startTime: '09:00', endTime: '18:00' },
    '2': { enabled: true,  startTime: '09:00', endTime: '18:00' },
    '3': { enabled: true,  startTime: '09:00', endTime: '18:00' },
    '4': { enabled: true,  startTime: '09:00', endTime: '18:00' },
    '5': { enabled: true,  startTime: '09:00', endTime: '18:00' },
    '6': { enabled: false, startTime: '09:00', endTime: '18:00' },
  };
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3 pl-11">
        {children}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BookingPageEditorProps {
  mode: 'create' | 'edit';
  locale: string;
  pageId?: string;            // edit mode
  consultorioId?: string;     // create mode
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BookingPageEditor({ mode, locale, pageId, consultorioId }: BookingPageEditorProps) {
  const router = useRouter();

  // ── Fetched meta ─────────────────────────────────────────────────────────
  const [consultorio,  setConsultorio]  = useState<ConsultorioMini | null>(null);
  const [userHandle,   setUserHandle]   = useState<string | null>(null);
  const [initLoading,  setInitLoading]  = useState(true);

  // ── Form state ────────────────────────────────────────────────────────────
  const [name,         setName]         = useState('');
  const [publicSlug,   setPublicSlug]   = useState('');
  const [isEnabled,    setIsEnabled]    = useState(true);
  const [bookingTitle, setBookingTitle] = useState('');
  const [slotDuration, setSlotDuration] = useState(60);

  const [workingHours, setWorkingHours] = useState<Record<string, WorkingDay>>(defaultWorkingHours());

  const [maxAdvanceDays,    setMaxAdvanceDays]    = useState(60);
  const [minAdvanceHours,   setMinAdvanceHours]   = useState(4);
  const [maxAdvanceEnabled, setMaxAdvanceEnabled] = useState(true);
  const [minAdvanceEnabled, setMinAdvanceEnabled] = useState(true);

  const [bufferMinutes,    setBufferMinutes]    = useState(0);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState(0);
  const [bufferEnabled,    setBufferEnabled]    = useState(false);
  const [maxDayEnabled,    setMaxDayEnabled]    = useState(false);

  const [serviceTypes,   setServiceTypes]   = useState<ServiceType[]>([]);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);

  // ── Google Calendar sync ──────────────────────────────────────────────────
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState(false);
  const [googleCalendarId,     setGoogleCalendarId]     = useState('');
  const [googleCalendars,      setGoogleCalendars]      = useState<GoogleCalendarItem[]>([]);
  const [googleConnected,      setGoogleConnected]      = useState(false);
  const [googleLoading,        setGoogleLoading]        = useState(true);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  // ── App URL ───────────────────────────────────────────────────────────────
  const [appUrl, setAppUrl] = useState('');
  useEffect(() => { setAppUrl(window.location.origin); }, []);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadPage = useCallback(async (data: BookingPageData) => {
    setName(data.name);
    setPublicSlug(data.publicSlug);
    setIsEnabled(data.isEnabled);
    setBookingTitle(data.bookingTitle || '');
    setSlotDuration(data.slotDurationMinutes ?? 60);
    setWorkingHours(data.workingHours ?? defaultWorkingHours());
    setMaxAdvanceDays(data.maxAdvanceDays ?? 60);
    setMinAdvanceHours(data.minAdvanceHours ?? 4);
    setMaxAdvanceEnabled((data.maxAdvanceDays ?? 60) > 0);
    setMinAdvanceEnabled((data.minAdvanceHours ?? 4) > 0);
    setBufferMinutes(data.bufferMinutes ?? 0);
    setMaxBookingsPerDay(data.maxBookingsPerDay ?? 0);
    setBufferEnabled((data.bufferMinutes ?? 0) > 0);
    setMaxDayEnabled((data.maxBookingsPerDay ?? 0) > 0);
    setServiceTypes(data.serviceTypes ?? []);
    setSyncToGoogleCalendar(data.syncToGoogleCalendar ?? false);
    setGoogleCalendarId(data.googleCalendarId ?? '');
  }, []);

  // Fetch Google Calendar list on mount (independent of page data)
  useEffect(() => {
    let cancelled = false;
    async function fetchGoogleCalendars() {
      setGoogleLoading(true);
      try {
        const r = await fetch('/api/google-calendars');
        const d = await r.json();
        if (cancelled) return;
        setGoogleConnected(d.connected ?? false);
        setGoogleCalendars(d.calendars ?? []);
      } catch {
        // ignore — google section simply won't show
      } finally {
        if (!cancelled) setGoogleLoading(false);
      }
    }
    fetchGoogleCalendars();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setInitLoading(true);
      try {
        // Always fetch user's publicId (handle) for URL display
        const profileRes = await fetch('/api/user/profile');
        const profileData = profileRes.ok ? await profileRes.json() : {};
        if (!cancelled) setUserHandle(profileData.publicId ?? null);

        if (mode === 'edit' && pageId) {
          const r = await fetch(`/api/booking-pages/${pageId}`);
          if (!r.ok) { router.push(`/${locale}/dashboard/consultorios`); return; }
          const { page } = await r.json();
          if (cancelled) return;
          await loadPage(page);
        } else if (mode === 'create') {
          // no extra setup needed — name/slug will be set by the user
        }
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [mode, pageId, consultorioId, locale, router, loadPage]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setDayEnabled = (dow: string, enabled: boolean) =>
    setWorkingHours(prev => ({ ...prev, [dow]: { ...prev[dow], enabled } }));
  const setDayTime = (dow: string, field: 'startTime' | 'endTime', value: string) =>
    setWorkingHours(prev => ({ ...prev, [dow]: { ...prev[dow], [field]: value } }));

  const handleCopy = () => {
    const url = `${appUrl}/${locale}/book/${publicSlug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    if (!publicSlug.trim()) { setError('El slug es requerido'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: name.trim(),
        publicSlug: publicSlug.trim(),
        isEnabled,
        bookingTitle: bookingTitle.trim() || null,
        consultorioId: consultorioId || (mode === 'edit' ? undefined : undefined),
        slotDurationMinutes: slotDuration,
        workingHours,
        maxAdvanceDays:    maxAdvanceEnabled ? maxAdvanceDays : 0,
        minAdvanceHours:   minAdvanceEnabled ? minAdvanceHours : 0,
        bufferMinutes:     bufferEnabled ? bufferMinutes : 0,
        maxBookingsPerDay: maxDayEnabled ? maxBookingsPerDay : 0,
        serviceTypes,
        syncToGoogleCalendar,
        googleCalendarId: syncToGoogleCalendar ? (googleCalendarId || null) : null,
      };

      let res: Response;
      if (mode === 'create') {
        res = await fetch('/api/booking-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, consultorioId }),
        });
      } else {
        res = await fetch(`/api/booking-pages/${pageId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar');
      }

      const data = await res.json();

      if (mode === 'create') {
        // Navigate to the edit page for the newly created page
        router.push(`/${locale}/dashboard/consultorios/reservas/${data.page._id}`);
      }
      // In edit mode, just show a subtle success (no redirect needed)
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Input style helpers ───────────────────────────────────────────────────
  const inputSm  = 'px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50';
  const inputMd  = 'px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full';
  const selectSm = `${inputSm} appearance-none cursor-pointer`;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (initLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-7 h-7 animate-spin text-primary/40" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const bookingUrl = userHandle
    ? `${appUrl}/${locale}/book/${userHandle}/${publicSlug}`
    : `${appUrl}/${locale}/book/${publicSlug}`;
  const profileUrl = userHandle ? `${appUrl}/${locale}/book/${userHandle}` : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">

      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-4">
        {/* Back button */}
        <button
          onClick={() => router.push(`/${locale}/dashboard/consultorios`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Consultorios
        </button>

        <span className="text-gray-300 dark:text-gray-700">/</span>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
            {mode === 'create' ? 'Nueva página de reservas' : (name || 'Editar página')}
          </span>
          {userHandle && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              · @{userHandle}
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {mode === 'create' ? 'Crear página' : 'Guardar cambios'}
            </>
          )}
        </button>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Card: Información básica ──────────────────────────────────── */}
        <SectionCard
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          }
          title="Información básica"
          subtitle="Configurá el nombre y la URL de esta página de reservas."
        >
          {/* Enable toggle */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 -ml-3">
            <div>
              <p className="text-sm font-medium text-foreground">Página habilitada</p>
              <p className="text-xs text-muted-foreground mt-0.5">Los pacientes pueden acceder y reservar turnos</p>
            </div>
            <button
              type="button"
              onClick={() => setIsEnabled(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Internal name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Nombre interno <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Consultas generales"
              className={inputMd}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Solo visible para vos, para identificar esta página.</p>
          </div>

          {/* Public URL slug */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">URL pública</label>

            {!userHandle && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                </svg>
                Necesitás configurar tu identificador público en{' '}
                <a href={`/${locale}/dashboard/settings`} className="underline font-medium">Configuración</a>
                {' '}para que la URL funcione correctamente.
              </div>
            )}

            <div className="flex gap-2 items-center">
              <div className="flex-1 flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-zinc-800 min-w-0">
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  /book/{userHandle ? `${userHandle}/` : ''}
                </span>
                <input
                  value={publicSlug}
                  onChange={e => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none min-w-0"
                  placeholder="mi-pagina"
                />
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {copied
                  ? <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                }
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Ver
              </a>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{bookingUrl}</p>
            {profileUrl && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                Perfil:{' '}
                <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
                  {profileUrl}
                </a>
              </p>
            )}
          </div>

          {/* Booking title */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Título visible para el paciente</label>
            <input
              type="text"
              value={bookingTitle}
              onChange={e => setBookingTitle(e.target.value)}
              placeholder={`Ej: Reservar consulta${consultorio ? ` en ${consultorio.name}` : ''}`}
              className={inputMd}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Aparece como encabezado de la página pública. Si lo dejás vacío se usará el nombre del consultorio.</p>
          </div>
        </SectionCard>

        {/* ── Card: Duración ────────────────────────────────────────────────── */}
        <SectionCard
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Duración de la cita"
          subtitle="¿Cuánto tiempo dura cada cita? Los slots se generarán automáticamente."
        >
          <select
            value={slotDuration}
            onChange={e => setSlotDuration(Number(e.target.value))}
            className={`${selectSm} w-52`}
          >
            {DURATION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </SectionCard>

        {/* ── Card: Disponibilidad ──────────────────────────────────────────── */}
        <SectionCard
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
          }
          title="Disponibilidad general"
          subtitle="Indica qué días y horarios estás disponible para citas."
        >
          <div className="space-y-2">
            {DAY_LABELS.map((label, i) => {
              const dow = i.toString();
              const wh  = workingHours[dow] ?? { enabled: false, startTime: '09:00', endTime: '18:00' };
              return (
                <div key={dow} className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setDayEnabled(dow, !wh.enabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${wh.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wh.enabled ? 'translate-x-4' : ''}`} />
                  </button>
                  {/* Day label */}
                  <span className={`text-xs font-medium w-8 flex-shrink-0 ${wh.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                  {wh.enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={wh.startTime}
                        onChange={e => setDayTime(dow, 'startTime', e.target.value)}
                        className={selectSm}
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-xs text-muted-foreground">—</span>
                      <select
                        value={wh.endTime}
                        onChange={e => setDayTime(dow, 'endTime', e.target.value)}
                        className={selectSm}
                      >
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No disponible</span>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Card: Franja de programación ──────────────────────────────────── */}
        <SectionCard
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          }
          title="Franja de programación"
          subtitle="Limitá el intervalo de tiempo en que se pueden reservar citas."
        >
          {/* Max advance */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="maxAdv"
              checked={maxAdvanceEnabled}
              onChange={e => setMaxAdvanceEnabled(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-primary flex-shrink-0"
            />
            <div className="flex-1">
              <label htmlFor="maxAdv" className="text-sm text-foreground cursor-pointer">
                Tiempo máximo de antelación
              </label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Con cuánta anticipación máxima puede el paciente reservar.</p>
              {maxAdvanceEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={maxAdvanceDays}
                    onChange={e => setMaxAdvanceDays(Math.max(1, Number(e.target.value)))}
                    className={`${inputSm} w-16 text-center`}
                  />
                  <span className="text-xs text-muted-foreground">días</span>
                </div>
              )}
            </div>
          </div>

          {/* Min advance */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="minAdv"
              checked={minAdvanceEnabled}
              onChange={e => setMinAdvanceEnabled(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-primary flex-shrink-0"
            />
            <div className="flex-1">
              <label htmlFor="minAdv" className="text-sm text-foreground cursor-pointer">
                Tiempo mínimo de antelación
              </label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Con cuántas horas de anticipación mínima puede el paciente reservar.</p>
              {minAdvanceEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={0}
                    max={168}
                    value={minAdvanceHours}
                    onChange={e => setMinAdvanceHours(Math.max(0, Number(e.target.value)))}
                    className={`${inputSm} w-16 text-center`}
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Card: Ajustes de cita ─────────────────────────────────────────── */}
        <SectionCard
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          }
          title="Ajustes de cita reservada"
          subtitle="Gestioná las citas reservadas que aparecerán en tu calendario."
        >
          {/* Buffer */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="buf"
              checked={bufferEnabled}
              onChange={e => setBufferEnabled(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-primary flex-shrink-0"
            />
            <div className="flex-1">
              <label htmlFor="buf" className="text-sm text-foreground cursor-pointer">Período entre citas</label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tiempo de descanso o preparación entre turnos consecutivos.</p>
              {bufferEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    step={5}
                    value={bufferMinutes}
                    onChange={e => setBufferMinutes(Math.max(5, Number(e.target.value)))}
                    className={`${inputSm} w-16 text-center`}
                  />
                  <span className="text-xs text-muted-foreground">minutos</span>
                </div>
              )}
            </div>
          </div>

          {/* Max per day */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="maxDay"
              checked={maxDayEnabled}
              onChange={e => setMaxDayEnabled(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-primary flex-shrink-0"
            />
            <div className="flex-1">
              <label htmlFor="maxDay" className="text-sm text-foreground cursor-pointer">Máximo de reservas por día</label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Limitá cuántas citas se pueden reservar en un mismo día.</p>
              {maxDayEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxBookingsPerDay}
                    onChange={e => setMaxBookingsPerDay(Math.max(1, Number(e.target.value)))}
                    className={`${inputSm} w-16 text-center`}
                  />
                  <span className="text-xs text-muted-foreground">citas</span>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── Card: Tipos de servicio ───────────────────────────────────────── */}
        <SectionCard
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          }
          title="Tipos de servicio"
          subtitle="Opcional. Si agregás tipos de servicio, el paciente los elegirá como primer paso. Sin servicios, irá directo al calendario."
        >
          {serviceTypes.length === 0 && !editingService && (
            <p className="text-xs text-muted-foreground py-3 text-center bg-gray-50 dark:bg-zinc-800 rounded-xl">
              Sin servicios — el paciente verá el calendario directamente.
            </p>
          )}

          {serviceTypes.map(st => (
            <div key={st.id} className="flex items-center gap-3 px-3 py-2.5 border border-gray-100 dark:border-gray-800 rounded-xl">
              <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: st.color || consultorio?.color || '#6366f1' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{st.name}</p>
                <p className="text-xs text-muted-foreground">
                  {st.durationMinutes ? `${st.durationMinutes} min` : `${slotDuration} min (heredado)`}
                  {st.description && ` · ${st.description}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingService({ ...st })}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceTypes(prev => prev.filter(s => s.id !== st.id))}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Inline editor */}
          {editingService ? (
            <div className="border-2 border-primary/20 rounded-xl p-4 space-y-3 bg-primary/[0.02]">
              <p className="text-sm font-semibold text-primary">
                {serviceTypes.some(s => s.id === editingService.id) ? 'Editar servicio' : 'Nuevo servicio'}
              </p>
              <input
                type="text"
                placeholder="Nombre visible para el paciente *"
                value={editingService.name}
                onChange={e => setEditingService(prev => prev ? { ...prev, name: e.target.value } : prev)}
                className={inputMd}
              />
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={editingService.description || ''}
                onChange={e => setEditingService(prev => prev ? { ...prev, description: e.target.value } : prev)}
                className={inputMd}
              />
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Duración específica (opcional)</label>
                <select
                  value={editingService.durationMinutes ?? ''}
                  onChange={e => setEditingService(prev => prev ? { ...prev, durationMinutes: e.target.value ? Number(e.target.value) : undefined } : prev)}
                  className={`${selectSm} w-full`}
                >
                  <option value="">Usar duración del calendario ({slotDuration} min)</option>
                  {DURATION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {SERVICE_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingService(prev => prev ? { ...prev, color: c } : prev)}
                      className={`w-6 h-6 rounded-full transition-transform ${editingService.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex-1 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!editingService.name.trim()}
                  onClick={() => {
                    if (!editingService.name.trim()) return;
                    setServiceTypes(prev => {
                      const exists = prev.some(s => s.id === editingService.id);
                      return exists
                        ? prev.map(s => s.id === editingService.id ? editingService : s)
                        : [...prev, editingService];
                    });
                    setEditingService(null);
                  }}
                  className="flex-1 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {serviceTypes.some(s => s.id === editingService.id) ? 'Actualizar' : 'Agregar'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingService({
                id: uid(),
                name: '',
                description: '',
                color: SERVICE_COLORS[serviceTypes.length % SERVICE_COLORS.length],
              })}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar tipo de servicio
            </button>
          )}
        </SectionCard>

        {/* ── Card: Google Calendar sync ────────────────────────────────────── */}
        <SectionCard
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12 12-5.373 12-12S18.628 0 12 0zm-1.25 17.292l-4.5-4.364 1.386-1.414 3.064 2.968 6.836-7.318 1.414 1.317-8.2 8.811z"/>
            </svg>
          }
          title="Sincronización con Google Calendar"
          subtitle={
            googleConnected
              ? 'Los eventos reservados se crearán automáticamente en tu Google Calendar.'
              : undefined
          }
        >
          {googleLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verificando conexión…
            </div>
          ) : !googleConnected ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Google Calendar no conectado</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Conectá tu cuenta en{' '}
                  <a href={`/${locale}/dashboard/settings`} className="underline font-medium">
                    Configuración → Integraciones
                  </a>{' '}
                  para habilitar esta función.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Enable toggle */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 -ml-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Crear eventos en Google Calendar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cada reserva nueva generará un evento en tu calendario
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncToGoogleCalendar(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${syncToGoogleCalendar ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${syncToGoogleCalendar ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              {/* Calendar picker */}
              {syncToGoogleCalendar && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Calendario destino
                  </label>
                  <select
                    value={googleCalendarId}
                    onChange={e => setGoogleCalendarId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
                  >
                    <option value="">— Seleccioná un calendario —</option>
                    {googleCalendars.map(cal => (
                      <option key={cal.id} value={cal.id ?? ''}>
                        {cal.primary ? `${cal.summary} (principal)` : cal.summary}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Los eventos de reserva aparecerán en este calendario de Google.
                  </p>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* ── Card: Políticas (próximamente) ─────────────────────────────────── */}
        <SectionCard
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
          title="Políticas de pago y cancelación"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-dashed border-gray-200 dark:border-gray-700">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-gray-200 dark:bg-zinc-700 rounded-full flex-shrink-0">
              Próximamente
            </span>
            <p className="text-sm text-muted-foreground">Configurá políticas de pago, señas y cancelaciones.</p>
          </div>
        </SectionCard>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
