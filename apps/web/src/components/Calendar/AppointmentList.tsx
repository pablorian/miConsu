'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Appointment {
  _id: string;
  start: Date | string;
  end: Date | string;
  patientName: string;
  reason: string;
  status: string;
  patientPhone?: string;
  patientEmail?: string;
}

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'confirmed', label: 'Google Confirmed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'user confirmed', label: 'User Confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'user waiting', label: 'User Waiting', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'done', label: 'Done', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
];

const DEFAULT_TEMPLATE = 'Hola {nombre}, te recordamos tu turno el {fecha} a las {hora} hs. ¡Te esperamos! 🗓️';

function buildWhatsAppUrl(phone: string, template: string, patientName: string, date: Date): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const fecha = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hora = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const message = template
    .replace(/\{nombre\}/g, patientName)
    .replace(/\{fecha\}/g, fecha)
    .replace(/\{hora\}/g, hora)
    .replace(/\{profesional\}/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

interface AppointmentListProps {
  appointments: Appointment[];
}

export default function AppointmentList({ appointments: initialAppointments }: AppointmentListProps) {
  const [activeTab, setActiveTab] = useState<'incoming' | 'past'>('incoming');
  const [appointments, setAppointments] = useState(initialAppointments);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState(DEFAULT_TEMPLATE);

  const now = new Date();

  useEffect(() => {
    fetch('/api/user/settings')
      .then(r => r.json())
      .then(data => { if (data.whatsappReminderTemplate) setWhatsappTemplate(data.whatsappReminderTemplate); })
      .catch(() => {});
  }, []);

  // Parse dates if they come as strings
  const parsedAppointments = appointments.map(app => ({
    ...app,
    start: new Date(app.start),
    end: new Date(app.end)
  }));

  const incoming = parsedAppointments
    .filter(app => app.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const past = parsedAppointments
    .filter(app => app.start < now)
    .sort((a, b) => b.start.getTime() - a.start.getTime());

  const displayList = activeTab === 'incoming' ? incoming : past;

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      setAppointments(prev => prev.map(app => app._id === appId ? { ...app, status: newStatus } : app));
      const response = await fetch(`/api/appointments/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        setAppointments(initialAppointments);
      }
    } catch {
      setAppointments(initialAppointments);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-gray-800 h-full flex flex-col">
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'incoming'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
        >
          Próximos ({incoming.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'past'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
        >
          Pasados ({past.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No hay turnos {activeTab === 'incoming' ? 'próximos' : 'pasados'}.
          </div>
        ) : (
          displayList.map((app) => (
            <div
              key={app._id}
              className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-primary/50 dark:hover:border-primary/50 transition-colors bg-gray-50/50 dark:bg-zinc-800/50"
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{app.patientName}</h3>
                  {app.patientPhone && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{app.patientPhone}</span>
                      <a
                        href={buildWhatsAppUrl(app.patientPhone, whatsappTemplate, app.patientName, app.start)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar recordatorio por WhatsApp"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0">
                  <select
                    value={app.status || 'pending'}
                    onChange={(e) => handleStatusChange(app._id, e.target.value)}
                    disabled={updatingId === app._id}
                    className={`text-xs px-2 py-1 rounded-full capitalize appearance-none cursor-pointer pr-6 border-transparent focus:ring-2 focus:ring-primary/50 transition-colors disabled:opacity-50 ${
                      statusOptions.find(o => o.value === app.status)?.color || statusOptions[0].color
                    }`}
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value} className="bg-white dark:bg-zinc-800 text-foreground">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
                    <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-2">{app.reason}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>📅</span>
                  {format(app.start, 'PPP', { locale: es })}
                </div>
                <div className="flex items-center gap-1">
                  <span>🕒</span>
                  {format(app.start, 'p')} - {format(app.end, 'p')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
