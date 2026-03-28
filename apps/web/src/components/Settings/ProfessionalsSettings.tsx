'use client';

import { useState, useEffect } from 'react';

interface Professional {
  _id: string;
  name: string;
  email?: string;
  color?: string;
  percentage?: number;
}

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
  '#ec4899', '#14b8a6',
];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

interface ProfFormProps {
  initial?: Partial<Professional>;
  onSave: (data: Omit<Professional, '_id'>) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

function ProfForm({ initial, onSave, onCancel, loading }: ProfFormProps) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    color: initial?.color || '#6366f1',
    percentage: initial?.percentage ?? 0,
  });

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-primary';
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={inputClass}
            placeholder="Ej: Dra. García"
            autoFocus
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className={inputClass}
            placeholder="prof@clinica.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Porcentaje de liquidación</label>
          <div className="relative">
            <input
              type="number"
              value={form.percentage}
              onChange={e => setForm(f => ({ ...f, percentage: Number(e.target.value) }))}
              min={0} max={100}
              className={inputClass + ' pr-8'}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <label className={labelClass}>Color de avatar</label>
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, color: c }))}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={loading || !form.name.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

export default function ProfessionalsSettings() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchProfessionals = async () => {
    try {
      const res = await fetch('/api/professionals');
      if (res.ok) {
        const data = await res.json();
        setProfessionals(data.professionals || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfessionals(); }, []);

  const handleCreate = async (data: Omit<Professional, '_id'>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al crear');
      setProfessionals(prev => [...prev, json.professional]);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, data: Omit<Professional, '_id'>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/professionals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al actualizar');
      setProfessionals(prev => prev.map(p => p._id === id ? json.professional : p));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar al profesional ${name}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/professionals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setProfessionals(prev => prev.filter(p => p._id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-base font-semibold text-foreground">Profesionales</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Administrá los profesionales de la clínica y su configuración.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEditingId(null); setError(null); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Agregar
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>
      )}

      {/* New professional form */}
      {showForm && (
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-zinc-800/30">
          <p className="text-sm font-medium text-foreground mb-3">Nuevo profesional</p>
          <ProfForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            loading={saving}
          />
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : professionals.length === 0 && !showForm ? (
          <div className="py-14 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-muted-foreground text-sm">No hay profesionales registrados todavía.</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-primary hover:underline">Agregar el primero</button>
          </div>
        ) : (
          professionals.map(prof => (
            <div key={prof._id}>
              {editingId === prof._id ? (
                <div className="p-5 bg-gray-50/50 dark:bg-zinc-800/30">
                  <p className="text-sm font-medium text-foreground mb-3">Editar profesional</p>
                  <ProfForm
                    initial={prof}
                    onSave={(data) => handleUpdate(prof._id, data)}
                    onCancel={() => setEditingId(null)}
                    loading={saving}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors group">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: prof.color || '#6366f1' }}
                  >
                    {getInitials(prof.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{prof.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[prof.email, prof.percentage != null ? `${prof.percentage}% liquidación` : null].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => { setEditingId(prof._id); setShowForm(false); setError(null); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(prof._id, prof.name)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {professionals.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground bg-gray-50/50 dark:bg-zinc-800/30">
          {professionals.length} {professionals.length === 1 ? 'profesional registrado' : 'profesionales registrados'}
        </div>
      )}
    </div>
  );
}
