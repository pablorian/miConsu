'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface BoardStatus { _id: string; name: string; color: string; order: number; }
interface Board { _id: string; name: string; description?: string; statuses: BoardStatus[]; isDefault?: boolean; createdAt: string; }

export default function BoardsClient() {
  const params = useParams();
  const locale = (params?.locale as string) || 'es';

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(d => { setBoards(d.boards || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBoards(prev => [...prev, data.board]);
      setForm({ name: '', description: '' });
      setShowForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el tablero "${name}" y todas sus tareas?`)) return;
    const res = await fetch(`/api/boards/${id}`, { method: 'DELETE' });
    if (res.ok) setBoards(prev => prev.filter(b => b._id !== id));
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tableros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organizá tareas en tableros estilo Kanban</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(''); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo tablero
        </button>
      </div>

      {/* New board form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Nuevo tablero</p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre <span className="text-red-400">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Ej: Seguimiento de pacientes" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Descripción</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Descripción opcional" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving || !form.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? 'Creando…' : 'Crear tablero'}
            </button>
          </div>
        </form>
      )}

      {/* Boards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Cargando…</div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="w-12 h-12 text-muted-foreground/20 mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-muted-foreground text-sm">No hay tableros todavía</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-primary hover:underline">Crear el primero</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => {
            const sorted = [...board.statuses].sort((a, b) => a.order - b.order);
            return (
              <div key={board._id} className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all">
                <Link href={`/${locale}/dashboard/boards/${board._id}`} className="block p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {board.isDefault && (
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Por defecto</span>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{board.name}</h3>
                  {board.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{board.description}</p>}

                  {/* Status pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {sorted.map(s => (
                      <span key={s._id} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                        {s.name}
                      </span>
                    ))}
                  </div>
                </Link>

                {/* Delete button */}
                <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-2 flex justify-end">
                  <button
                    onClick={() => handleDelete(board._id, board.name)}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
