import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, Task } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value) as any;
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: session.id }).lean() as any;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { taskId } = await params;
    const body = await req.json();

    const update: Record<string, any> = {};
    if (body.title !== undefined)       update.title       = body.title.trim();
    if (body.description !== undefined) update.description = body.description?.trim();
    if (body.statusId !== undefined)    update.statusId    = body.statusId;
    if (body.priority !== undefined)    update.priority    = body.priority;
    if (body.dueDate !== undefined)     update.dueDate     = body.dueDate ? new Date(body.dueDate) : null;
    if (body.order !== undefined)       update.order       = body.order;
    if (body.obraSocial !== undefined)  update.obraSocial  = body.obraSocial?.trim() || null;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId: user._id },
      update,
      { new: true }
    );
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { taskId } = await params;
    const task = await Task.findOneAndDelete({ _id: taskId, userId: user._id });
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
