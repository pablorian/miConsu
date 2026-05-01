'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const client_id = searchParams.get('client_id') || '';
  const redirect_uri = searchParams.get('redirect_uri') || '';
  const code_challenge = searchParams.get('code_challenge') || '';
  const code_challenge_method = searchParams.get('code_challenge_method') || 'S256';
  const state = searchParams.get('state') || '';
  const response_type = searchParams.get('response_type') || '';

  const isValidRequest = response_type === 'code' && redirect_uri && code_challenge;

  async function handleAuthorize() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id, redirect_uri, code_challenge, code_challenge_method, state }),
      });

      if (res.status === 401) {
        document.cookie = `oauth_pending=${encodeURIComponent(window.location.search)}; path=/; max-age=600`;
        const locale = document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] || 'es';
        router.push(`/${locale}/login`);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error_description || data.error || 'Error al autorizar');
        return;
      }

      window.location.href = data.redirect_to;
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleDeny() {
    const url = new URL(redirect_uri);
    url.searchParams.set('error', 'access_denied');
    if (state) url.searchParams.set('state', state);
    window.location.href = url.toString();
  }

  if (!isValidRequest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-red-500 text-4xl mb-4">✗</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Solicitud inválida</h1>
          <p className="text-gray-500 text-sm">Los parámetros de autorización son incorrectos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-8 max-w-sm w-full">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-6">
            {/* miConsu logo */}
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
              M
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </div>
            {/* Claude logo */}
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
              C
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-900 dark:text-white text-center">
            Claude quiere acceder a miConsu
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center mt-2">
            Esto permitirá a Claude gestionar fichas de pacientes y odontogramas en tu cuenta.
          </p>
        </div>

        {/* Permissions */}
        <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Claude podrá:</p>
          {[
            'Buscar pacientes por nombre',
            'Crear pacientes nuevos con su ficha médica completa',
            'Actualizar datos, obra social y antecedentes de pacientes',
            'Ver y actualizar el odontograma de un paciente',
            'Subir imágenes al historial del paciente en Google Drive',
          ].map(perm => (
            <div key={perm} className="flex items-start gap-3">
              <span className="text-blue-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{perm}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAuthorize}
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Autorizando...' : 'Autorizar'}
          </button>
          <button
            onClick={handleDeny}
            disabled={loading}
            className="w-full h-11 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 disabled:opacity-60 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-colors"
          >
            Denegar
          </button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          Podés revocar este acceso en cualquier momento desde la configuración de Claude.
        </p>
      </div>
    </div>
  );
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense>
      <AuthorizeContent />
    </Suspense>
  );
}
