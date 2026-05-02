'use client';

import { useState, useEffect } from 'react';
import BoardDetailClient from '@/components/Tasks/BoardDetailClient';

export default function FichasPage() {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/boards')
      .then(r => r.json())
      .then(d => {
        const boards: any[] = d.boards || [];
        const def = boards.find((b: any) => b.isDefault) || boards[0];
        setBoardId(def?._id || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Cargando…</div>;
  if (!boardId) return <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">No se encontró el tablero de fichas</div>;

  return <BoardDetailClient boardId={boardId} />;
}
