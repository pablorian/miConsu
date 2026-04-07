import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase, { User, GenericTransaction } from '@repo/database';

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { type, date, amount, concept, category, paymentMethod, notes } = body;

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
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
