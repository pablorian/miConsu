import { NextRequest, NextResponse } from 'next/server';
import { TaskBoard, Task } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
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
    const { user, error } = await requireUser();
    if (error) return error;
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
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;
    const board = await TaskBoard.findOneAndDelete({ _id: id, userId: user._id });
    if (!board) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await Task.deleteMany({ boardId: id, userId: user._id });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
