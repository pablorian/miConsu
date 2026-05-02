import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, TaskBoard, Task } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value) as any;
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: session.id }).lean() as any;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: boardId } = await params;
    const tasks = await Task.find({ boardId, userId: user._id }).sort({ order: 1, createdAt: 1 }).lean();
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: boardId } = await params;

    // Verify board ownership
    const board = await TaskBoard.findOne({ _id: boardId, userId: user._id }).lean();
    if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

    const { title, description, statusId, priority, dueDate, obraSocial } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });
    if (!statusId) return NextResponse.json({ error: 'El estado es obligatorio' }, { status: 400 });

    // Compute next order within the status
    const last = await Task.findOne({ boardId, statusId, userId: user._id }).sort({ order: -1 }).lean() as any;
    const order = last ? (last.order + 1) : 0;

    const task = await Task.create({
      userId: user._id,
      boardId,
      title: title.trim(),
      description: description?.trim(),
      statusId,
      priority: priority || 'none',
      dueDate: dueDate ? new Date(dueDate) : null,
      obraSocial: obraSocial?.trim() || undefined,
      order,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
