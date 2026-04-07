'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BoardStatus {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface Board {
  _id: string;
  name: string;
  description?: string;
  statuses: BoardStatus[];
}

type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

interface Task {
  _id: string;
  boardId: string;
  title: string;
  description?: string;
  statusId: string;
  priority: Priority;
  dueDate?: string;
  order: number;
  createdAt: string;
  // Ficha metadata
  patientId?: string;
  patientName?: string;
  prestacion?: string;
  obraSocial?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  none:   { label: 'Sin prioridad', color: 'text-muted-foreground', dot: 'bg-gray-300 dark:bg-gray-600' },
  low:    { label: 'Baja',          color: 'text-blue-500',         dot: 'bg-blue-400' },
  medium: { label: 'Media',         color: 'text-yellow-500',       dot: 'bg-yellow-400' },
  high:   { label: 'Alta',          color: 'text-orange-500',       dot: 'bg-orange-400' },
  urgent: { label: 'Urgente',       color: 'text-red-500',          dot: 'bg-red-400' },
};

// ─── Task Form Modal ────────────────────────────────────────────────────────────

interface TaskFormProps {
  board: Board;
  task?: Task | null;
  defaultStatusId?: string;
  onClose: () => void;
  onSaved: (task: Task, isNew: boolean) => void;
}

