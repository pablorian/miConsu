import { NextRequest, NextResponse } from 'next/server';
import { Patient, TreatmentPlan } from '@repo/database';
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

    const plans = await TreatmentPlan.find({ patientId: id, userId: user._id }).sort({ createdAt: -1 });
    return NextResponse.json({ plans });
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

    const plan = new TreatmentPlan({
      patientId: id,
      userId: user._id,
      name: body.name,
      professional: body.professional,
      status: body.status || 'En Progreso',
      notes: body.notes,
    });

    await plan.save();
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
