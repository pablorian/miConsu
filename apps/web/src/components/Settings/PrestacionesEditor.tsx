'use client';

import { useState, useEffect } from 'react';

interface PrestacionItem {
  _id: string;
  name: string;
  price: number;
  description: string;
}

const EMPTY_FORM = { name: '', price: '', description: '' };

export default function PrestacionesEditor() {
  const [items, setItems]       = useState<PrestacionItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing]   = useState<PrestacionItem | null>(null); // null = new
  const [form, setForm]         = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prestaciones');
      const d = await res.json();
      setItems(d.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (item: PrestacionItem) => {
    setEditing(item);
    setForm({ name: item.name, price: String(item.price), description: item.description });
    setError(null);
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    setError(null);
    try {
      const body = { name: form.name.trim(), price: parseFloat(form.price) || 0, description: form.description.trim() };
      let res: Response;
      if (editing) {
        res = await fetch(`/api/prestaciones/${editing._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/prestaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Error al guardar'); return; }
      if (editing) {
        setItems(prev => prev.map(i => i._id === editing._id ? d.item : i));
      } else {
        setItems(prev => [...prev, d.item].sort((a, b) => a.name.localeCompare(b.name)));
      }
      cancel();
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta prestación del catálogo?')) return;
    setDeleting(id);
    await fetch(`/api/prestaciones/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i._id !== id));
    setDeleting(null);
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="space-y-4">
      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <svg className="w-5 h-5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : items.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div>
            <p className="text-sm font-medium text-foreground">Sin prestaciones configuradas</p>
            <p className="text-xs text-muted-foreground mt-0.5">Agregá tus prestaciones habituales para agilizar el registro</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          {items.map(item => (
            <div key={item._id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums flex-shrink-0">
                ${item.price.toLocaleString('es-AR')}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                  title="Editar"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  disabled={deleting === item._id}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-40"
                  title="Eliminar"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="border-2 border-primary/20 bg-primary/[0.02] dark:bg-primary/5 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            {editing ? 'Editar prestación' : 'Nueva prestación'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Consulta general"
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Precio</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className={inputCls + ' pl-7'}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Descripción <span className="opacity-60">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Descripción breve"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={cancel}
              className="flex-1 py-2 text-xs font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="flex-1 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar prestación
        </button>
      )}
    </div>
  );
}
