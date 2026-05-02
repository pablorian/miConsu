import { NextRequest, NextResponse } from 'next/server';
import { Payment } from '@repo/database';
import { requireUser } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string; paymentId: string }>;
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { paymentId } = await params;

    const payment = await Payment.findOneAndDelete({ _id: paymentId, userId: user._id });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
