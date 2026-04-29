'use client';

import { useState, useEffect } from 'react';

const DEFAULT_TEMPLATE = 'Hola {nombre}, te recordamos tu turno el {fecha} a las {hora} hs. ¡Te esperamos! 🗓️';

export default function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  useEffect(() => {
    fetch('/api/user/settings')
      .then(r => r.json())
      .then(data => setTemplate(data.whatsappReminderTemplate ?? DEFAULT_TEMPLATE))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappReminderTemplate: template }),
      });
      if (res.ok) {
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
    return <div className="h-20 bg-gray-100 dark:bg-zinc-800 rounded-lg animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-foreground block mb-1.5">
          Mensaje predeterminado
        </label>
        <textarea
          value={template}
          onChange={e => setTemplate(e.target.value)}
          rows={3}
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Variables disponibles:{' '}
          <code className="bg-gray-100 dark:bg-zinc-700 px-1 rounded text-xs">{'{nombre}'}</code>{' '}
          <code className="bg-gray-100 dark:bg-zinc-700 px-1 rounded text-xs">{'{fecha}'}</code>{' '}
          <code className="bg-gray-100 dark:bg-zinc-700 px-1 rounded text-xs">{'{hora}'}</code>{' '}
          <code className="bg-gray-100 dark:bg-zinc-700 px-1 rounded text-xs">{'{profesional}'}</code>
          <span className="block mt-1 text-muted-foreground/70">{'{profesional}'} solo aparece si el turno tiene una prestación asignada con profesional.</span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        {saved && (
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Guardado
          </p>
        )}
        <button
          onClick={() => setTemplate(DEFAULT_TEMPLATE)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Restaurar predeterminado
        </button>
      </div>
    </div>
  );
}
