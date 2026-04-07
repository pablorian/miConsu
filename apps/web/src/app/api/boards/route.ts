import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, TaskBoard } from '@repo/database';

const DEFAULT_STATUSES = [
  { name: 'Pendiente',   color: '#94a3b8', order: 0 },
  { name: 'En proceso',  color: '#6366f1', order: 1 },
  { name: 'Completado',  color: '#22c55e', order: 2 },
];

const FICHAS_STATUSES = [
  { name: 'Sin presentar', color: '#94a3b8', order: 0 },
  { name: 'Presentada',    color: '#6366f1', order: 1 },
  { name: 'Cobrada',       color: '#22c55e', order: 2 },
  { name: 'Rechazada',     color: '#ef4444', order: 3 },
];

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value) as any;
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: session.id }).lean() as any;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Auto-create default board on first call
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
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
