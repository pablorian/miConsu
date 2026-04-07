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

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    const query: any = { userId: user._id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }

    const transactions = await (GenericTransaction as any)
      .find(query)
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ transactions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, date, amount, concept, category, paymentMethod, notes } = body;

    if (!type || !['ingreso', 'egreso'].includes(type))
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    if (!concept?.trim())
      return NextResponse.json({ error: 'El concepto es obligatorio' }, { status: 400 });
    if (!amount || amount <= 0)
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });

    const transaction = await (GenericTransaction as any).create({
      userId: user._id,
      type,
      date: date ? new Date(date) : new Date(),
      amount: Number(amount),
      concept: concept.trim(),
      category: category?.trim() || undefined,
      paymentMethod: paymentMethod?.trim() || undefined,
      notes: notes?.trim() || undefined,
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
