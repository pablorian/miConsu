import { NextRequest, NextResponse } from 'next/server';
import { PrestacionTemplate } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    await (PrestacionTemplate as any).deleteOne({ _id: id, userId: user._id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/prestaciones/[id]]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
