import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/workos';
import connectToDatabase from '@repo/database';
import { User, Patient, DentalRecord } from '@repo/database';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    const { id: patientId } = await params;
    console.log('[API] GET records for patientId:', patientId);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(token.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    // Validate user owns patient
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      console.log('[API] User not found for session');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const patient = await Patient.findOne({ _id: patientId, userId: user._id });
    if (!patient) {
      console.log('[API] Patient not found or not owned by user. patientId:', patientId, 'userId:', user._id);
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const records = await DentalRecord.find({ patientId }).sort({ date: -1 });
    console.log('[API] Found records:', records.length);

    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    const { id: patientId } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(token.value);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('[API] POST record for patientId:', patientId);

    await connectToDatabase();
    const user = await User.findOne({ workosId: (session as any).id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const patient = await Patient.findOne({ _id: patientId, userId: user._id });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    console.log('[API] Creating record with body keys:', Object.keys(body));
    const record = await DentalRecord.create({
      patientId,
      ...body
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Error creating record:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
