import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User, Patient, Payment } from '@repo/database';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySession(token.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectToDatabase();

    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const patient = await Patient.findOne({ _id: id, userId: user._id });
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    const payments = await Payment.find({ patientId: id, userId: user._id }).sort({ date: -1 });

    return NextResponse.json({ payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySession(token.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    await connectToDatabase();

    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const patient = await Patient.findOne({ _id: id, userId: user._id });
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
    }

    const payment = new Payment({
      patientId: id,
      userId: user._id,
      date: body.date ? new Date(body.date) : new Date(),
      amount: body.amount,
      concept: body.concept || '',
      paymentMethod: body.paymentMethod || 'efectivo',
      currency: body.currency || 'ARS',
    });

    await payment.save();
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
