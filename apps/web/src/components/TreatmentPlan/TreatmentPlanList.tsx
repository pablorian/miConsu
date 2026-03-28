'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface TreatmentPlan {
  _id: string;
  name: string;
  professional: string;
  status: 'En Progreso' | 'Finalizado' | 'Cancelado';
  notes?: string;
  createdAt: string;
}

interface TreatmentPlanListProps {
  patientId: string;
  onEdit: (plan: TreatmentPlan) => void;
  onNew: () => void;
  refreshTrigger: number;
}

const STATUS_COLORS: Record<string, string> = {
  'En Progreso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Finalizado': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Cancelado': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function TreatmentPlanList({ patientId, onEdit, onNew, refreshTrigger }: TreatmentPlanListProps) {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) fetchPlans();
  }, [patientId, refreshTrigger]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/patients/${patientId}/treatment-plans`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Failed to fetch treatment plans', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro que desea eliminar este plan de tratamiento?')) return;
    try {
      const res = await fetch(`/api/patients/${patientId}/treatment-plans/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPlans();
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">Cargando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Planes de Tratamiento</h3>
        <button
          type="button"
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition"
        >
          <span className="text-base leading-none">+</span> Crear Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="p-10 text-center border border-dashed rounded-lg text-muted-foreground">
          No hay planes de tratamiento registrados.
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Profesional</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha de Creación</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {plans.map((plan) => (
                <tr key={plan._id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{plan.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{plan.professional}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status] || ''}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(plan.createdAt), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => onEdit(plan)}
                      className="text-primary hover:underline text-sm"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan._id)}
                      className="text-red-500 hover:underline text-sm"
                    >
                      Eliminar
                    </button>
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
