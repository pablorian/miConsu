import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User, Patient, TreatmentPlan } from '@repo/database';

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

    const plans = await TreatmentPlan.find({ patientId: id, userId: user._id }).sort({ createdAt: -1 });

    return NextResponse.json({ plans });
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
