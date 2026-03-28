'use client';

import { useState, useEffect } from 'react';

interface PublicHandleEditorProps {
  initialHandle: string | null;
  locale: string;
}

export default function PublicHandleEditor({ initialHandle, locale }: PublicHandleEditorProps) {
  const [handle, setHandle]     = useState(initialHandle ?? '');
  const [saved,  setSaved]      = useState(initialHandle ?? '');
  const [saving, setSaving]     = useState(false);
  const [error,  setError]      = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const profileUrl = saved ? `${appUrl}/${locale}/book/${saved}` : null;

  const isDirty = handle.trim().toLowerCase() !== saved;

  const handleSave = async () => {
    const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) { setError('El handle no puede estar vacío'); return; }
    if (clean.length < 3) { setError('Mínimo 3 caracteres'); return; }
    if (clean.length > 30) { setError('Máximo 30 caracteres'); return; }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al guardar');
      } else {
        setSaved(clean);
        setHandle(clean);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Handle público <span className="text-red-400">*</span>
          </label>
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/60 transition-all">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-gray-50 dark:bg-zinc-800 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap select-none">
              @
            </span>
            <input
              type="text"
              value={handle}
              onChange={e => {
                setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                setError(null);
                setSuccess(false);
              }}
              placeholder="tu-handle"
              maxLength={30}
              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
            />
            <span className="px-3 text-xs text-muted-foreground select-none">{handle.length}/30</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Solo letras minúsculas, números, guiones y guiones bajos. Mínimo 3 caracteres.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !isDirty || !handle}
          className="mt-6 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Handle guardado correctamente
        </div>
      )}

      {/* Profile URL preview */}
      {profileUrl && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <p className="flex-1 text-xs text-muted-foreground font-mono truncate">{profileUrl}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              title="Copiar enlace"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              title="Abrir perfil público"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
