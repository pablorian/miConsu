import { NextRequest, NextResponse } from 'next/server';
import { TaskBoard } from '@repo/database';
import { requireUser } from '@/lib/auth';

const DEFAULT_STATUSES = [
  { name: 'Pendiente',  color: '#94a3b8', order: 0 },
  { name: 'En proceso', color: '#6366f1', order: 1 },
  { name: 'Completado', color: '#22c55e', order: 2 },
];

const FICHAS_STATUSES = [
  { name: 'Sin presentar', color: '#94a3b8', order: 0 },
  { name: 'Presentada',    color: '#6366f1', order: 1 },
  { name: 'Cobrada',       color: '#22c55e', order: 2 },
  { name: 'Rechazada',     color: '#ef4444', order: 3 },
];

export async function GET() {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const count = await TaskBoard.countDocuments({ userId: user._id });
    if (count === 0) {
      await TaskBoard.create({
        userId: user._id,
        name: 'Fichas obra sociales',
        description: 'Seguimiento de presentación de fichas a obras sociales',
        statuses: FICHAS_STATUSES,
        isDefault: true,
      });
    }

    const boards = await TaskBoard.find({ userId: user._id }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ boards });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { name, description } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });

    const board = await TaskBoard.create({
      userId: user._id,
      name: name.trim(),
      description: description?.trim(),
      statuses: DEFAULT_STATUSES,
    });
    return NextResponse.json({ board }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
