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

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'confirmed', label: 'Google Confirmed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'user confirmed', label: 'User Confirmed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'user waiting', label: 'User Waiting', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'done', label: 'Done', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
];

interface AppointmentListProps {
  appointments: Appointment[];
}

export default function AppointmentList({ appointments: initialAppointments }: AppointmentListProps) {
  const [activeTab, setActiveTab] = useState<'incoming' | 'past'>('incoming');
  const [appointments, setAppointments] = useState(initialAppointments);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      // Optimistic update
      setAppointments(prev => prev.map(app => app._id === appId ? { ...app, status: newStatus } : app));

      const response = await fetch(`/api/appointments/${appId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        // Revert on failure
        const data = await response.json();
        console.error('Failed to update status:', data.error);
        setAppointments(initialAppointments);
      }
    } catch (error) {
      console.error('Network error updating status:', error);
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
              <div className="flex justify-between items-start mb-1 gap-2">
                <h3 className="font-semibold text-foreground truncate">{app.patientName}</h3>
                
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
