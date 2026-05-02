import { NextRequest, NextResponse } from 'next/server';
import { GenericTransaction } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    const { type, date, amount, concept, category, paymentMethod, notes } = await request.json();

    const transaction = await (GenericTransaction as any).findOneAndUpdate(
      { _id: id, userId: user._id },
      {
        type,
        date: date ? new Date(date) : undefined,
        amount: Number(amount),
        concept: concept?.trim(),
        category: category?.trim() || undefined,
        paymentMethod: paymentMethod?.trim() || undefined,
        notes: notes?.trim() || undefined,
      },
      { new: true },
    );

    if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ transaction });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id } = await params;
    const transaction = await (GenericTransaction as any).findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
