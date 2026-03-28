'use client';

import { useState } from 'react';

interface TreatmentPlan {
  _id?: string;
  name: string;
  professional: string;
  status: 'En Progreso' | 'Finalizado' | 'Cancelado';
  notes?: string;
}

interface TreatmentPlanFormProps {
  patientId: string;
  initialData?: TreatmentPlan;
  onClose: () => void;
  onSave: () => void;
}

export default function TreatmentPlanForm({ patientId, initialData, onClose, onSave }: TreatmentPlanFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TreatmentPlan>({
    name: initialData?.name || '',
    professional: initialData?.professional || '',
    status: initialData?.status || 'En Progreso',
    notes: initialData?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = initialData?._id
        ? `/api/patients/${patientId}/treatment-plans/${initialData._id}`
        : `/api/patients/${patientId}/treatment-plans`;
      const method = initialData?._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground">
          {initialData?._id ? 'Editar Plan de Tratamiento' : 'Nuevo Plan de Tratamiento'}
        </h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
          ✕
        </button>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/20 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Nombre del Plan <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Ej: Plan Ortodoncia, Plan Implante..."
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Profesional <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.professional}
            onChange={(e) => setFormData({ ...formData, professional: e.target.value })}
            required
            placeholder="Nombre del profesional"
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Estado</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TreatmentPlan['status'] })}
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="En Progreso">En Progreso</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Notas</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Descripción del plan, observaciones..."
            className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
