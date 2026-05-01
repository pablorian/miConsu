'use client';

import { useEffect, useState, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Connection {
  _id: string;
  clientId: string | null;
  clientName: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
}

export default function MCPConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/oauth/connections');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las conexiones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const handleRevoke = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setRevokingId(id);
    try {
      const res = await fetch(`/api/oauth/connections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConnections(prev => prev.filter(c => c._id !== id));
        setConfirmId(null);
      }
    } catch (err) { console.error(err); }
    finally { setRevokingId(null); }
  };

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Cargando conexiones…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 px-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
        {error}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="py-8 text-center bg-gray-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-foreground">No hay aplicaciones conectadas</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          Cuando conectes miConsu a Claude u otra app vía MCP, aparecerá acá y vas a poder revocar el acceso en cualquier momento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {connections.map(conn => {
        const created = new Date(conn.createdAt);
        const expires = new Date(conn.expiresAt);
        const lastUsed = conn.lastUsedAt ? new Date(conn.lastUsedAt) : null;
        const isConfirming = confirmId === conn._id;
        const isRevoking = revokingId === conn._id;

        return (
          <div
            key={conn._id}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl"
          >
            <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{conn.clientName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conectado el {format(created, "d 'de' MMM yyyy", { locale: es })}
                {' · '}
                {lastUsed
                  ? <>Usado {formatDistanceToNow(lastUsed, { locale: es, addSuffix: true })}</>
                  : <>Sin uso registrado</>
                }
                {' · '}
                Expira el {format(expires, "d 'de' MMM", { locale: es })}
              </p>
            </div>

            <button
              onClick={() => handleRevoke(conn._id)}
              disabled={isRevoking}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 ${
                isConfirming
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-900/40'
              }`}
            >
              {isRevoking ? 'Revocando…' : isConfirming ? '¿Confirmar?' : 'Revocar'}
            </button>
          </div>
        );
      })}

      {confirmId && (
        <button
          onClick={() => setConfirmId(null)}
          className="self-end text-xs text-muted-foreground hover:text-foreground mt-1"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
