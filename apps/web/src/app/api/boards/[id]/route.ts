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
    const { id } = await params;
    const board = await TaskBoard.findOne({ _id: id, userId: user._id }).lean();
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ board });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const { name, description, statuses } = await req.json();

    const board = await TaskBoard.findOneAndUpdate(
      { _id: id, userId: user._id },
      { ...(name && { name: name.trim() }), ...(description !== undefined && { description }), ...(statuses && { statuses }) },
      { new: true }
    );
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ board });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const board = await TaskBoard.findOneAndDelete({ _id: id, userId: user._id });
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await Task.deleteMany({ boardId: id, userId: user._id });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
