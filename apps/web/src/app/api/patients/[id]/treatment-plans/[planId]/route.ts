import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User, TreatmentPlan } from '@repo/database';

interface Params {
  params: Promise<{ id: string; planId: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySession(token.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { planId } = await params;
    const body = await req.json();
    await connectToDatabase();

    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifySession(token.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { planId } = await params;
    await connectToDatabase();

    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const plan = await TreatmentPlan.findOneAndDelete({ _id: planId, userId: user._id });
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
