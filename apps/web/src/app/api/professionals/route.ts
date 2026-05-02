import { NextRequest, NextResponse } from 'next/server';
import { Professional } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const professionals = await Professional.find({ userId: user._id }).sort({ name: 1 }).lean();
    return NextResponse.json({ professionals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { name, email, color, percentage, obraSocialPercentages, consultorioId } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const professional = await Professional.create({
      name: name.trim(),
      email: email?.trim() || undefined,
      color: color || '#6366f1',
      percentage: Number(percentage) || 0,
      obraSocialPercentages: Array.isArray(obraSocialPercentages) ? obraSocialPercentages : [],
      consultorioId: consultorioId || null,
      userId: user._id,
    });

    return NextResponse.json({ professional }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
