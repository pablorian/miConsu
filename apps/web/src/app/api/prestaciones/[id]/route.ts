import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, PrestacionTemplate } from '@repo/database';

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  const session = await verifySession(token.value);
  if (!session) return null;
  await connectToDatabase();
  return User.findOne({ workosId: (session as any).id });
}

/** PUT /api/prestaciones/[id] */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { name, price, description } = await req.json();

    const item = await (PrestacionTemplate as any).findOneAndUpdate(
      { _id: id, userId: user._id },
      {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(price !== undefined && { price: Number(price) || 0 }),
        ...(description !== undefined && { description: String(description).trim() }),
      },
      { new: true }
    );

    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('[PUT /api/prestaciones/[id]]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** DELETE /api/prestaciones/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await (PrestacionTemplate as any).deleteOne({ _id: id, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/prestaciones/[id]]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
