import { NextRequest, NextResponse } from 'next/server';
import { Professional, ProfessionalLiquidation } from '@repo/database';
import { requireUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id: professionalId } = await params;
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const prof = await Professional.findOne({ _id: professionalId, userId: user._id }).lean();
    if (!prof) return NextResponse.json({ error: 'Professional not found' }, { status: 404 });

    const query: any = { professionalId, userId: user._id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }

    const liquidations = await (ProfessionalLiquidation as any).find(query).sort({ date: -1 }).lean();
    return NextResponse.json({ liquidations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const { id: professionalId } = await params;

    const prof = await Professional.findOne({ _id: professionalId, userId: user._id }).lean();
    if (!prof) return NextResponse.json({ error: 'Professional not found' }, { status: 404 });

    const { amount, date, periodFrom, periodTo, notes } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });
    }

    const liquidation = await (ProfessionalLiquidation as any).create({
      professionalId,
      userId: user._id,
      amount,
      date: date ? new Date(date) : new Date(),
      periodFrom: periodFrom ? new Date(periodFrom) : undefined,
      periodTo: periodTo ? new Date(periodTo) : undefined,
      notes,
    });

    return NextResponse.json({ liquidation }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
