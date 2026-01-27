'use client';

import { useState } from 'react';
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

interface AppointmentListProps {
  appointments: Appointment[];
}

export default function AppointmentList({ appointments }: AppointmentListProps) {
  const [activeTab, setActiveTab] = useState<'incoming' | 'past'>('incoming');

  const now = new Date();

  // Parse dates if they come as strings
  const parsedAppointments = appointments.map(app => ({
    ...app,
    start: new Date(app.start),
    end: new Date(app.end)
  }));

  const incoming = parsedAppointments
    .filter(app => app.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime()); // Sooner to future

  const past = parsedAppointments
    .filter(app => app.start < now)
    .sort((a, b) => b.start.getTime() - a.start.getTime()); // Newest to older

  const displayList = activeTab === 'incoming' ? incoming : past;

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
          Incoming ({incoming.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'past'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-gray-50 dark:hover:bg-zinc-800'
            }`}
        >
          Past ({past.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No {activeTab} appointments found.
          </div>
        ) : (
          displayList.map((app) => (
            <div
              key={app._id}
              className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-primary/50 dark:hover:border-primary/50 transition-colors bg-gray-50/50 dark:bg-zinc-800/50"
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-foreground">{app.patientName}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${app.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    app.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                  {app.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{app.reason}</p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="text-lg">📅</span>
                  {format(app.start, 'PPP', { locale: es })}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">🕒</span>
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
