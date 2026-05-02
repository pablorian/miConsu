import { NextRequest, NextResponse } from 'next/server';
import { PrestacionTemplate } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const items = await (PrestacionTemplate as any)
      .find({ userId: user._id })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ items });
  } catch (e) {
    console.error('[GET /api/prestaciones]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { name, price, description } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const item = await (PrestacionTemplate as any).create({
      userId: user._id,
      name: name.trim(),
      price: Number(price) || 0,
      description: description?.trim() || '',
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/prestaciones]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
