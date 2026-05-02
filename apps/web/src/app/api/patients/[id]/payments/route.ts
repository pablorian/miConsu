import { NextRequest, NextResponse } from 'next/server';
import { Patient, Payment } from '@repo/database';
import { requireUser } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;

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
    const { user, error } = await requireUser();
    if (error) return error;
    const { id } = await params;
    const body = await req.json();

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
