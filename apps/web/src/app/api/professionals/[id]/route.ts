import { NextRequest, NextResponse } from 'next/server';
import { Professional } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    const { name, email, color, percentage, obraSocialPercentages, consultorioId } = await request.json();

    const professional = await Professional.findOneAndUpdate(
      { _id: id, userId: user._id },
      {
        name: name?.trim(),
        email: email?.trim() || undefined,
        color,
        percentage: Number(percentage) || 0,
        obraSocialPercentages: Array.isArray(obraSocialPercentages) ? obraSocialPercentages : [],
        consultorioId: consultorioId || null,
      },
      { new: true }
    );

    if (!professional) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ professional });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    const professional = await Professional.findOneAndDelete({ _id: id, userId: user._id });
    if (!professional) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