function TaskFormModal({ board, task, defaultStatusId, onClose, onSaved }: TaskFormProps) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title:       task?.title || '',
    description: task?.description || '',
    statusId:    task?.statusId || defaultStatusId || board.statuses[0]?._id || '',
    priority:    (task?.priority || 'none') as Priority,
    dueDate:     task?.dueDate ? task.dueDate.slice(0, 10) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputCls = 'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const labelCls = 'block text-xs font-medium text-muted-foreground mb-1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio'); return; }
    setLoading(true); setError('');
    try {
      const url = isEdit
        ? `/api/boards/${task!.boardId}/tasks/${task!._id}`
        : `/api/boards/${board._id}/tasks`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dueDate: form.dueDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      onSaved(data.task, !isEdit);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-semibold text-foreground">{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className={labelCls}>Título <span className="text-red-400">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} autoFocus placeholder="¿Qué hay que hacer?" />
          </div>

          <div>
            <label className={labelCls}>Descripción</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls + ' resize-none'} placeholder="Detalles opcionales…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Estado</label>
              <select value={form.statusId} onChange={e => setForm(f => ({ ...f, statusId: e.target.value }))} className={inputCls}>
                {board.statuses.sort((a, b) => a.order - b.order).map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prioridad</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))} className={inputCls}>
                {(Object.entries(PRIORITY_CONFIG) as [Priority, any][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Fecha límite</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !form.title.trim()} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Status Settings Modal ──────────────────────────────────────────────────────

interface StatusSettingsProps {
  board: Board;
  onClose: () => void;
  onSaved: (board: Board) => void;
}

const PRESET_COLORS = ['#94a3b8','#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4','#f97316'];

function StatusSettingsModal({ board, onClose, onSaved }: StatusSettingsProps) {
  const [statuses, setStatuses] = useState<Omit<BoardStatus, '_id'>[]>(
    [...board.statuses].sort((a, b) => a.order - b.order)
  );
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const addStatus = () => {
    if (!newName.trim()) return;
    setStatuses(prev => [...prev, { name: newName.trim(), color: newColor, order: prev.length }]);
    setNewName(''); setNewColor('#6366f1');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${board._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses: statuses.map((s, i) => ({ ...s, order: i })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved(data.board);
    } catch { /* silent */ }
    setLoading(false);
  };

  const inputCls = 'w-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-semibold text-foreground">Configurar estados</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-3">
          {statuses.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="color" value={s.color} onChange={e => setStatuses(prev => prev.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} className="w-7 h-7 rounded cursor-pointer border border-gray-200 dark:border-gray-700 bg-transparent" />
              <input type="text" value={s.name} onChange={e => setStatuses(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className={inputCls + ' flex-1'} />
              <button onClick={() => setStatuses(prev => prev.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}

          {/* Add new status */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-gray-200 dark:border-gray-700 bg-transparent" />
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStatus()} className={inputCls + ' flex-1'} placeholder="Nuevo estado…" />
            <button onClick={addStatus} disabled={!newName.trim()} className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0">
              Agregar
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ──────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  status: BoardStatus;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function TaskCard({ task, status, onEdit, onDelete, onDragStart, onDragEnd, isDragging }: TaskCardProps) {
  const pCfg = PRIORITY_CONFIG[task.priority];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.dueDate.startsWith(new Date().toISOString().slice(0, 10));
  const hasFichaData = !!(task.patientName || task.prestacion || task.obraSocial);

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task); }}
      onDragEnd={onDragEnd}
      className={`group bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-40 scale-95' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
      }`}
    >
      {/* Main content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground leading-snug flex-1">{task.title}</p>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onEdit(task)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button onClick={() => onDelete(task._id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {task.priority !== 'none' && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${pCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />
              {pCfg.label}
            </span>
          )}
          {task.dueDate && (
            <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isOverdue ? '⚠ ' : ''}
              {format(new Date(task.dueDate), "d MMM", { locale: es })}
            </span>
          )}
        </div>
      </div>

      {/* Ficha metadata footer */}
      {hasFichaData && (
        <div className="border-t border-dashed border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-zinc-800/30 px-3 py-2 flex flex-col gap-1">
          {task.patientName && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <svg className="w-3 h-3 text-muted-foreground/60 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span className="text-[11px] font-medium text-foreground truncate">{task.patientName}</span>
              </div>
              {task.patientId && (
                <Link
                  href={`/dashboard/patients/${task.patientId}`}
                  onClick={e => e.stopPropagation()}
                  className="text-[10px] text-primary hover:text-primary/80 whitespace-nowrap font-medium shrink-0 flex items-center gap-0.5"
                >
                  Ver ficha
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              )}
            </div>
          )}
          {task.prestacion && (
            <div className="flex items-center gap-1.5 min-w-0">
              <svg className="w-3 h-3 text-muted-foreground/60 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-[11px] text-muted-foreground truncate">{task.prestacion}</span>
            </div>
          )}
          {task.obraSocial && (
            <div className="flex items-center gap-1.5 min-w-0">
              <svg className="w-3 h-3 text-muted-foreground/60 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              <span className="text-[11px] text-muted-foreground truncate">{task.obraSocial}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Column View ────────────────────────────────────────────────────────────────

interface ColumnViewProps {
  board: Board;
  tasks: Task[];
  onAddTask: (statusId: string) => void;
  onEditTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  onTaskMoved: (taskId: string, newStatusId: string) => void;
}

function ColumnView({ board, tasks, onAddTask, onEditTask, onDeleteTask, onTaskMoved }: ColumnViewProps) {
  const [dragging, setDragging] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const sorted = [...board.statuses].sort((a, b) => a.order - b.order);

  const handleDrop = (statusId: string) => {
    if (dragging && dragging.statusId !== statusId) {
      onTaskMoved(dragging._id, statusId);
    }
    setDragging(null);
    setDragOverStatus(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {sorted.map(status => {
        const colTasks = tasks.filter(t => t.statusId === status._id).sort((a, b) => a.order - b.order);
        const isOver = dragOverStatus === status._id;
        return (
          <div
            key={status._id}
            className={`flex flex-col gap-2 min-w-[280px] w-[280px] rounded-xl p-3 transition-colors ${
              isOver ? 'bg-primary/5 ring-2 ring-primary/30' : 'bg-gray-50/60 dark:bg-zinc-800/30'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOverStatus(status._id); }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={() => handleDrop(status._id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-1 pb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: status.color }} />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{status.name}</span>
                <span className="text-xs text-muted-foreground bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <button onClick={() => onAddTask(status._id)} className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>

            {/* Tasks */}
            <div className="flex flex-col gap-2 flex-1 min-h-[100px]">
              {colTasks.map(task => (
                <TaskCard
                  key={task._id}
                  task={task}
                  status={status}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onDragStart={setDragging}
                  onDragEnd={() => { setDragging(null); setDragOverStatus(null); }}
                  isDragging={dragging?._id === task._id}
                />
              ))}
              {colTasks.length === 0 && !isOver && (
                <div className="flex-1 flex items-center justify-center py-6">
                  <p className="text-xs text-muted-foreground/50">Sin tareas</p>
                </div>
              )}
              {isOver && (
                <div className="rounded-xl border-2 border-dashed border-primary/30 h-16 flex items-center justify-center">
                  <p className="text-xs text-primary/60">Soltar aquí</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── List View ──────────────────────────────────────────────────────────────────

interface ListViewProps {
  board: Board;
  tasks: Task[];
  onAddTask: (statusId?: string) => void;
  onEditTask: (t: Task) => void;
  onDeleteTask: (id: string) => void;
  onStatusChange: (taskId: string, statusId: string) => void;
}

function ListView({ board, tasks, onAddTask, onEditTask, onDeleteTask, onStatusChange }: ListViewProps) {
  const sorted = [...board.statuses].sort((a, b) => a.order - b.order);
  const statusMap = Object.fromEntries(board.statuses.map(s => [s._id, s]));

  return (
    <div className="flex flex-col gap-6">
      {sorted.map(status => {
        const colTasks = tasks.filter(t => t.statusId === status._id).sort((a, b) => a.order - b.order);
        return (
          <div key={status._id}>
            {/* Status group header */}
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: status.color }} />
              <span className="text-sm font-semibold text-foreground">{status.name}</span>
              <span className="text-xs text-muted-foreground">{colTasks.length}</span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              <button onClick={() => onAddTask(status._id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Agregar
              </button>
            </div>

            {/* Task rows */}
            <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              {colTasks.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground/50 text-center bg-white dark:bg-zinc-900">Sin tareas en este estado</div>
              ) : colTasks.map(task => {
                const pCfg = PRIORITY_CONFIG[task.priority];
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <div key={task._id} className="group flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition-colors">
                    {/* Status dot */}
                    <button
                      title="Cambiar estado"
                      className="flex-shrink-0 w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ borderColor: status.color, background: `${status.color}22` }}
                    />

                    {/* Title + ficha metadata */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                      {(task.patientName || task.prestacion || task.obraSocial) && (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {task.patientName && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                              {task.patientId
                                ? <Link href={`/dashboard/patients/${task.patientId}`} onClick={e => e.stopPropagation()} className="hover:text-primary hover:underline">{task.patientName}</Link>
                                : task.patientName
                              }
                            </span>
                          )}
                          {task.prestacion && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                              {task.prestacion}
                            </span>
                          )}
                          {task.obraSocial && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                              {task.obraSocial}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status selector */}
                    <select
                      value={task.statusId}
                      onChange={e => onStatusChange(task._id, e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shrink-0"
                    >
                      {sorted.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>

                    {/* Priority */}
                    {task.priority !== 'none' && (
                      <span className={`text-[10px] font-medium shrink-0 ${pCfg.color}`}>{pCfg.label}</span>
                    )}

                    {/* Due date */}
                    {task.dueDate && (
                      <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                        {format(new Date(task.dueDate), "d MMM", { locale: es })}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEditTask(task)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => onDeleteTask(task._id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  boardId: string;
}

export default function BoardDetailClient({ boardId }: Props) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'column' | 'list'>('column');
  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task | null; defaultStatusId?: string }>({ open: false });
  const [statusModal, setStatusModal] = useState(false);

  const fetchBoard = useCallback(async () => {
    const [br, tr] = await Promise.all([
      fetch(`/api/boards/${boardId}`),
      fetch(`/api/boards/${boardId}/tasks`),
    ]);
    if (br.ok) { const d = await br.json(); setBoard(d.board); }
    if (tr.ok) { const d = await tr.json(); setTasks(d.tasks); }
    setLoading(false);
  }, [boardId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const handleTaskSaved = (task: Task, isNew: boolean) => {
    setTasks(prev => isNew ? [...prev, task] : prev.map(t => t._id === task._id ? task : t));
    setTaskModal({ open: false });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    const res = await fetch(`/api/boards/${boardId}/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) setTasks(prev => prev.filter(t => t._id !== id));
  };

  const handleStatusChange = async (taskId: string, statusId: string) => {
    const res = await fetch(`/api/boards/${boardId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusId }),
    });
    if (res.ok) {
      const { task } = await res.json();
      setTasks(prev => prev.map(t => t._id === taskId ? task : t));
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Cargando tablero…</div>;
  if (!board) return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Tablero no encontrado</div>;

  const tabCls = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
      active ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800'
    }`;

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">{board.name}</h1>
          {board.description && <p className="text-sm text-muted-foreground mt-0.5">{board.description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button className={tabCls(view === 'column')} onClick={() => setView('column')}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="18" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>
              Columnas
            </button>
            <button className={tabCls(view === 'list')} onClick={() => setView('list')}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Lista
            </button>
          </div>

          {/* Configure statuses */}
          <button onClick={() => setStatusModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground border border-gray-200 dark:border-gray-700 rounded-xl hover:text-foreground hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
            Estados
          </button>

          {/* New task */}
          <button onClick={() => setTaskModal({ open: true })} className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        {board.statuses.sort((a, b) => a.order - b.order).map(s => {
          const count = tasks.filter(t => t.statusId === s._id).length;
          return (
            <div key={s._id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span>{s.name}</span>
              <span className="font-semibold text-foreground">{count}</span>
            </div>
          );
        })}
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en total</span>
      </div>

      {/* Board content */}
      <div className="flex-1 overflow-auto">
        {view === 'column' ? (
          <ColumnView
            board={board}
            tasks={tasks}
            onAddTask={statusId => setTaskModal({ open: true, defaultStatusId: statusId })}
            onEditTask={task => setTaskModal({ open: true, task })}
            onDeleteTask={handleDelete}
            onTaskMoved={handleStatusChange}
          />
        ) : (
          <ListView
            board={board}
            tasks={tasks}
            onAddTask={statusId => setTaskModal({ open: true, defaultStatusId: statusId })}
            onEditTask={task => setTaskModal({ open: true, task })}
            onDeleteTask={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Modals */}
      {taskModal.open && (
        <TaskFormModal
          board={board}
          task={taskModal.task}
          defaultStatusId={taskModal.defaultStatusId}
          onClose={() => setTaskModal({ open: false })}
          onSaved={handleTaskSaved}
        />
      )}

      {statusModal && (
        <StatusSettingsModal
          board={board}
          onClose={() => setStatusModal(false)}
          onSaved={updatedBoard => { setBoard(updatedBoard); setStatusModal(false); }}
        />
      )}
    </div>
  );
}
