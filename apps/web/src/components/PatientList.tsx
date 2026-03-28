'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  _id: string;
  name: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dni?: string;
  lastAttendedDate?: string | null;
}

interface Solicitud {
  _id: string;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  reason?: string;
  start?: string;
  status?: string;
}

type TabId = 'activos' | 'solicitudes' | 'rechazados';

interface PatientListProps {
  patients: Patient[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string, lastName?: string): string {
  const first = (lastName || name || '').charAt(0).toUpperCase();
  const second = lastName ? name.charAt(0).toUpperCase() : (name.charAt(1) || '').toUpperCase();
  return first + second;
}

function formatLastAttended(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es }); }
  catch { return '—'; }
}

// ─── Vincular Modal ──────────────────────────────────────────────────────────

interface VincularModalProps {
  solicitud: Solicitud;
  patients: Patient[];
  onClose: () => void;
  onLinked: () => void;
}

function VincularModal({ solicitud, patients, onClose, onLinked }: VincularModalProps) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients.slice(0, 10);
    return patients.filter(p => {
      const full = `${p.lastName || ''} ${p.name || ''} ${p.dni || ''} ${p.email || ''}`.toLowerCase();
      return full.includes(q);
    }).slice(0, 10);
  }, [patients, search]);

  const handleLink = async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${solicitud._id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link', patientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al vincular');
      onLinked();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-foreground">Vincular solicitud a paciente</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Asociá <strong>{solicitud.patientName}</strong> a un paciente ya registrado.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4 text-lg">✕</button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>}
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI o email..."
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-center text-muted-foreground">Sin resultados</div>
            ) : filtered.map(p => (
              <button key={p._id} type="button" disabled={loading} onClick={() => handleLink(p._id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(p._id)}`}>
                  {getInitials(p.name, p.lastName)}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{[p.lastName, p.name].filter(Boolean).join(', ')}</div>
                  <div className="text-xs text-muted-foreground">{[p.dni, p.email, p.phone].filter(Boolean).join(' · ')}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dar de alta Modal ───────────────────────────────────────────────────────

interface DarDeAltaModalProps {
  solicitud: Solicitud;
  onClose: () => void;
  onCreated: (patientId: string) => void;
}

function DarDeAltaModal({ solicitud, onClose, onCreated }: DarDeAltaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameParts = solicitud.patientName?.split(' ') || [];
  const [form, setForm] = useState({
    name: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || '',
    email: solicitud.patientEmail || '',
    phone: solicitud.patientPhone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${solicitud._id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear');
      onCreated(data.patientId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-foreground">Dar de alta paciente</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Se crea un nuevo paciente con los datos de la solicitud.</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-4 text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
              {loading ? 'Creando...' : 'Dar de alta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Solicitud Row ────────────────────────────────────────────────────────────

interface SolicitudRowProps {
  s: Solicitud;
  onDarDeAlta: () => void;
  onVincular: () => void;
  onDismiss: () => void;
}

function SolicitudRow({ s, onDarDeAlta, onVincular, onDismiss }: SolicitudRowProps) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
      <td className="px-4 py-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(s._id)}`}>
          {(s.patientName || '?').slice(0, 2).toUpperCase()}
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-foreground">{s.patientName || '—'}</td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{s.patientEmail || '—'}</td>
      <td className="px-4 py-3">
        {s.patientPhone ? (
          <a href={`https://wa.me/${s.patientPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs" onClick={e => e.stopPropagation()}>
            {s.patientPhone}
          </a>
        ) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
        {s.start ? format(new Date(s.start), "dd/MM/yyyy HH:mm", { locale: es }) : '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{s.reason || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          <button type="button" onClick={onDismiss}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 hover:text-foreground transition whitespace-nowrap"
            title="Desestimar solicitud">
            Desestimar
          </button>
          <button type="button" onClick={onVincular}
            className="px-3 py-1.5 text-xs font-medium text-foreground border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition whitespace-nowrap">
            Vincular
          </button>
          <button type="button" onClick={onDarDeAlta}
            className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition whitespace-nowrap">
            Dar de alta
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Shared Table Headers ─────────────────────────────────────────────────────

function SolicitudTableHeaders({ showActions = true }: { showActions?: boolean }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <th className="w-12 px-4 py-3" />
      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Teléfono</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Turno</th>
      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Motivo</th>
      {showActions && <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Acciones</th>}
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatientList({ patients }: PatientListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('activos');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Solicitudes/Rechazados state
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [rechazados, setRechazados] = useState<Solicitud[]>([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [vincularTarget, setVincularTarget] = useState<Solicitud | null>(null);
  const [darDeAltaTarget, setDarDeAltaTarget] = useState<Solicitud | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState<string | null>(null);

  const fetchSolicitudes = useCallback(async () => {
    setSolicitudesLoading(true);
    try {
      const [solRes, rechRes] = await Promise.all([
        fetch('/api/appointments/solicitudes'),
        fetch('/api/appointments/rechazados'),
      ]);
      if (solRes.ok) setSolicitudes((await solRes.json()).solicitudes || []);
      if (rechRes.ok) setRechazados((await rechRes.json()).rechazados || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSolicitudesLoading(false);
    }
  }, []);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  const handleDismiss = async (s: Solicitud) => {
    if (!confirm(`¿Desestimar la solicitud de ${s.patientName}? El turno quedará libre.`)) return;
    try {
      await fetch(`/api/appointments/${s._id}/dismiss`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      fetchSolicitudes();
    } catch (err) { console.error(err); }
  };

  const handleRestore = async (s: Solicitud) => {
    try {
      await fetch(`/api/appointments/${s._id}/dismiss`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restore: true }) });
      fetchSolicitudes();
    } catch (err) { console.error(err); }
  };

  const handleResync = async () => {
    setResyncing(true);
    setResyncResult(null);
    try {
      const res = await fetch('/api/appointments/resync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResyncResult(`✓ Sincronizado: ${data.updated} actualizados, ${data.matched} vinculados automáticamente`);
        fetchSolicitudes();
        router.refresh();
      } else {
        setResyncResult(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setResyncResult(`Error: ${err.message}`);
    } finally {
      setResyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p => {
      const fullName = `${p.lastName || ''} ${p.name || ''}`.toLowerCase();
      const dni = (p.dni || '').toLowerCase();
      return fullName.includes(q) || dni.includes(q);
    });
  }, [patients, search]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!confirm('¿Eliminar este paciente? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.refresh();
    } catch {
      alert('Error al eliminar el paciente');
    } finally {
      setDeletingId(null);
    }
  };

  const pendingCount = solicitudes.length;
  const rechazadosCount = rechazados.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-foreground">Pacientes</h1>
        <div className="flex items-center gap-3 ml-auto">
          {activeTab === 'activos' && (
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o documento..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
              />
            </div>
          )}
          <Link href="/dashboard/patients/new"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo paciente
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-1">
        {([
          { id: 'activos', label: 'Activos', badge: patients.length, badgeClass: 'bg-gray-100 dark:bg-zinc-800 text-muted-foreground' },
          { id: 'solicitudes', label: 'Solicitudes', badge: pendingCount, badgeClass: pendingCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold' : 'bg-gray-100 dark:bg-zinc-800 text-muted-foreground' },
          { id: 'rechazados', label: 'Rechazados', badge: rechazadosCount, badgeClass: 'bg-gray-100 dark:bg-zinc-800 text-muted-foreground' },
        ] as const).map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'}`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${tab.badgeClass}`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: ACTIVOS ── */}
      {activeTab === 'activos' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {patients.length === 0 ? (
            <div className="py-16 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="text-muted-foreground text-sm">No hay pacientes registrados todavía.</p>
              <Link href="/dashboard/patients/new" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                Agregar primer paciente
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="w-12 px-4 py-3" />
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Apellido</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">DNI</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Última atención</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Teléfono</th>
                      <th className="w-12 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">No se encontraron resultados para &ldquo;{search}&rdquo;</td></tr>
                    ) : filtered.map(patient => (
                      <tr key={patient._id} onClick={() => router.push(`/dashboard/patients/${patient._id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors group">
                        <td className="px-4 py-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(patient._id)}`}>
                            {getInitials(patient.name, patient.lastName)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{patient.lastName || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-foreground">{patient.name || <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3 text-muted-foreground">{patient.dni || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatLastAttended(patient.lastAttendedDate)}</td>
                        <td className="px-4 py-3">
                          {patient.phone
                            ? <a href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-emerald-600 dark:text-emerald-400 hover:underline">{patient.phone}</a>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <button type="button" onClick={() => setOpenMenuId(openMenuId === patient._id ? null : patient._id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                              </svg>
                            </button>
                            {openMenuId === patient._id && (
                              <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                                <button type="button" onClick={() => { setOpenMenuId(null); router.push(`/dashboard/patients/${patient._id}`); }}
                                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-gray-50 dark:hover:bg-zinc-700 flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                  Editar paciente
                                </button>
                                <button type="button" onClick={(e) => handleDelete(e, patient._id)} disabled={deletingId === patient._id}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50">
                                  {deletingId === patient._id
                                    ? <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>}
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground bg-gray-50/50 dark:bg-zinc-800/30">
                Mostrando {filtered.length} de {patients.length} {patients.length === 1 ? 'paciente' : 'pacientes'}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: SOLICITUDES ── */}
      {activeTab === 'solicitudes' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {solicitudesLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Cargando solicitudes...</div>
          ) : (
            <>
              {/* Banner info + resync */}
              <div className="flex items-start justify-between gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30">
                <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Reservas sin paciente vinculado. Podés <strong>dar de alta</strong>, <strong>vincular</strong> o <strong>desestimar</strong>.</span>
                </div>
                <button type="button" onClick={handleResync} disabled={resyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition disabled:opacity-50 whitespace-nowrap flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${resyncing ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  {resyncing ? 'Sincronizando...' : 'Re-sincronizar'}
                </button>
              </div>
              {resyncResult && (
                <div className={`px-4 py-2 text-xs border-b ${resyncResult.startsWith('✓') ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border-green-100' : 'bg-red-50 dark:bg-red-900/10 text-red-600 border-red-100'}`}>
                  {resyncResult}
                </div>
              )}

              {solicitudes.length === 0 ? (
                <div className="py-14 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.47 2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <p className="text-muted-foreground text-sm">No hay solicitudes pendientes.</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Las nuevas reservas sin match aparecerán acá.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><SolicitudTableHeaders /></thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {solicitudes.map(s => (
                          <SolicitudRow key={s._id} s={s}
                            onDarDeAlta={() => setDarDeAltaTarget(s)}
                            onVincular={() => setVincularTarget(s)}
                            onDismiss={() => handleDismiss(s)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground bg-gray-50/50 dark:bg-zinc-800/30">
                    {solicitudes.length} {solicitudes.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: RECHAZADOS ── */}
      {activeTab === 'rechazados' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {rechazados.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm">No hay solicitudes desestimadas.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-gray-800 text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                Estas solicitudes fueron desestimadas. Podés restaurarlas al queue pendiente si cambió el criterio.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><SolicitudTableHeaders showActions={true} /></thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {rechazados.map(s => (
                      <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors opacity-70">
                        <td className="px-4 py-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(s._id)}`}>
                            {(s.patientName || '?').slice(0, 2).toUpperCase()}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{s.patientName || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{s.patientEmail || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{s.patientPhone || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {s.start ? format(new Date(s.start), "dd/MM/yyyy HH:mm", { locale: es }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{s.reason || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => handleRestore(s)}
                            className="px-3 py-1.5 text-xs font-medium text-foreground border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition whitespace-nowrap">
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground bg-gray-50/50 dark:bg-zinc-800/30">
                {rechazados.length} {rechazados.length === 1 ? 'solicitud desestimada' : 'solicitudes desestimadas'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {vincularTarget && (
        <VincularModal solicitud={vincularTarget} patients={patients}
          onClose={() => setVincularTarget(null)}
          onLinked={() => { setVincularTarget(null); fetchSolicitudes(); router.refresh(); }}
        />
      )}
      {darDeAltaTarget && (
        <DarDeAltaModal solicitud={darDeAltaTarget}
          onClose={() => setDarDeAltaTarget(null)}
          onCreated={(patientId) => { setDarDeAltaTarget(null); fetchSolicitudes(); router.refresh(); router.push(`/dashboard/patients/${patientId}`); }}
        />
      )}
    </div>
  );
}
