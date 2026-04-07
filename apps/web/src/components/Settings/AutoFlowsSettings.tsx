'use client';

import { useState, useEffect } from 'react';

export default function AutoFlowsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFichas, setAutoFichas] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/user/settings')
      .then(r => r.json())
      .then(data => {
        setAutoFichas(data.autoGenerateFichasObrasSociales ?? false);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (newValue: boolean) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoGenerateFichasObrasSociales: newValue }),
      });
      if (res.ok) {
        setAutoFichas(newValue);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-10 h-5 rounded-full bg-gray-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-3 w-48 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle row */}
      <div className="flex items-start justify-between gap-4 py-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Generar tareas automáticas para presentación de fichas de obras sociales
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Al completar un turno con prestación asignada, se creará automáticamente una tarea en el tablero
            <span className="font-medium"> "Fichas obra sociales"</span> con el estado inicial <span className="font-medium">"Sin presentar"</span>.
          </p>
        </div>
        <button
          disabled={saving}
          onClick={() => toggle(!autoFichas)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 ${
            autoFichas ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'
          }`}
          role="switch"
          aria-checked={autoFichas}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              autoFichas ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {saved && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Configuración guardada
        </p>
      )}
    </div>
  );
}
