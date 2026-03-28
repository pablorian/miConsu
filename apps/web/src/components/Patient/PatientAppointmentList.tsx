'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Appointment {
  _id: string;
  start: string;
  end: string;
  patientName: string;
  reason: string;
  status: string;
  calendarId: string;
}

interface PatientAppointmentListProps {
  patientId: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  'user confirmed': 'Confirmado',
  'user waiting': 'En Espera',
  done: 'Realizado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'user confirmed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'user waiting': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function PatientAppointmentList({ patientId }: PatientAppointmentListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) fetchAppointments();
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/patients/${patientId}/appointments`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments);
      }
    } catch (error) {
      console.error('Failed to fetch appointments', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Turnos</h3>

      {appointments.length === 0 ? (
        <div className="p-10 text-center border border-dashed rounded-lg text-muted-foreground">
          No hay turnos registrados para este paciente.
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hora</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Motivo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {appointments.map((appt) => (
                <tr key={appt._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-foreground">
                    {format(new Date(appt.start), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(appt.start), 'HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-foreground">{appt.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[appt.status] || ''}`}>
                      {STATUS_LABELS[appt.status] || appt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
