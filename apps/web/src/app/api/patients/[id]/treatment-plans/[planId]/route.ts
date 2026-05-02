import { NextRequest, NextResponse } from 'next/server';
import { TreatmentPlan } from '@repo/database';
import { requireUser } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string; planId: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { planId } = await params;
    const body = await req.json();

    const plan = await TreatmentPlan.findOneAndUpdate(
      { _id: planId, userId: user._id },
      { $set: { name: body.name, professional: body.professional, status: body.status, notes: body.notes } },
      { new: true }
    );

    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { planId } = await params;

    const plan = await TreatmentPlan.findOneAndDelete({ _id: planId, userId: user._id });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
